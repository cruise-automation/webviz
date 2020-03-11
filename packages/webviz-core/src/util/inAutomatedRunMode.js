// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

export function videoRecordingMode() {
  return new URLSearchParams(window.location.search).has("video-recording-mode");
}

export function performanceMeasuringMode() {
  return new URLSearchParams(window.location.search).has("performance-measuring-mode");
}

function inAutomatedRunMode(): boolean {
  return videoRecordingMode() || performanceMeasuringMode();
}

export default inAutomatedRunMode;
