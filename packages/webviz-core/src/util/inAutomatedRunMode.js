// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

function getSearchParams(): URLSearchParams {
  const globalWindow = typeof window !== "undefined" ? window : {};
  return new URLSearchParams(globalWindow.location?.search || "");
}

export function inVideoRecordingMode() {
  return getSearchParams().has("video-recording-mode");
}

export function inPlaybackPerformanceMeasuringMode() {
  return getSearchParams().has("measure-playback-performance-mode");
}

export function inLoadPerformanceMode() {
  return getSearchParams().has("measure-load-performance-mode");
}

function inAutomatedRunMode(): boolean {
  return inVideoRecordingMode() || inPlaybackPerformanceMeasuringMode() || inLoadPerformanceMode();
}

export default inAutomatedRunMode;
