// @flow
//
//  Copyright (c) 2020-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.
import child_process from "child_process";
import fs from "fs";
import { last, sumBy } from "lodash";
import type { Page } from "puppeteer";
import rmfr from "rmfr";
import util from "util";
import uuid from "uuid";

import type { VideoMetadata, RecordingProgressEvent } from "../src/players/automatedRun/AutomatedRunPlayer";
import type { VideoRecordingAction } from "../src/players/automatedRun/videoRecordingClient";
import convertVideoToGif from "./convertVideoToGif";
import delay from "./delay";
import { withTempDirectory } from "./fileUtils";
import globalEnvVars from "./globalEnvVars";
import promiseTimeout from "./promiseTimeout";
import runInBrowser from "./runInBrowser";
import ServerLogger from "./ServerLogger";
import { formatSeconds } from "webviz-core/src/util/time";

// Enables verbose output to help debug request interception issues
const DEBUG_REQUEST_INTERCEPTION = false;

const exec = util.promisify(child_process.exec);
const mkdir = util.promisify(fs.mkdir);
const readFile = util.promisify(fs.readFile);
const log = new ServerLogger(__filename);

const baseUrlObject = new URL("http://localhost:3000/");
const perFrameTimeoutMs = 1 * 60000; // 1 minute
const waitForBrowserLoadTimeoutMs = 3 * 60000; // 3 minutes
const actionTimeDurationMs = 1000;
const pendingRequestPauseDurationMs = 1000; // Amount of time to wait for any pending XHR requests to settle

// To ensure all assets have loaded before capturing a screenshot,
// we wait an extra bit of time for the first N frames.
const INITIAL_FRAME_DELAY_COUNT = 2; // Number of frames to add the extra delay

// Max amount of time to wait per frame. Frame #0 wait the full amount of time.
// Subsequent frames will wait less time, decreasing linearly to 0 as the current
// frame count approaches INITIAL_FRAME_DELAY_COUNT.
const INITIAL_FRAME_DELAY_DURATION_MS = 15000;

type VideoConfig = {
  bagPath?: ?string,
  url: string,
  puppeteerLaunchConfig?: any,
  layout?: string, // A named layout to look up
  panelLayout?: string, // A JSON string of the layout
  parallel?: number,
  speed?: number,
  framerate?: number,
  frameless?: boolean,
  duration?: number,
  experimentalFeaturesSettings?: string,
  dimensions?: { width: number, height: number },
  mediaType?: "mp4" | "gif",
  crop?: { width: number, height: number, top: number, left: number },
  errorIsWhitelisted?: (string) => boolean,
};

export type RecordingOptions = {| outputDirectory: string, onProgress?: (ev: RecordingProgressEvent) => void |};

// Delegates to recordVideo, but returns the resulting video as a Buffer.
// *PERFORMANCE NOTE* This should only be used for short videos since it reads
// the entire video into memory. For long videos, use recordVideo directly
// without reading the video into a Buffer.
export async function recordVideoAsBuffer(
  config: VideoConfig,
  options?: RecordingOptions
): Promise<{ mediaBuffer: Buffer, sampledImageFile: Buffer, metadata: VideoMetadata }> {
  return withTempDirectory(async (tmpDir) => {
    const { mediaPath, sampledImageFile, metadata } = await recordVideo(config, {
      ...options,
      outputDirectory: tmpDir,
    });

    const mediaBuffer = await readFile(mediaPath);
    await rmfr(mediaPath);

    return { mediaBuffer, sampledImageFile, metadata };
  });
}

