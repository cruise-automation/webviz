// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { isEqual } from "lodash";
import * as React from "react";
import { type ReglClickInfo } from "regl-worldview";

import type { Point } from "webviz-core/src/types/Messages";
import { arrayToPoint } from "webviz-core/src/util";

export type MeasureState = "idle" | "place-start" | "place-finish" | "done";

export type MeasureInfo = {|
  measureState: MeasureState,
  measurePoints: { start: ?Point, end: ?Point },
|};

type Props = {|
  onMeasureInfoChange: (MeasureInfo) => void,
  ...MeasureInfo,
|};

/* eslint-disable no-restricted-syntax */

export default class MeasuringTool extends React.Component<Props> {
  mouseDownCoords: number[] = [-1, -1];

  toggleMeasureState = () => {
    const newMeasureState =
      this.props.measureState === "idle" || this.props.measureState === "done" ? "place-start" : "idle";
    this.props.onMeasureInfoChange({
      measureState: newMeasureState,
      measurePoints: { start: undefined, end: undefined },
    });
  };

  reset = () => {
    this.props.onMeasureInfoChange({
      measureState: "idle",
      measurePoints: { start: undefined, end: undefined },
    });
  };

  _canvasMouseDownHandler = (e: MouseEvent, clickInfo: ReglClickInfo) => {
    this.mouseDownCoords = [e.clientX, e.clientY];
  };

  _canvasMouseUpHandler = (e: MouseEvent, clickInfo: ReglClickInfo) => {
    const mouseUpCoords = [e.clientX, e.clientY];
    const { measureState, measurePoints, onMeasureInfoChange } = this.props;

    if (!isEqual(mouseUpCoords, this.mouseDownCoords)) {
      return;
    }

    let newMeasureState = measureState;
    if (measureState === "place-start") {
      newMeasureState = "place-finish";
    } else if (measureState === "place-finish") {
      newMeasureState = "done";
    }

    onMeasureInfoChange({
      measureState: newMeasureState,
      measurePoints,
    });
  };

  _canvasMouseMoveHandler = (e: MouseEvent, clickInfo: ReglClickInfo) => {
    const { measureState, measurePoints, onMeasureInfoChange } = this.props;
    switch (measureState) {
      case "place-start":
        onMeasureInfoChange({
          measureState,
          measurePoints: {
            start: arrayToPoint(clickInfo.ray.planeIntersection([0, 0, 0], [0, 0, 1])),
            end: undefined,
          },
        });
        break;

      case "place-finish":
        onMeasureInfoChange({
          measureState,
          measurePoints: {
            ...measurePoints,
            end: arrayToPoint(clickInfo.ray.planeIntersection([0, 0, 0], [0, 0, 1])),
          },
        });
        break;
    }
  };

  get onMouseMove(): ?(MouseEvent, ReglClickInfo) => void {
    if (!this.measureActive) {
      return null;
    }

    return this._canvasMouseMoveHandler;
  }

  get onMouseUp(): ?(MouseEvent, ReglClickInfo) => void {
    if (!this.measureActive) {
      return null;
    }

    return this._canvasMouseUpHandler;
  }

  get onMouseDown(): ?(MouseEvent, ReglClickInfo) => void {
    if (!this.measureActive) {
      return null;
    }

    return this._canvasMouseDownHandler;
  }

  get measureActive(): boolean {
    const { measureState } = this.props;
    return measureState === "place-start" || measureState === "place-finish";
  }

  get measureDistance(): string {
    const { start, end } = this.props.measurePoints;
    let dist_string = "";
    if (start && end) {
      const dist = Math.hypot(end.x - start.x, end.y - start.y, end.z - start.z);
      dist_string = `${dist.toFixed(2)}m`;
    }

    return dist_string;
  }

  render() {
    return null;
  }
}
