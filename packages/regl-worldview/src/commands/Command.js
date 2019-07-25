//  Copyright (c) 2018-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

// TODO(JP): Should remove this and properly fix Flow.
/* eslint-disable flowtype/no-types-missing-file-annotation */

import * as React from "react";

import type { ComponentMouseHandler, GetHitmap, MouseEventEnum, RawCommand, Color, Ray } from "../types";
import { getNodeEnv } from "../utils/common";
import { type WorldviewContextType } from "../WorldviewContext";
import WorldviewReactContext from "../WorldviewReactContext";

export const SUPPORTED_MOUSE_EVENTS = ["onClick", "onMouseUp", "onMouseMove", "onMouseDown", "onDoubleClick"];

export type MarkerDefault = {
  id?: number,
  points?: Point[],
  color?: Color,
};

export type OptionalCommandProps = {
  [MouseEventEnum]: ComponentMouseHandler,
  layerIndex?: number,
  getHitmap?: GetHitmap,
};

export type Props<T> = {
  [MouseEventEnum]: ComponentMouseHandler,
  drawProps: T[],
  layerIndex?: number,
  reglCommand: RawCommand<T>,

  // Interactivity
  getHitmap?: GetHitmap,
};

export type CommandProps = Props;

export type MakeCommandOptions = {
  getHitmap?: GetHitmap,
};

// Component to dispatch draw props and hitmap props and a reglCommand to the render loop to render with regl.
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

    const { drawProps, reglCommand, layerIndex, getHitmap } = this.props;
    if (drawProps == null) {
      return;
    }
    context.registerDrawCall({
      instance: this,
      command: reglCommand,
      drawProps,
      layerIndex,
      getHitmap,
    });
  }

  handleMouseEvent(objectId: number, e: MouseEvent, ray: Ray, mouseEventName: MouseEventEnum) {
    const context = this.context;
    if (!context) {
      return;
    }
    const mouseHandler = this.props[mouseEventName];
    const { object, instanceIndex } = this.context.getDrawPropByHitmapId(objectId);
    if (!mouseHandler || !object) {
      return;
    }
    const clickInfo = { ray, object };
    if (instanceIndex != null) {
      clickInfo.instanceIndex = instanceIndex;
    }
    mouseHandler(e, clickInfo);
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

// Factory function for creating simple regl components.
// Sample usage: const Cubes = makeCommand('Cubes', rawCommand)
// When you have children as the drawProps input, it's useful to simply call makeCommand
// which creates a new regl component. It also handles basic hitmap interactions.
// use 'options' to control the default hitmap inputs
export function makeCommand<T>(
  name: string,
  command: RawCommand<T>,
  options: ?MakeCommandOptions = {}
): React.StatelessFunctionalComponent<T> {
  const cmd = ({ children, ...rest }: Props<T>) => {
    return <Command {...options} {...rest} reglCommand={command} drawProps={children} />;
  };

  cmd.displayName = name;
  cmd.reglCommand = command;
  return cmd;
}
