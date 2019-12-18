// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { vec3 } from "gl-matrix";
import { isEqual } from "lodash";
import * as React from "react";
import { cameraStateSelectors, type CameraState, type Vec3 } from "regl-worldview";

import styles from "webviz-core/src/panels/ThreeDimensionalViz/PositionControl.module.scss";

type Props = {
  cameraState: ?CameraState,
  onCameraStateChange: (CameraState) => void,
};

const TEMP_VEC3 = [0, 0, 0];
const ZERO_VEC3 = Object.freeze([0, 0, 0]);

// make a best-effort attempt to x and y position out of the input
export function parsePosition(input: string): ?Vec3 {
  const parts = input.split(/\s*[,\n{}[\]]+\s*/).filter((part) => part !== "");
  const parseMatch = (val: string) => {
    const match = val.match(/-?\d+(\.\d+)?/);
    return match ? Number.parseFloat(match[0]) : null;
  };
  // allow length 3 to ignore z value
  if (parts.length === 2 || parts.length === 3) {
    const x = parseMatch(parts[0]);
    const y = parseMatch(parts[1]);
    if (x != null && y != null) {
      return [x, y, 0];
    }
  }
  return null;
}

export default class PositionControl extends React.Component<Props> {
  lastValue: ?string;
  _ref = React.createRef<HTMLDivElement>();

  onKeyDown = (event: SyntheticKeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Enter" || event.key === "Return") {
      event.stopPropagation();
      event.preventDefault();
      event.currentTarget.blur();
    }
  };

  onInput = () => {
    if (this._ref.current) {
      this.lastValue = this._ref.current.innerText;
    }
  };

  onFocus = () => {
    const { current: el } = this._ref;
    if (el) {
      const range = document.createRange();
      range.selectNodeContents(el);
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(range);
    }
  };

  onBlur = () => {
    window.getSelection().removeAllRanges();

    const { cameraState } = this.props;
    if (!cameraState) {
      return;
    }
    if (!this.lastValue) {
      return;
    }

    const newPos = parsePosition(this.lastValue);
    if (newPos) {
      const { target, targetOffset } = cameraState;
      const targetHeading = cameraStateSelectors.targetHeading(cameraState);
      // extract the targetOffset by subtracting from the target and un-rotating by heading
      const newTargetOffset = vec3.rotateZ([0, 0, 0], vec3.sub(TEMP_VEC3, newPos, target), ZERO_VEC3, targetHeading);
      if (!isEqual(targetOffset, newTargetOffset)) {
        this.props.onCameraStateChange({ ...cameraState, targetOffset: newTargetOffset });
        return;
      }
    }

    // if we didn't actually change the camera position, reset manually since we won't be getting new props
    this.resetValue();
  };

  componentDidMount() {
    this.resetValue();
  }

  componentDidUpdate() {
    this.resetValue();
  }

  resetValue() {
    const { current: el } = this._ref;
    if (!el) {
      return;
    }
    const { cameraState } = this.props;
    if (!cameraState) {
      return;
    }

    // show camera center position for now
    // TODO(jacob): maybe UI to switch between car, camera, and mouse position?
    const { target, targetOffset } = cameraState;
    const targetHeading = cameraStateSelectors.targetHeading(cameraState);

    const [x, y] = vec3.add(TEMP_VEC3, target, vec3.rotateZ(TEMP_VEC3, targetOffset, ZERO_VEC3, -targetHeading));

    this.lastValue = null;
    el.innerHTML =
      `<b>x:</b> <span class="${styles.value}">${x}</span><br />` +
      `<b>y:</b> <span class="${styles.value}">${y}</span>`;
  }

  render() {
    return (
      <div
        ref={this._ref}
        className={styles.inputField}
        contentEditable="plaintext-only"
        onInput={this.onInput}
        onFocus={this.onFocus}
        onBlur={this.onBlur}
        onKeyDown={this.onKeyDown}
      />
    );
  }
}
