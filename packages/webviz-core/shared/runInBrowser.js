// @flow
//
//  Copyright (c) 2020-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

// $FlowFixMe - https://github.com/flow-typed/flow-typed/issues/3538
import puppeteer from "puppeteer";
import type { Page, Browser } from "puppeteer";

import type { MosaicNode } from "../src/types/panels";
import delay from "./delay";
import promiseTimeout from "./promiseTimeout";
import puppeteerConfig from "./puppeteerConfig";
import ServerLogger from "./ServerLogger";

const log = new ServerLogger(__filename);

type PageOptions = { captureLogs?: boolean, onLog: (string) => void, onError: (string) => void };
type LayoutOptions = { panelLayout: ?MosaicNode, experimentalFeatureSettings?: ?string, filePaths: ?(string[]) };

// Starts a puppeteer browser pointing at the URL. Sets the panel layout, dimensions, and drops in the bag if specified.
// Takes an `onLoad` function that runs once the browser has initialized.
// Automatically cleans up the browser after finishing.
export default async function runInBrowser<T>({
  filePaths,
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
  filePaths: ?(string[]),
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
  const errors = [];
  const logs: string[] = [];
  const onLog = (text) => {
    logs.push(text);
  };
  const onError = (text) => {
    errors.push(text);
  };

  try {
    return withBrowser(
      async (browser: Browser) => {
        return runInPage(
          (page) => {
            return onLoad({ page, errors, logs });
          },
          {
            browser,
            beforeLoad,
            pageLoadTimeout: loadBrowserTimeout,
            layoutOptions: { panelLayout, filePaths, experimentalFeatureSettings },
            pageOptions: { onLog, onError, captureLogs },
            url,
          }
        );
      },
      {
        dimensions,
        loadBrowserTimeout,
        puppeteerLaunchConfig,
      }
    );
  } catch (error) {
    if (error.name === "TimeoutError" && errors.length > 0) {
      throw new Error(`TimeoutError with errors detected (${errors.length}): ${errors.join(" ||| ")}`);
    } else {
      throw error;
    }
  }
}

export async function runInPage<T>(
  onPageLoaded: (page: Page) => Promise<T>,
  options: {
    browser: Browser,
    beforeLoad?: ({| page: Page |}) => Promise<void>,
    pageLoadTimeout: number,
    layoutOptions: LayoutOptions,
    pageOptions: PageOptions,
    url: string,
  }
): Promise<T> {
  const { browser, beforeLoad, url, pageOptions, layoutOptions, pageLoadTimeout } = options;

  let page: ?Page;
  try {
    page = await browser.newPage();
    if (!page) {
      throw new Error("Page has not been set.");
    }
    if (beforeLoad) {
      await beforeLoad({ page });
    }
    await delay(250); // Occasionally things crash otherwise. See https://github.com/GoogleChrome/puppeteer/issues?q=target+closed

    log.info(`Navigating to URL: ${url}`);
    await page.goto(url, { waitUntil: "networkidle2", timeout: pageLoadTimeout });
    await page.waitFor(() => !document.querySelector("#loadingLogo"), { timeout: pageLoadTimeout });

    await setupPageLogging(page, pageOptions);
    await setupWebvizLayout(page, layoutOptions);
    return await onPageLoaded(page);
  } catch (error) {
    throw error;
  } finally {
    if (page) {
      await page.close();
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

export async function withBrowser<T>(
  callback: (browser: Browser) => Promise<T>,
  {
    dimensions,
    loadBrowserTimeout,
    puppeteerLaunchConfig,
  }: {
    puppeteerLaunchConfig: any,
    dimensions: { width: number, height: number },
    loadBrowserTimeout: number,
  }
): Promise<T> {
  let browser;
  try {
    log.info("Starting Puppeteer...");
    await promiseTimeout(
      (async () => {
        browser = await puppeteer.launch({
          ...puppeteerConfig.launch,
          defaultViewport: dimensions,
          ...puppeteerLaunchConfig,
        });
      })(),
      loadBrowserTimeout,
      "Starting Puppeteer"
    );

    if (browser) {
      log.info("Puppeteer started");
      return await callback(browser);
    }
    return Promise.reject();
  } catch (error) {
    console.error(error.stack || (error.toString && error.toString()) || error);
    throw error;
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

export async function setupPageLogging(page: Page, options: PageOptions) {
  const { captureLogs, onLog, onError } = options;

  // Pass through console from the page.
  page.on("console", (msg) => {
    getArgStrings(msg).then((args) => {
      const text = `${msg.text()} ${args.length > 1 ? `--- ${JSON.stringify(args.slice(1))}` : ""}`;
      if (msg.type() === "error") {
        onError(text);
      }
      if (captureLogs) {
        onLog(text);
        console.log(text);
      }
    });
  });

  function onPuppeteerError(error: any) {
    const errorMessage: string = (error.jsonValue && error.jsonValue()) || error.toString();
    log.error(`[runInBrowser error] ${errorMessage}`);
    console.warn(errorMessage);
    onError(errorMessage);
  }

  page.on("pageerror", (error) => {
    onPuppeteerError(error);
  });
  page.on("error", (error) => {
    onPuppeteerError(error);
  });

  await page.evaluate(() => {
    window.addEventListener("error", (error) => {
      // This can happen when ResizeObserver can't resolve its callbacks fast enough, but we can ignore it.
      // See https://stackoverflow.com/questions/49384120/resizeobserver-loop-limit-exceeded
      if (error.message.includes("ResizeObserver loop limit exceeded")) {
        return;
      }
      console.error(error);
    });
    window.addEventListener("unhandledrejection", (event) => {
      console.error("Unhandled promise rejection.", event.reason);
    });
  });
}

// Sets the layout, experimental features, and triggers the bag drag-and-drop behavior
export async function setupWebvizLayout(page: Page, options: LayoutOptions) {
  const { panelLayout, experimentalFeatureSettings, filePaths } = options;

  // Make sure the page is ready before proceeding.
  await page.waitForSelector(".app-container");

  if (experimentalFeatureSettings) {
    await page.evaluate(
      (settings: any) => localStorage.setItem("experimentalFeaturesSettings", (settings: string)),
      experimentalFeatureSettings
    );
  }

  if (panelLayout) {
    page.evaluate((layout) => window.setPanelLayout(layout), panelLayout);
  }

  if (filePaths && filePaths.length) {
    // Use the hidden input field to simulate dragging in a bag.
    const fileUpload = await page.$("input[data-puppeteer-file-upload]");
    if (!fileUpload) {
      throw new Error("Could not find file input");
    }
    await fileUpload.uploadFile(...filePaths);
  }
}
