// @flow
//
//  Copyright (c) 2018-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import round from "lodash/round";
import sum from "lodash/sum";

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
  averageRenderMs: number,
  averageFrameTimeMs: number,
  idbReadDataByTopic: {
    [string]: { count: number, totalTimeMs: number, averageTimeMs: number },
  },
|};

type Status = {| status: "errored", error: Error |} | {| status: "finished", stats: PerformanceStats |};

let error: ?Error = null;
let finishedPerformanceStats: ?PerformanceStats = null;

global.performanceMeasurement = {
  pollStatus(): Status | false {
    if (error) {
      return { status: "errored", error };
    } else if (finishedPerformanceStats) {
      return { status: "finished", stats: finishedPerformanceStats };
    }
    return false;
  },
};

const PERFORMANCE_MEASURING_MS_FRAMERATE_PARAM = "performance-measuring-framerate";
const PERFORMANCE_MEASURING_SPEED_PARAM = "performance-measuring-speed";
const PERFORMANCE_MEASURING_SHOULD_MEASURE_IDB_PERF = "performance-measuring-enable-idb-measurement";

const params = new URLSearchParams(location.search);
const shouldMeasureIdbTimes = params.has(PERFORMANCE_MEASURING_SHOULD_MEASURE_IDB_PERF);
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

export class PerformanceMeasuringClient {
  shouldLoadDataBeforePlaying = true;
  shouldMeasureIdbTimes = shouldMeasureIdbTimes;
  enablePerformanceMarks = enablePerformanceMarks;

  speed = speed;
  msPerFrame = msPerFrame;
  bagLengthMs: ?number;

  startTime: ?number;
  startedMeasuringPerformance = false;
  frameRenderStart: ?number;
  frameRenderTimes: number[] = [];
  totalFrameMs: ?number;
  totalFrameTimes: number[] = [];
  idbStart: ?number;
  idbTimesByTopic = {};

  start({ bagLengthMs }: { bagLengthMs: number }) {
    this.bagLengthMs = bagLengthMs;
    this.startTime = performance.now();
    this.startedMeasuringPerformance = true;
  }

  // This client a singleton, so it should only be reset in tests.
  resetInTests() {
    if (process.env.NODE_ENV !== "test") {
      throw new Error("resetInTests can only be called in a test environment.");
    }

    this.shouldLoadDataBeforePlaying = true;
    this.shouldMeasureIdbTimes = shouldMeasureIdbTimes;
    this.enablePerformanceMarks = enablePerformanceMarks;

    this.bagLengthMs = undefined;
    this.speed = speed;
    this.msPerFrame = msPerFrame;

    this.startTime = undefined;
    this.startedMeasuringPerformance = false;
    this.frameRenderStart = undefined;
    this.frameRenderTimes = [];
    this.totalFrameMs = undefined;
    this.totalFrameTimes = [];
    this.idbStart = undefined;
    this.idbTimesByTopic = {};
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

  markIdbReadStart() {
    if (!this.startedMeasuringPerformance || !this.shouldMeasureIdbTimes) {
      return;
    }
    if (this.idbStart != null) {
      throw new Error("Cannot start measuring idb reads twice in a row");
    }
    this.idbStart = performance.now();
  }

  markIdbReadEnd(value: any) {
    if (!this.startedMeasuringPerformance || !this.shouldMeasureIdbTimes) {
      return;
    }
    const idbStart = this.idbStart;
    if (idbStart == null) {
      throw new Error("Cannot cannot call markIdbReadEnd if markIdbReadStart is not called first");
    }
    if (value && value.message && value.message.topic) {
      // Only measure IDB performance for ROS messages right now - other types of messages might not work.
      const topic = value.message.topic;
      this.idbTimesByTopic[topic] = this.idbTimesByTopic[topic] || [];
      this.idbTimesByTopic[topic].push(performance.now() - idbStart);
    }
    this.idbStart = null;
  }

  clearIdbReadStart() {
    if (!this.startedMeasuringPerformance || !this.shouldMeasureIdbTimes) {
      return;
    }
    this.idbStart = null;
  }

  onError(e: Error) {
    error = e;
  }

  async onFrameFinished() {}

  finish() {
    const startTime = this.startTime;
    const bagLengthMs = this.bagLengthMs;
    if (startTime == null || bagLengthMs == null) {
      throw new Error("Cannot call finish() without calling start()");
    }

    const speed = this.speed;
    const playbackTimeMs = round(performance.now() - startTime);
    const benchmarkPlaybackScore = round(bagLengthMs / (playbackTimeMs * speed), 3);
    const averageRenderMs = round(
      this.frameRenderTimes.length ? sum(this.frameRenderTimes) / this.frameRenderTimes.length : 0,
      2
    );
    const averageFrameTimeMs = round(
      this.totalFrameTimes.length ? sum(this.totalFrameTimes) / this.totalFrameTimes.length : 0,
      2
    );
    const frameRenderCount = this.frameRenderTimes.length;
    const idbReadDataByTopic = {};
    for (const key of Object.keys(this.idbTimesByTopic)) {
      const values = this.idbTimesByTopic[key];
      idbReadDataByTopic[key] = {
        count: values.length,
        totalTimeMs: round(sum(values), 2),
        averageTimeMs: round(sum(values) / values.length, 2),
      };
    }
    const stats = {
      bagLengthMs,
      speed,
      msPerFrame: this.msPerFrame,
      frameRenderCount,

      benchmarkPlaybackScore,
      playbackTimeMs,
      averageRenderMs,
      averageFrameTimeMs,
      idbReadDataByTopic,
    };

    finishedPerformanceStats = stats;
    return stats;
  }
}

export default new PerformanceMeasuringClient();
