// @flow
//
//  Copyright (c) 2020-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

// $FlowFixMe - https://github.com/flow-typed/flow-typed/issues/3538
import puppeteer from "puppeteer";
import type { Page } from "puppeteer";

import type { MosaicNode } from "../src/types/panels";
import delay from "./delay";
import promiseTimeout from "./promiseTimeout";
import puppeteerConfig from "./puppeteerConfig";
import ServerLogger from "./ServerLogger";

const log = new ServerLogger(__filename);

// Starts a puppeteer browser pointing at the URL. Sets the panel layout, dimensions, and drops in the bag if specified.
// Takes an `onLoad` function that runs once the browser has initialized.
// Automatically cleans up the browser after finishing.
export default async function runInBrowser<T>({
  bagPath,
  url,
  puppeteerLaunchConfig,
  panelLayout,
  experimentalFeatureSettings,
  dimensions,
  loadBrowserTimeout,
  onLoad,
  beforeLoad,
  captureLogs,
}: {
  bagPath?: string,
  url: string,
  puppeteerLaunchConfig: any,
  panelLayout: ?MosaicNode,
  experimentalFeatureSettings?: ?string, // JSON
  dimensions: { width: number, height: number },
  loadBrowserTimeout: number,
  beforeLoad?: ({| page: Page |}) => Promise<void>,
  onLoad: ({ page: Page, errors: Array<string>, logs: Array<string> }) => Promise<T>,
  captureLogs?: boolean,
}): Promise<T> {
  let browser, page;
  const errors = [];
  const logs: string[] = [];
  try {
    log.info("Starting Puppeteer...");
    await promiseTimeout(
      (async () => {
        browser = await puppeteer.launch({
          ...puppeteerConfig.launch,
          defaultViewport: dimensions,
          ...puppeteerLaunchConfig,
        });
        page = await browser.newPage();
        if (beforeLoad) {
          await beforeLoad({ page });
        }

        await delay(1000); // Occasionally things crash otherwise. See https://github.com/GoogleChrome/puppeteer/issues?q=target+closed

        log.info(`Navigating to URL: ${url}`);
        await page.goto(url, { waitUntil: "networkidle2", timeout: loadBrowserTimeout - 1000 });

        // Pass through console from the page.
        page.on("console", (msg) => {
          getArgStrings(msg).then((args) => {
            const text = `${msg.text()} --- ${JSON.stringify(args)}`;
            log.info(`[runInBrowser page ${msg.type()}] ${text}`);
            if (msg.type() === "error") {
              errors.push(text);
            }
            if (captureLogs) {
              logs.push(text);
            }
          });
        });
        page.on("error", (error) => {
          const errorMessage = `${error.toString()} (stack trace: ${error.stack})`;
          log.error(`[runInBrowser error] ${errorMessage}`);
          errors.push(errorMessage);
        });
        await page.evaluate(() => {
          window.addEventListener("error", (error) => {
            console.error(error);
          });
          window.addEventListener("unhandledrejection", (event) => {
            console.error("Unhandled promise rejection.", event.reason);
          });
        });

        if (panelLayout) {
          await page.evaluate((layout) => window.setPanelLayout(layout), panelLayout);
        }

        if (experimentalFeatureSettings) {
          await page.evaluate(
            (settings) => localStorage.setItem("experimentalFeaturesSettings", settings),
            experimentalFeatureSettings
          );
        }

        if (bagPath) {
          // Use the hidden input field to simulate dragging in a bag.
          const fileUpload = await page.$("input[data-puppeteer-file-upload]");
          if (!fileUpload) {
            throw new Error("Could not find file input");
          }
          await fileUpload.uploadFile(bagPath);
        }
      })(),
      loadBrowserTimeout,
      "Initializing browser"
    );
    log.info("Initialized browser");

    if (!page) {
      throw new Error("Page has not been set.");
    }

    return await onLoad({ page, errors, logs });
  } catch (error) {
    if (error.name === "TimeoutError" && errors.length > 0) {
      throw new Error(`TimeoutError with errors detected (${errors.length}): ${errors.join(" ||| ")}`);
    } else {
      throw error;
    }
  } finally {
    if (page) {
      await page.close();
    }
    if (browser) {
      await browser.close();
    }
  }
}

// Get the args of a ConsoleMessage per https://github.com/GoogleChrome/puppeteer/issues/3397#issuecomment-434970058
async function getArgStrings(msg: puppeteer.ConsoleMessage): Promise<string[]> {
  try {
    return await Promise.all(
      msg.args().map((arg) =>
        arg.executionContext().evaluate((innerArg) => {
          if (innerArg instanceof Error) {
            return `${innerArg.message} (stack trace: ${innerArg.stack})`;
          }
          return String(innerArg);
        }, arg)
      )
    );
  } catch (e) {
    return [`(unknown arg, error while getting argument: ${e})`];
  }
}
