// @flow
//
//  Copyright (c) 2020-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.
import child_process from "child_process";
import fs from "fs";
import type { Page } from "puppeteer";
import rmfr from "rmfr";
import util from "util";
import uuid from "uuid";

import globalEnvVars from "./globalEnvVars";
import promiseTimeout from "./promiseTimeout";
import runInBrowser from "./runInBrowser";
import ServerLogger from "./ServerLogger";
// ESLint is unhappy about this order in the open source repo but not in the internal one..
// eslint-disable-next-line import-order-alphabetical/order
import type { VideoRecordingAction } from "../src/players/automatedRun/videoRecordingClient";

const exec = util.promisify(child_process.exec);
const mkdir = util.promisify(fs.mkdir);
const readFile = util.promisify(fs.readFile);
const log = new ServerLogger(__filename);

const perFrameTimeoutMs = 3 * 60000; // 3 minutes
const waitForBrowserLoadTimeoutMs = 3 * 60000; // 3 minutes
const actionTimeDurationMs = 1000;

async function recordVideo({
  parallel,
  bagPath,
  url,
  puppeteerLaunchConfig,
  panelLayout,
  errorIsWhitelisted,
  experimentalFeatureSettings,
}: {
  bagPath?: string,
  url: string,
  puppeteerLaunchConfig?: any,
  panelLayout?: any,
  parallel?: number,
  experimentalFeatureSettings?: string,
  errorIsWhitelisted?: (string) => boolean,
}): Promise<{ videoFile: Buffer, sampledImageFile: Buffer }> {
  if (!url.includes("video-recording-mode")) {
    throw new Error("`url` must contain video-recording-mode for `recordVideo` to work.");
  }

  const screenshotsDir = `${globalEnvVars.tempVideosDirectory}/__video-recording-tmp-${uuid.v4()}__`;
  await mkdir(screenshotsDir);

  let hasFailed = false;
  try {
    let msPerFrame;
    const parallelTotal = parallel || 2;
    const promises = new Array(parallelTotal).fill().map(async (_, parallelIndex) => {
      const workerUrl = `${url}&video-recording-worker=${parallelIndex}/${parallelTotal}`;
      return runInBrowser({
        filePaths: bagPath ? [bagPath] : undefined,
        url: workerUrl,
        experimentalFeatureSettings,
        puppeteerLaunchConfig,
        panelLayout,
        captureLogs: true,
        dimensions: { width: 2560, height: 1424 },
        loadBrowserTimeout: waitForBrowserLoadTimeoutMs,
        onLoad: async ({ page, errors }: { page: Page, errors: Array<string> }) => {
          // From this point forward, the client controls the flow. We just call
          // `window.videoRecording.can stream from before Airavata()` which returns `false` (no action for us to take),
          // or some action for us to take (throw an error, finish up the video, etc).
          let i = 0;
          let isRunning = true;
          while (isRunning) {
            if (hasFailed) {
              return;
            }

            await promiseTimeout(
              (async () => {
                for (const error of errors) {
                  if (errorIsWhitelisted && errorIsWhitelisted(error)) {
                    log.info(`Encountered whitelisted error: ${error}`);
                  } else {
                    const errorMessage = `Encountered error: ${error.toString() || "Unknown error"}`;
                    log.info(errorMessage);
                    console.error(errorMessage);
                    throw new Error(error);
                  }
                }

                // `waitForFunction` waits until the return value is truthy, so we won't continue until
                // the client is ready with a new action. We still have to wrap it in a `promiseTimeout`
                // function, because if we don't then errors in `page` won't call the promise to either
                // resolve or reject!.
                const actionHandle = await page.waitForFunction(() => window.videoRecording.nextAction(), {
                  timeout: perFrameTimeoutMs - actionTimeDurationMs,
                });
                const actionObj: ?VideoRecordingAction = await actionHandle.jsonValue();
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
                  msPerFrame = actionObj.msPerFrame;
                } else if (actionObj.action === "screenshot") {
                  // Take a screenshot, and then tell the client that we're done taking a screenshot,
                  // so it can continue executing.
                  const screenshotStartEpoch = Date.now();
                  const screenshotIndex = i * parallelTotal + parallelIndex;
                  await page.screenshot({
                    path: `${screenshotsDir}/${screenshotIndex}.jpg`,
                    quality: 85,
                  });
                  await page.evaluate(() => window.videoRecording.hasTakenScreenshot());
                  log.info(
                    `[${parallelIndex}/${parallelTotal}] Screenshot ${screenshotIndex} took ${Date.now() -
                      screenshotStartEpoch}ms`
                  );
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

    if (msPerFrame == null) {
      throw new Error("msPerFrame was not set");
    }
    const imageCount = fs.readdirSync(screenshotsDir).length;
    const sampledImageFile = await readFile(`${screenshotsDir}/${imageCount - 1}.jpg`);

    // Once we're finished, we're going to stitch all the individual screenshots together
    // into a video, with the framerate specified by the client (via `msPerFrame`).
    const framerate = 1000 / msPerFrame;
    log.info(`Creating video with framerate ${framerate}fps (${msPerFrame}ms per frame)`);
    await exec(
      `ffmpeg -y -framerate ${framerate} -i %d.jpg -c:v libx264 -preset faster -r ${framerate} -pix_fmt yuv420p out.mp4`,
      {
        cwd: screenshotsDir,
      }
    );
    const videoPath = `${screenshotsDir}/out.mp4`;
    log.info(`Video saved at ${videoPath}`);

    const videoFile = await readFile(videoPath);
    await rmfr(videoPath);

    return { videoFile, sampledImageFile };
  } catch (error) {
    hasFailed = true;
    throw error;
  } finally {
    log.info(`Removing ${screenshotsDir}`);
    await rmfr(screenshotsDir);
  }
}

export default recordVideo;
