// @flow
//
//  Copyright (c) 2020-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import child_process from "child_process";
import path from "path";
import type { Page } from "puppeteer";
import rmfr from "rmfr";

import runInBrowser from "./runInBrowser";
import signal from "./signal";
import { type PerformanceStats } from "webviz-core/src/players/automatedRun/performanceMeasuringClient";

const waitForBrowserLoadTimeoutMs = 3 * 60 * 1000; // 3 minutes

const userDataDir = "/tmp/_puppeteer_data_dir";
const indexedDBPath = path.join(userDataDir, `/Default/IndexedDB/http_localhost_3000.indexeddb.leveldb`);

type PerfOutput = {
  stats?: PerformanceStats,
  error?: string,
};

const listenFor = (page, eventTypes: string[]) => {
  return page.evaluateOnNewDocument((innerEventTypes: any) => {
    (innerEventTypes: string[]).forEach((type) => {
      window.addEventListener(type, (e) => {
        window.onCustomEvent({ type, detail: e.detail });
      });
    });
  }, eventTypes);
};

const getIdbSizeOnDisk = () => {
  const sizeMb = child_process
    .execSync(`du -c --block-size=M ${indexedDBPath}/*.ldb | tail -n 1`)
    .toString()
    .replace(/\D/g, "");
  return Number(sizeMb);
};

async function measurePlaybackPerformance({
  filePaths,
  url,
  panelLayout,
  experimentalFeatureSettings,
}: {
  filePaths: ?(string[]),
  url: string,
  panelLayout?: any,
  experimentalFeatureSettings: ?string, // JSON
}): Promise<{ stats: PerformanceStats, logs: string[] }> {
  const doneSignal = signal<PerfOutput>();
  if (!url.includes("measure-playback-performance-mode")) {
    throw new Error("`url` must contain measure-playback-performance-mode for `measurePlaybackPerformance` to work.");
  }

  // Necessary to start webviz without any persisted storage performance tests.
  await rmfr(userDataDir);

  return runInBrowser({
    filePaths,
    url,
    puppeteerLaunchConfig: {
      userDataDir,
      headless: !process.env.DEBUG_CI,
    },
    panelLayout,
    experimentalFeatureSettings,
    dimensions: { width: 1920, height: 1080 },
    loadBrowserTimeout: waitForBrowserLoadTimeoutMs,
    captureLogs: true,
    beforeLoad: async ({ page }: { page: Page }): Promise<void> => {
      listenFor(page, ["playbackFinished", "playbackError"]);
      await page.exposeFunction("onCustomEvent", async (e) => {
        switch (e.type) {
          case "playbackFinished": {
            const diskUsageMb = getIdbSizeOnDisk();
            const stats = e.detail;
            doneSignal.resolve({ stats: { ...stats, idb: { ...stats.idb, diskUsageMb } } });
            break;
          }
          case "playbackError":
            doneSignal.resolve({ error: e.detail });
            break;
          default:
            doneSignal.resolve({ error: "Unknown event type encountered" });
        }
      });
    },
    onLoad: async ({
      errors,
      logs,
    }: {
      page: Page,
      errors: Array<string>,
      logs: string[],
    }): Promise<{ stats: PerformanceStats, logs: string[], errors: string[] }> => {
      const { stats, error } = await doneSignal;
      if (error) {
        throw new Error(error);
      }
      if (!stats) {
        throw new Error("No stats object found.");
      }
      return { stats, logs, errors };
    },
  });
}

export default measurePlaybackPerformance;
