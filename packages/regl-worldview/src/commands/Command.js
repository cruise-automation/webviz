//  Copyright (c) 2018-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

// TODO(JP): Should remove this and properly fix Flow.
/* eslint-disable flowtype/no-types-missing-file-annotation */

import * as React from "react";

import type { RawCommand, Color } from "../types";
import { intToRGB } from "../utils/commandUtils";
import { type WorldviewContextType } from "../WorldviewContext";
import WorldviewReactContext from "../WorldviewReactContext";

export type Props<T> = {
  children?: T[],
  getHitmapId?: (T) => ?number,
  layerIndex?: number,
};

type CommandProps = {
  layerIndex?: number,
};

// The base class for all regl-based drawing commands.
// Subclasses should override getDrawProps and (and optionally getHitmapProps).
export default class Command<T: CommandProps> extends React.Component<T> {
  context: WorldviewContextType;
  static displayName = "Command";
  static command: RawCommand<any>;

  // do not override this in sub-commands
  componentDidMount() {
    this.context.onMount(this);
    this._updateContext();
  }

  // do not override this in sub-commands
  componentDidUpdate() {
    this._updateContext();
  }

  // do not override this in sub-commands
  componentWillUnmount() {
    this.context.onUnmount(this);
  }

  _updateContext() {
    const drawProps = this.getDrawProps();
    if (drawProps == null) {
      return;
    }
    this.context.registerDrawCall({
      command: this,
      drawProps,
      layerIndex: this.props.layerIndex,
    });

    const hitmapProps = this.getHitmapProps();
    if (hitmapProps) {
      this.context.registerHitmapCall({
        command: this,
        drawProps: hitmapProps,
        layerIndex: this.props.layerIndex,
      });
    }
  }

  getDrawProps(): any {
    throw new Error("Overriding getDrawProps in subclass is required");
  }

  getHitmapProps(): any {
    return null;
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

// When you have children as the drawProps input, it's useful to simply call makeCommand
// which uses SimpleCommand underneath to create a new regl component. It also handles basic hitmap
// interactions. You'll want to subclass Command if the React children is not the drawProps input or if
// additional data processing is needed to generate the drawProps/hitmapProps.
export class SimpleCommand<T> extends Command<Props<T>> {
  static defaultProps = {
    children: [],
    getHitmapId: undefined,
  };

  getDrawProps() {
    return this.props.children;
  }

  getHitmapProps(): ?((T & { color: Color })[]) {
    const { getHitmapId } = this.props;
    if (!getHitmapId || !this.props.children || this.props.children.length === 0) {
      return undefined;
    }

    return this.props.children.reduce((memo, marker) => {
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
}

// factory function for creating simple regl components.
// sample usage: const Cubes = makeCommand('Cubes', rawCommand)
export function makeCommand<T>(name: string, command: RawCommand<any>) {
  return class BaseComponent extends SimpleCommand<T> {
    static displayName = name;
    static command = command;
  };
}
