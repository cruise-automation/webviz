//  Copyright (c) 2018-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

// TODO(JP): Should remove this and properly fix Flow.
/* eslint-disable flowtype/no-types-missing-file-annotation */

import * as React from "react";

import type {
  ComponentMouseHandler,
  GetHitmap,
  MouseEventEnum,
  RawCommand,
  Color,
  Ray,
  MouseEventObject,
} from "../types";
import { getNodeEnv } from "../utils/common";
import { type WorldviewContextType } from "../WorldviewContext";
import WorldviewReactContext from "../WorldviewReactContext";

export const SUPPORTED_MOUSE_EVENTS = ["onClick", "onMouseUp", "onMouseMove", "onMouseDown", "onDoubleClick"];

export type MarkerDefault = {
  id?: number,
  points?: Point[],
  color?: Color,
};

export type CommonCommandProps = {
  [MouseEventEnum]: ComponentMouseHandler,
  layerIndex?: number,
  getHitmap?: GetHitmap,
};

type Props<T> = {
  children: T[],
  reglCommand: RawCommand<T>,
  ...CommonCommandProps,
};

export type CommandProps = Props;

// Component to dispatch children (for drawing) and hitmap props and a reglCommand to the render loop to render with regl.
export default class Command<T> extends React.Component<Props<T>> {
  context: ?WorldviewContextType;
  static displayName = "Command";

  constructor(props) {
    super(props);
    // In development put a check in to make sure the reglCommand prop is not mutated.
    // Similar to how react checks for unsupported or deprecated calls in a development build.
    if (getNodeEnv() !== "production") {
      this.shouldComponentUpdate = (nextProps: Props) => {
        if (nextProps.reglCommand !== this.props.reglCommand) {
          console.error("Changing the regl command prop on a <Command /> is not supported.");
        }
        return true;
      };
    }
  }

  componentDidMount() {
    this.context.onMount(this, this.props.reglCommand);
    this._updateContext();
  }

  componentDidUpdate() {
    this._updateContext();
  }

  componentWillUnmount() {
    this.context.onUnmount(this);
  }

  _updateContext() {
    const context = this.context;
    if (!context) {
      return;
    }

    const { children, reglCommand, layerIndex, getHitmap } = this.props;
    if (children == null) {
      return;
    }
    context.registerDrawCall({
      instance: this,
      reglCommand,
      children,
      layerIndex,
      getHitmap,
    });
  }

  handleMouseEvent(objects: MouseEventObject[], e: MouseEvent, ray: Ray, mouseEventName: MouseEventEnum) {
    const mouseHandler = this.props[mouseEventName];
    if (!mouseHandler || !objects.length) {
      return;
    }
    mouseHandler(e, { ray, objects });
  }

  render() {
    return (
      <WorldviewReactContext.Consumer>
        {(ctx: ?WorldviewContextType) => {
          if (ctx) {
            this.context = ctx;
          }
          return null;
        }}
      </WorldviewReactContext.Consumer>
    );
  }
}
