// @flow

//  Copyright (c) 2018-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

/* eslint-disable react/display-name */

import React from "react";

import type { CameraState } from "../types";
import Worldview, { type Props } from "../Worldview";
import { timeout } from "stories/assertionTestUtils";

const defaultCameraState: $Shape<CameraState> = {
  distance: 75,
  perspective: true,
  phi: Math.PI / 2,
  target: [0, 0, 0],
  targetOffset: [0, 0, 0],
  targetOrientation: [0, 0, 0, 1],
};

export const WORLDVIEW_SIZE = 300;

// Provides a convenient wrapper for Worldview with a default camera state and size limitation.
export function WorldviewWrapper(props: Props) {
  return (
    <div style={{ width: WORLDVIEW_SIZE, height: WORLDVIEW_SIZE }}>
      <Worldview defaultCameraState={defaultCameraState} {...props} />
    </div>
  );
}

export async function clickAtOrigin() {
  const [element] = document.getElementsByTagName("canvas");
  if (!element) {
    throw new Error("Could not find canvas element");
  }
  const mouseDownEvent = new MouseEvent("mousedown", {
    bubbles: true,
    clientX: WORLDVIEW_SIZE / 2,
    clientY: WORLDVIEW_SIZE / 2,
  });
  element.dispatchEvent(mouseDownEvent);
  const mouseUpEvent = new MouseEvent("mouseup", {
    bubbles: true,
    clientX: WORLDVIEW_SIZE / 2,
    clientY: WORLDVIEW_SIZE / 2,
  });
  element.dispatchEvent(mouseUpEvent);
  await timeout(100);
}
