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

const perFrameTimeoutMs = 2 * 60000; // 2 minutes
const waitForBrowserLoadTimeoutMs = 60000; // 1 minute

async function recordVideo({
  bagPath,
  url,
  puppeteerLaunchConfig,
  panelLayout,
  errorIsWhitelisted,
}: {
  bagPath?: string,
  url: string,
  puppeteerLaunchConfig?: any,
  panelLayout?: any,
  errorIsWhitelisted?: (string) => boolean,
}): Promise<Buffer> {
  if (!url.includes("video-recording-mode")) {
    throw new Error("`url` must contain video-recording-mode for `recordVideo` to work.");
  }

  const screenshotsDir = `${globalEnvVars.tempVideosDirectory}/__video-recording-tmp-${uuid.v4()}__`;
  await mkdir(screenshotsDir);

  try {
    let msPerFrame;
    await runInBrowser({
      bagPath,
      url,
      puppeteerLaunchConfig,
      panelLayout,
      dimensions: { width: 2560, height: 1424 },
      loadBrowserTimeout: waitForBrowserLoadTimeoutMs,
      onLoad: async ({ page, errors }: { page: Page, errors: Array<string> }) => {
        // From this point forward, the client controls the flow. We just call
        // `window.videoRecording.nextAction()` which returns `false` (no action for us to take),
        // or some action for us to take (throw an error, finish up the video, etc).
        let i = 0;
        let isRunning = true;
        while (isRunning) {
          await promiseTimeout(
            (async () => {
              for (const error of errors) {
                if (errorIsWhitelisted && errorIsWhitelisted(error)) {
                  log.info(`Encountered whitelisted error: ${error}`);
                } else {
                  throw new Error(error);
                }
              }

              // `waitForFunction` waits until the return value is truthy, so we won't continue until
              // the client is ready with a new action. We still have to wrap it in a `promiseTimeout`
              // function, because if we don't then errors in `page` won't call the promise to either
              // resolve or reject!.
              const actionHandle = await page.waitForFunction(() => window.videoRecording.nextAction(), {
                // TEMP(jacob): increased from 30s to debug timeouts in staging
                timeout: perFrameTimeoutMs - 1000,
              });
              const actionObj: ?VideoRecordingAction = await actionHandle.jsonValue();
              if (!actionObj) {
                return;
              }
              if (actionObj.action === "error" && actionObj.error) {
                if (errorIsWhitelisted && errorIsWhitelisted(actionObj.error)) {
                  log.info(`Encountered whitelisted error: ${actionObj.error}`);
                } else {
                  throw new Error(actionObj.error);
                }
              } else if (actionObj.action === "finish") {
                log.info("Finished!");
                isRunning = false;
                msPerFrame = actionObj.msPerFrame;
              } else if (actionObj.action === "screenshot") {
                // Take a screenshot, and then tell the client that we're done taking a screenshot,
                // so it can continue executing.
                await page.screenshot({ path: `${screenshotsDir}/${i}.jpg` });
                await page.evaluate(() => window.videoRecording.hasTakenScreenshot());
                i++;
              } else {
                throw new Error(`Unknown action: ${actionObj.action}`);
              }
            })(),
            perFrameTimeoutMs,
            "Taking a screenshot"
          );
        }
      },
    });

    if (msPerFrame == null) {
      throw new Error("msPerFrame was not set");
    }

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

    return videoFile;
  } finally {
    log.info(`Removing ${screenshotsDir}`);
    await rmfr(screenshotsDir);
  }
}

export default recordVideo;
