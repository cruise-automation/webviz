// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import round from "lodash/round";
import sum from "lodash/sum";

import Database from "webviz-core/src/util/indexeddb/Database";
import sendNotification from "webviz-core/src/util/sendNotification";

type DbInfo = { name: string, version: number, objectStoreRowCounts: { name: string, rowCount: number }[] };
type IdbInfo = {
  dbs: DbInfo[],
  /*
   * NOTE: The value below is added server-side by directly reading the
   * IndexedDB usage on disk. The reason we don't use
   * navigator.storage.estimate() here is because it does not return info on
   * IndexedDB usage in Puppeteer for some reason.
   */
  diskUsageMb?: number,
};

export type PerformanceStats = {|
  bagLengthMs: number,
  speed: number,
  msPerFrame: number,
  frameRenderCount: number,

  // The "benchmark playback score" is the speed adjusted ratio of the bag length to the playback time.
  // It is not perfectly analagous to the playback ratio in production, which is capped at 1. In benchmarking we have a
  // fixed data frame size and we render as fast as possible, so this number can be greater than 1 and correlates with
  // but is not identical to what playback ratio would be when playing in production.
  // Higher is better for this metric.
  benchmarkPlaybackScore: number,
  playbackTimeMs: number,
  // Players may not mark their preload times.
  preloadTimeMs: ?number,
  averageRenderMs: number,
  averageFrameTimeMs: number,
  idb: IdbInfo,
|};

const PERFORMANCE_MEASURING_MS_FRAMERATE_PARAM = "performance-measuring-framerate";
const PERFORMANCE_MEASURING_SPEED_PARAM = "performance-measuring-speed";

const params = new URLSearchParams(location.search);
const msPerFrame = params.has(PERFORMANCE_MEASURING_MS_FRAMERATE_PARAM)
  ? 1000 / parseFloat(params.get(PERFORMANCE_MEASURING_MS_FRAMERATE_PARAM))
  : 1000 / 30;
const speed = params.has(PERFORMANCE_MEASURING_SPEED_PARAM)
  ? parseFloat(params.get(PERFORMANCE_MEASURING_SPEED_PARAM))
  : 1;
if (isNaN(speed)) {
  throw new Error(`Invalid param ${PERFORMANCE_MEASURING_SPEED_PARAM}`);
}
if (isNaN(msPerFrame)) {
  throw new Error(`Invalid param ${PERFORMANCE_MEASURING_MS_FRAMERATE_PARAM}`);
}

// Marks are expensive: only enable marking performance when we can plausibly see and use the markings, IE in local
// development builds when we aren't doing benchmarking.
const enablePerformanceMarks = process.env.NODE_ENV === "development";

class PerformanceMeasuringClient {
  shouldLoadDataBeforePlaying = true;
  enablePerformanceMarks = enablePerformanceMarks;

  speed = speed;
  msPerFrame = msPerFrame;
  bagLengthMs: ?number;

  startTime: ?number;
  startedMeasuringPerformance = false;
  frameRenderStart: ?number;
  frameRenderTimes: number[] = [];
  preloadStart: ?number;
  preloadTimeMs: ?number;
  totalFrameMs: ?number;
  totalFrameTimes: number[] = [];

  start({ bagLengthMs }: { bagLengthMs: number }) {
    if (process.env.NODE_ENV !== "production" && process.env.NODE_ENV !== "test") {
      sendNotification(
        "In performance measuring mode, but NODE_ENV is not production!",
        "Use `yarn performance-start` instead of `yarn start`.",
        "user",
        "error"
      );
      return;
    }

    this.bagLengthMs = bagLengthMs;
    this.startTime = performance.now();
    this.startedMeasuringPerformance = true;
  }

  markFrameRenderStart() {
    this.frameRenderStart = performance.now();
    if (this.enablePerformanceMarks) {
      performance.mark("FRAME_RENDER_START");
    }
  }

