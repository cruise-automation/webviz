// @flow

//  Copyright (c) 2018-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import type { Page } from "puppeteer";
import * as React from "react";
import { Worldview, type BaseProps, type CameraState } from "regl-worldview";

declare var page: Page;

const defaultCameraState: CameraState = {
  distance: 75,
  perspective: true,
  phi: Math.PI / 2,
  target: [0, 0, 0],
  targetOffset: [0, 0, 0],
  targetOrientation: [0, 0, 0, 1],
  thetaOffset: Math.PI,
};

const WORLDVIEW_SIZE = 300;
const wrapperStyle = { width: WORLDVIEW_SIZE, height: WORLDVIEW_SIZE };

// This clicks as the origin (middle) point of the worldview canvas, assuming that you're using the WorldviewWrapper.
export async function clickAtOrigin() {
  await page.mouse.click(WORLDVIEW_SIZE / 2, WORLDVIEW_SIZE / 2);
}

// Provides a convenient wrapper for Worldview with a default camera state and size limitation.
export function WorldviewWrapper(props: BaseProps) {
  return (
    <div style={wrapperStyle}>
      <Worldview defaultCameraState={defaultCameraState} {...props} />
    </div>
  );
}