// Records a video with the specified configuration.
// Writes the resulting media file (mp4/gif) into the specified directory.
export async function recordVideo(
  config: VideoConfig,
  options: RecordingOptions
): Promise<{ mediaPath: string, sampledImageFile: Buffer, metadata: VideoMetadata }> {
  const {
    speed = 1,
    framerate = 30,
    frameless = false,
    dimensions = { width: 1920, height: 1080 },
    crop,
    parallel = 2,
    duration,
    bagPath,
    url,
    puppeteerLaunchConfig,
    layout,
    panelLayout,
    mediaType,
    errorIsWhitelisted,
    experimentalFeaturesSettings,
  } = config;
  const screenshotsDir = `${globalEnvVars.tempVideosDirectory}/__video-recording-tmp-${uuid.v4()}__`;
  await mkdir(screenshotsDir);

  const { onProgress } = options;

  // This is used primarily to ensure the map tile requests resolve before taking screenshots
  const pendingRequestUrls = new Set();
  const startEpoch = Date.now();

  let hasFailed = false;
  try {
    let metadata: ?VideoMetadata;
    const percentCompleteByParallelIndex = new Array(parallel).fill(0);
    const promises = new Array(parallel).fill().map(async (_, parallelIndex) => {
      const urlObject = url ? new URL(url) : baseUrlObject;
      // Update the base url to point to localhost if it's set to something else.
      // We don't *always* set the host in order to allow urls using other local ports.
      if (urlObject.hostname !== "localhost") {
        Object.assign(urlObject, { host: baseUrlObject.host, protocol: baseUrlObject.protocol });
      }
      urlObject.searchParams.set("video-recording-mode", "1");
      urlObject.searchParams.set("video-recording-speed", `${speed}`);
      urlObject.searchParams.set("video-recording-framerate", `${framerate}`);
      urlObject.searchParams.set("video-recording-worker", `${parallelIndex}/${parallel}`);
      if (layout) {
        urlObject.searchParams.set("layout", layout);
      }
      if (frameless) {
        urlObject.searchParams.set("frameless", "1");
      }
      if (duration) {
        urlObject.searchParams.set("duration", `${duration}`);
      }

      return runInBrowser({
        filePaths: bagPath ? [bagPath] : undefined,
        url: urlObject.toString(),
        experimentalFeaturesSettings,
        puppeteerLaunchConfig,
        panelLayout,
        captureLogs: true,
        dimensions: dimensions || { width: 1920, height: 1080 },
        loadBrowserTimeout: waitForBrowserLoadTimeoutMs,
        beforeLoad: async ({ page }) => {
          const target = await page.target();
          const client = await target.createCDPSession();
          await client.send("Fetch.enable", {
            patterns: [{ urlPattern: "*", requestStage: "Request" }, { urlPattern: "*", requestStage: "Response" }],
          });
          await client.on("Fetch.requestPaused", async ({ requestId, request, responseStatusCode }) => {
            const parallelUrl = `${request.url}#${parallelIndex}`;
            if (!responseStatusCode) {
              pendingRequestUrls.add(parallelUrl);
            } else {
              pendingRequestUrls.delete(parallelUrl);
            }
            if (DEBUG_REQUEST_INTERCEPTION) {
              log.info(`[Fetch DEBUG] ${!responseStatusCode ? "adding" : "removing"}: ${parallelUrl}`);
            }
            try {
              await client.send("Fetch.continueRequest", { requestId });
            } catch {}
          });
        },
        onLoad: async ({ page, errors }: { page: Page, errors: Array<string> }) => {
          // From this point forward, the client controls the flow. We just call
          // `window.videoRecording.can stream from before Airavata()` which returns `false` (no action for us to take),
          // or some action for us to take (throw an error, finish up the video, etc).
          let i = 0;
          let isRunning = true;

          while (isRunning) {
            if (hasFailed) {
              throw new Error("Parallel video recording failed: one of the browsers has crashed.");
            }

            await promiseTimeout(
              (async () => {
                let actionHandle, errorCheckInterval, nextError;
                try {
                  // `waitForFunction` waits until the return value is truthy,
                  // so we won't continue until the client is ready with a new action.
                  page
                    .waitForFunction(() => window.videoRecording.nextAction(), {
                      timeout: perFrameTimeoutMs - actionTimeDurationMs,
                    })
                    .then((nextAction) => (actionHandle = nextAction));

                  // The errors array is populated asynchronously, so check it on a timer while we wait
                  // for the nextAction so we don't miss any async errors (or page crashes) in the meantime
                  errorCheckInterval = setInterval(() => {
                    for (const error of errors) {
                      if (errorIsWhitelisted && errorIsWhitelisted(error)) {
                        log.info(`Encountered whitelisted error: ${error}`);
                        return;
                      }
                      // We don't throw this error here because it ends up as an
                      // unhandled rejection error – so save it and throw it outside.
                      nextError = error;
                    }
                  }, 1000);

                  // eslint-disable-next-line no-unmodified-loop-condition
                  while (!actionHandle && !nextError) {
                    await delay(250);
                  }
                  if (nextError) {
                    throw nextError;
                  }
                } catch (error) {
                  throw new Error(error);
                } finally {
                  clearInterval(errorCheckInterval);
                }

                const actionObj: ?VideoRecordingAction = actionHandle && (await actionHandle.jsonValue());
                if (!actionObj) {
                  return;
                }
                if (actionObj.action === "error") {
                  if (errorIsWhitelisted && actionObj.error && errorIsWhitelisted(actionObj.error)) {
                    log.info(`Encountered whitelisted error: ${actionObj.error}`);
                  } else {
                    log.info(`Encountered error: ${actionObj.error || "Unknown error"}`);
                    throw new Error(actionObj.error || "Unknown error");
                  }
                } else if (actionObj.action === "finish") {
                  log.info("Finished!");
                  isRunning = false;
                  metadata = actionObj.metadata;
                } else if (actionObj.action === "screenshot") {
                  if (i < INITIAL_FRAME_DELAY_COUNT) {
                    const delayMs =
                      INITIAL_FRAME_DELAY_DURATION_MS -
                      i * (INITIAL_FRAME_DELAY_DURATION_MS / INITIAL_FRAME_DELAY_COUNT);
                    log.info(`Waiting for ${delayMs}ms to ensure all assets have loaded...`);
                    await delay(delayMs);
                  }
                  await waitForXhrRequests(pendingRequestUrls);

                  // Take a screenshot, and then tell the client that we're done taking a screenshot,
                  // so it can continue executing.
                  const screenshotStartEpoch = Date.now();
                  const screenshotIndex = i * parallel + parallelIndex;

                  await page.screenshot({
                    path: `${screenshotsDir}/${screenshotIndex}.jpg`,
                    captureBeyondViewport: false,
                    quality: 85,
                  });
                  await page.evaluate(() => window.videoRecording.hasTakenScreenshot());

                  if (actionObj.progressEvent) {
                    const { percentComplete, frameRenderDurationMs = 0 } = actionObj.progressEvent;
                    percentCompleteByParallelIndex[parallelIndex] = percentComplete;

                    const totalPercentComplete = sumBy(percentCompleteByParallelIndex) / parallel;
                    const msPerPercent = (Date.now() - startEpoch) / totalPercentComplete;
                    const estimatedSecondsRemaining = Math.round(((1 - totalPercentComplete) * msPerPercent) / 1000);

                    const etaEpochDate = new Date();
                    etaEpochDate.setSeconds(etaEpochDate.getSeconds() + estimatedSecondsRemaining);
                    if (onProgress) {
                      onProgress({ etaEpochMs: etaEpochDate.getTime(), percentComplete: totalPercentComplete });
                    }
                    log.info(
                      [
                        `Recording ${(totalPercentComplete * 100).toFixed(1)}% done.`,
                        `ETA: ${formatSeconds(Math.min(estimatedSecondsRemaining || 0, 24 * 60 * 60 /* 24 hours */))}.`,
                        `[${parallelIndex}/${parallel} #${screenshotIndex}]`,
                        `frameMs: ${frameRenderDurationMs ?? 0},`,
                        `screenshotMs: ${Date.now() - screenshotStartEpoch}ms`,
                      ].join(" ")
                    );
                  }

                  i++;
                } else {
                  throw new Error(`Unknown action: '${actionObj.action}'`);
                }
              })(),
              perFrameTimeoutMs,
              "Taking a screenshot"
            );
          }
        },
      });
    });

    await Promise.all(promises);

    if (metadata == null) {
      throw new Error("metadata was not set. The recording must have failed.");
    }
    const screenshotFileNames = fs.readdirSync(screenshotsDir);
    if (screenshotFileNames.length === 0) {
      log.error(
        `No screenshots found! Could not create video – the source was likely too short. Try adjusting the URL's start, seek-to, or duration and try again.`
      );
      throw new Error("No screenshots found");
    }

    const sampledImageFile = await readFile(`${screenshotsDir}/${last(screenshotFileNames)}`);
    const outputDirectory = options.outputDirectory;

    // Once we're finished, we're going to stitch all the individual screenshots together
    // into a video, with the framerate specified by the client (via `msPerFrame`).
    let mediaPath = `${outputDirectory}/out.mp4`;
    log.info(`Creating video with framerate ${framerate}fps (${metadata.msPerFrame}ms per frame)`);
    await exec(
      [
        `ffmpeg -y`,
        `-framerate ${framerate}`,
        `-i %d.jpg`,
        `-vf pad="width=ceil(iw/2)*2:height=ceil(ih/2)*2"`, // Ensure the width and height are divisible by 2
        crop ? `-vf "crop=${crop.width}:${crop.height}:${crop.left}:${crop.top}"` : "",
        `-c:v libx264`,
        `-preset faster`,
        `-r ${framerate}`,
        mediaPath,
      ].join(" "),
      { cwd: screenshotsDir }
    );
    log.info(`Video saved to ${mediaPath}`);

    // Convert the output to other mediaTypes, if requested
    if (mediaType === "gif") {
      const gifPath = `${outputDirectory}/out.gif`;
      await convertVideoToGif(mediaPath, gifPath);
      mediaPath = gifPath;
    }

    return { mediaPath, sampledImageFile, metadata };
  } catch (error) {
    hasFailed = true;
    throw error;
  } finally {
    log.info(`Removing ${screenshotsDir}`);
    await rmfr(screenshotsDir);
  }
}