  markFrameRenderEnd() {
    const frameRenderStart = this.frameRenderStart;
    if (frameRenderStart == null) {
      throw new Error("Called markFrameRenderEnd without calling markFrameRenderStart");
    }
    if (this.enablePerformanceMarks) {
      performance.mark("FRAME_RENDER_END");
      performance.measure("FRAME_RENDER", "FRAME_RENDER_START", "FRAME_RENDER_END");
    }
    this.frameRenderTimes.push(round(performance.now() - frameRenderStart));
    this.frameRenderStart = null;
  }

  markPreloadStart() {
    this.preloadStart = performance.now();
    if (this.enablePerformanceMarks) {
      performance.mark("PRELOAD_START");
    }
  }

  markPreloadEnd() {
    const { preloadStart } = this;
    if (preloadStart == null) {
      throw new Error("Called markPreloadEnd without calling markPreloadStart");
    }
    if (this.enablePerformanceMarks) {
      performance.mark("PRELOAD_END");
      performance.measure("PRELOAD", "PRELOAD_START", "PRELOAD_END");
    }
    this.preloadTimeMs = round(performance.now() - preloadStart);
    this.preloadStart = null;
  }

  markTotalFrameStart() {
    this.totalFrameMs = performance.now();
  }

  markTotalFrameEnd() {
    const totalFrameMs = this.totalFrameMs;
    if (totalFrameMs == null) {
      throw new Error("Called markTotalFrameEnd without calling markTotalFrameStart");
    }
    this.totalFrameTimes.push(round(performance.now() - totalFrameMs));
    this.totalFrameMs = null;
  }

  onError(e: Error) {
    const event = new CustomEvent("playbackError", { detail: e.toString() });
    window.dispatchEvent(event);
    // Never bother to resolve this promise since we should stop perf playback whenever any error occurs.
    return new Promise<void>(() => {});
  }

  async onFrameFinished() {}

  async _collectIdbStats(): Promise<IdbInfo> {
    const databases = await window.indexedDB.databases();
    const databasesWithInfo = [];

    for (const { name, version } of databases) {
      const dbWrapper = await Database.open(name, version, () => {});
      const objectStoreNames = dbWrapper.db.objectStoreNames;
      const objectStoreRowCounts = [];
      for (const objectStoreName of objectStoreNames) {
        const rowCount = await dbWrapper.count(objectStoreName);
        objectStoreRowCounts.push({ name: objectStoreName, rowCount });
      }

      databasesWithInfo.push({ name, version, objectStoreRowCounts });
    }

    return {
      dbs: databasesWithInfo,
    };
  }

  async finish() {
    const startTime = this.startTime;
    const bagLengthMs = this.bagLengthMs;
    const preloadTimeMs = this.preloadTimeMs;

    if (startTime == null || bagLengthMs == null) {
      throw new Error("Cannot call finish() without calling start()");
    }

    const playbackTimeMs = round(performance.now() - startTime);
    const benchmarkPlaybackScore = round(bagLengthMs / (playbackTimeMs * this.speed), 3);
    const averageRenderMs = round(
      this.frameRenderTimes.length ? sum(this.frameRenderTimes) / this.frameRenderTimes.length : 0,
      2
    );
    const averageFrameTimeMs = round(
      this.totalFrameTimes.length ? sum(this.totalFrameTimes) / this.totalFrameTimes.length : 0,
      2
    );
    const frameRenderCount = this.frameRenderTimes.length;
    const idb = await this._collectIdbStats();
    const detail: PerformanceStats = {
      bagLengthMs,
      speed: this.speed,
      msPerFrame: this.msPerFrame,
      frameRenderCount,
      benchmarkPlaybackScore,
      playbackTimeMs,
      averageRenderMs,
      averageFrameTimeMs,
      idb,
      preloadTimeMs,
    };

    const event = new CustomEvent("playbackFinished", { detail });
    window.dispatchEvent(event);
  }
}

export default PerformanceMeasuringClient;
