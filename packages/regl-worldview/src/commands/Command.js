// @flow
//  Copyright (c) 2018-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import * as React from "react";

import type {
  ComponentMouseHandler,
  GetChildrenForHitmap,
  MouseEventEnum,
  RawCommand,
  Color,
  Point,
  MouseEventObject,
} from "../types";
import { getNodeEnv } from "../utils/common";
import { Ray } from "../utils/Raycast";
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
  getChildrenForHitmap?: GetChildrenForHitmap,
};

type Props<T> = {
  ...CommonCommandProps,
  children?: T[] | T,
  // Deprecated, but here for backwards compatibility
  drawProps?: T[],
  reglCommand: RawCommand<T>,
};

export type CommandProps<T> = Props<T>;

// Component to dispatch children (for drawing) and hitmap props and a reglCommand to the render loop to render with regl.
export default class Command<T> extends React.Component<Props<T>> {
  context: ?WorldviewContextType;
  static displayName = "Command";

  constructor(props: Props<T>) {
    super(props);
    // In development put a check in to make sure the reglCommand prop is not mutated.
    // Similar to how react checks for unsupported or deprecated calls in a development build.
    if (getNodeEnv() !== "production") {
      // $FlowFixMe
      this.shouldComponentUpdate = (nextProps: Props) => {
        if (nextProps.reglCommand !== this.props.reglCommand) {
          console.error("Changing the regl command prop on a <Command /> is not supported.");
        }
        return true;
      };
    }
  }

  componentDidMount() {
    const context = this.context;
    if (!context) {
      return;
    }
    context.onMount(this, this.props.reglCommand);
    this._updateContext();
  }

  componentDidUpdate() {
    this._updateContext();
  }

  componentWillUnmount() {
    const context = this.context;
    if (!context) {
      return;
    }
    context.onUnmount(this);
  }

  _updateContext() {
    const context = this.context;
    if (!context) {
      return;
    }

    const { reglCommand, layerIndex, getChildrenForHitmap } = this.props;
    const children = this.props.children || this.props.drawProps;
    if (children == null) {
      return;
    }
    context.registerDrawCall({
      instance: this,
      reglCommand,
      children,
      layerIndex,
      getChildrenForHitmap,
    });
  }

  handleMouseEvent(
    objects: MouseEventObject[],
    ray: Ray,
    e: SyntheticMouseEvent<HTMLCanvasElement>,
    mouseEventName: MouseEventEnum
  ) {
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
