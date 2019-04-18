//  Copyright (c) 2018-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

// TODO(JP): Should remove this and properly fix Flow.
/* eslint-disable flowtype/no-types-missing-file-annotation */

import * as React from "react";

import type { ComponentMouseHandler, MouseEventEnum, RawCommand, Vec4, Color, Ray } from "../types";
import { getIdFromColor, intToRGB } from "../utils/commandUtils";
import { getNodeEnv } from "../utils/common";
import { type WorldviewContextType } from "../WorldviewContext";
import WorldviewReactContext from "../WorldviewReactContext";

export const SUPPORTED_MOUSE_EVENTS = ["onClick", "onMouseUp", "onMouseMove", "onMouseDown", "onDoubleClick"];

export type HitmapProp<T> = T & ({ colors: Vec4[] } | { color: Vec4 });
export type GetObjectFromHitmapId<T> = (objectId: number, hitmapProps: HitmapProps<T>[]) => ?HitmapProps<T>;
export type GetHitmapProps<T> = (children: T[]) => ?HitmapProp<T>;
export type MarkerDefault = {
  id?: number,
  points?: Point[],
  color?: Color,
};
export type HitmapMarkerDefault = {
  id?: number,
  points?: Point[],
  color?: Vec4,
};

export type Props<T> = {
  [MouseEventEnum]: ComponentMouseHandler,
  children?: T[],
  getObjectFromHitmapId?: GetObjectFromHitmapId<HitmapProp<T>>,
  hitmapProps?: HitmapProp<T>,
  layerIndex?: number,
  reglCommand: RawCommand<T>,
};

export type CommandProps = Props;

export type MakeCommandOptions = {
  getHitmapProps: GetHitmapProps,
  getObjectFromHitmapId: GetObjectFromHitmapId,
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

  handleMouseEvent(objectId: number, e: MouseEvent, ray: Ray, mouseEventName: MouseEventEnum) {
    const mouseHandler = this.props[mouseEventName];
    const { hitmapProps = [], getObjectFromHitmapId } = this.props;
    if (!mouseHandler || hitmapProps.length === 0 || !getObjectFromHitmapId) {
      return;
    }

    const hitmapProp = getObjectFromHitmapId(objectId, hitmapProps);

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

// TODO: deprecating, remove before 1.x release
function defaultGetHitmapProps<T>(getHitmapId, children: T[]): ?(HitmapProp[]) {
  if (!children || children.length === 0) {
    return undefined;
  }

  return children.reduce((memo, marker) => {
    const hitmapId = getHitmapId(marker);
    // filter out components that don't have hitmapIds
    if (hitmapId != null) {
      memo.push({
        ...marker,
        color: intToRGB(hitmapId || 0),
      });
    }
    return memo;
  }, []);
}

// TODO: deprecating, remove before 1.x release
function defaultGetObjectFromHitmapId(objectId: number, hitmapProps) {
  return hitmapProps.find((hitmapProp) => {
    if (hitmapProp.color) {
      const hitmapPropId = getIdFromColor(hitmapProp.color.map((color) => color * 255));
      if (hitmapPropId === objectId) {
        return true;
      }
    }
    return false;
  });
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
  let warnedAboutDeprecatedGetHitmapId = false;
  const cmd = ({
    children,
    getObjectFromHitmapId: getObjectFromHitmapIdAlt,
    getHitmapProps: getHitmapPropsAlt,
    getHitmapId,
    ...rest
  }: Props<T>) => {
    let getObjectFromHitmapId = getObjectFromHitmapIdAlt || options.getObjectFromHitmapId;
    const getHitmapProps = getHitmapPropsAlt || options.getHitmapProps;
    let hitmapProps;

    if ((getHitmapPropsAlt && !getObjectFromHitmapIdAlt) || (!getHitmapPropsAlt && getObjectFromHitmapIdAlt)) {
      console.error(
        "Possible wrong hitmap id mapping in the instanced rendering. Keep or remove both `getHitmapProps` and `getObjectFromHitmapId` props."
      );
    }
    // enable hitmap if any of the supported mouse event handlers exist in props
    const enableHitmap = getHitmapId || SUPPORTED_MOUSE_EVENTS.some((eventName) => eventName in rest);

    if (enableHitmap) {
      // TODO: deprecating, remove before 1.x release
      if (getHitmapId) {
        if (!warnedAboutDeprecatedGetHitmapId) {
          console.warn(
            `"getHitmapId" is deprecated. Check "${name}" to use default hitmap mapping or set the "getHitmapProps" and "getObjectFromHitmapId" props explicitly. `
          );
          warnedAboutDeprecatedGetHitmapId = true;
        }
        hitmapProps = defaultGetHitmapProps(getHitmapId, children);
        getObjectFromHitmapId = defaultGetObjectFromHitmapId;
      } else if (!getHitmapProps || !getObjectFromHitmapId) {
        hitmapProps = null;
        getObjectFromHitmapId = null;
        console.error(`Default hitmap for ${name} is not supported yet.`);
      } else if (getHitmapProps && getObjectFromHitmapId) {
        hitmapProps = getHitmapProps(children);
      }
    }

    return (
      <Command
        {...rest}
        reglCommand={command}
        drawProps={children}
        hitmapProps={hitmapProps}
        getObjectFromHitmapId={getObjectFromHitmapId}
      />
    );
  };

  cmd.displayName = name;
  cmd.reglCommand = command;
  return cmd;
}
