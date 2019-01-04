//  Copyright (c) 2018-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

// TODO(JP): Should remove this and properly fix Flow.
/* eslint-disable flowtype/no-types-missing-file-annotation */

import * as React from "react";

import type { RawCommand } from "../types";
import { intToRGB } from "../utils/commandUtils";
import { type WorldviewContextType } from "../WorldviewContext";
import WorldviewReactContext from "../WorldviewReactContext";

export type Props<T> = {
  children?: T[],
  reglCommand: RawCommand<T>,
  getHitmapId?: (T) => ?number,
  layerIndex?: number,
};

// Component to dispatch draw props and hitmap props and a reglCommand to the render loop to render with regl.
export default class Command<T> extends React.Component<Props<T>> {
  context: ?WorldviewContextType;
  static displayName = "Command";

  constructor(props) {
    super(props);
    // In development put a check in to make sure the reglCommand prop is not mutated.
    // Similar to how react checks for unsupported or deprecated calls in a development build.
    if (process && process.env && process.env.NODE_ENV !== "production") {
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
    const drawProps = this.props.drawProps;
    if (drawProps == null) {
      return;
    }
    context.registerDrawCall({
      instance: this,
      command: this.props.reglCommand,
      drawProps,
      layerIndex: this.props.layerIndex,
    });

    const hitmapProps = this.props.hitmapProps;
    if (hitmapProps) {
      context.registerHitmapCall({
        instance: this,
        command: this.props.reglCommand,
        drawProps: hitmapProps,
        layerIndex: this.props.layerIndex,
      });
    }
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

function getHitmapProps(getHitmapId, children) {
  if (!getHitmapId || !children || children.length === 0) {
    return undefined;
  }

  return children.reduce((memo, marker) => {
    const hitmapId = getHitmapId(marker);
    // filter out components that don't have hitmapIds
    if (hitmapId != null) {
      memo.push({
        ...marker,
        color: intToRGB(getHitmapId(marker) || 0),
      });
    }
    return memo;
  }, []);
}

// Factory function for creating simple regl components.
// Sample usage: const Cubes = makeCommand('Cubes', rawCommand)
// When you have children as the drawProps input, it's useful to simply call makeCommand
// which creates a new regl component. It also handles basic hitmap interactions.
export function makeCommand<T>(name: string, command: RawCommand<T>): React.StatelessFunctionalComponent<T> {
  const cmd = (props: Props<T>) => {
    return (
      <Command
        reglCommand={command}
        drawProps={props.children}
        hitmapProps={getHitmapProps(props.getHitmapId, props.children)}
      />
    );
  };
  cmd.displayName = name;
  return cmd;
}
