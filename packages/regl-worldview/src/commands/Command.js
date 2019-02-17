//  Copyright (c) 2018-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

// TODO(JP): Should remove this and properly fix Flow.
/* eslint-disable flowtype/no-types-missing-file-annotation */

import * as React from "react";

import type { ComponentMouseHandler, MouseEventEnum, RawCommand } from "../types";
import { getIdFromColor, intToRGB } from "../utils/commandUtils";
import { getNodeEnv } from "../utils/common";
import { type WorldviewContextType } from "../WorldviewContext";
import WorldviewReactContext from "../WorldviewReactContext";

export type Props<T> = {
  children?: T[],
  reglCommand: RawCommand<T>,
  getHitmapId?: (T, colorIndex?: number) => ?number,
  layerIndex?: number,
  [MouseEventEnum]: ComponentMouseHandler,
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

  _getHitmapPropFromHitmapId(objectId: number) {
    const { hitmapProps = [] } = this.props;

    return hitmapProps.find((hitmapProp) => {
      if (hitmapProp.color) {
        const hitmapPropId = getIdFromColor(hitmapProp.color.map((color) => color * 255));
        if (hitmapPropId === objectId) {
          return true;
        }
      } else if (hitmapProp.colors) {
        // Just returning the original objectId because we don't want to do potentially expensive search here.
        return objectId;
      }
      return false;
    });
  }

  handleMouseEvent(objectId: number, e: any, ray: any, mouseEventName: MouseEventEnum) {
    const mouseHandler = this.props[mouseEventName];
    if (!mouseHandler) {
      return;
    }

    const hitmapProp = this._getHitmapPropFromHitmapId(objectId);
    if (!hitmapProp) {
      return;
    }

    mouseHandler(e, {
      ray,
      objectId,
      object: hitmapProp,
    });
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
    if (marker.colors) {
      memo.push({
        ...marker,
        colors: marker.colors.map((_, colorIndex) => intToRGB(getHitmapId(marker, colorIndex) || 0)),
      });
    } else if (marker.color) {
      const hitmapId = getHitmapId(marker);
      // filter out components that don't have hitmapIds
      if (hitmapId != null) {
        memo.push({
          ...marker,
          color: intToRGB(hitmapId || 0),
        });
      }
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
    const hitmapProps = props.getHitmapProps
      ? props.getHitmapProps()
      : getHitmapProps(props.getHitmapId, props.children);
    return <Command {...props} reglCommand={command} drawProps={props.children} hitmapProps={hitmapProps} />;
  };
  cmd.displayName = name;
  cmd.reglCommand = command;
  return cmd;
}