// Exported for tests
export async function waitForXhrRequests(pendingRequestUrls: Set<string>) {
  let timeout = false;
  const hasPendingRequests = () => pendingRequestUrls.size > 0 && !timeout;
  const waitForPendingRequests = async () => {
    const hadPendingRequests = hasPendingRequests();
    while (hasPendingRequests()) {
      log.info(
        `Waiting for ${pendingRequestUrls.size} request(s) to resolve...${
          DEBUG_REQUEST_INTERCEPTION ? `pendingRequestUrls:\n ${[...pendingRequestUrls].join("\n")}` : ""
        }`
      );
      await delay(pendingRequestPauseDurationMs);
    }
    return hadPendingRequests;
  };

  try {
    await promiseTimeout(
      new Promise(async (resolve) => {
        if (await waitForPendingRequests()) {
          // All requests resolved, but wait a little bit longer to make sure.
          // This helps us catch cases where there's a brief pause between batches of requests
          await delay(pendingRequestPauseDurationMs);
        }
        resolve();
      }),
      30000,
      `Waiting for XHR Requests: ${JSON.stringify([...pendingRequestUrls])}`
    );
  } catch (error) {
    // Clear the pending urls or else they'll continue to timeout forever
    pendingRequestUrls.clear();
    log.warn(error);
  } finally {
    timeout = true;
  }
}
