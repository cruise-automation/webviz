// @flow

//  Copyright (c) 2018-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.
import type { CameraState } from "../camera/CameraStore";
import { Ray } from "../utils/Raycast";
import type { BaseProps, Props } from "../Worldview";

export type { CameraState, BaseProps, Props };

export type Dimensions = {|
  width: number,
  height: number,
  left: number,
  top: number,
|};

export type ReglCommand = {
  vert: string,
  frag: string,
  uniforms?: any,
};

export type CompiledReglCommand<T> = (props: T, context: any) => void;

export type ReglFn = <T>(ReglCommand) => CompiledReglCommand<T>;

type Command<T> = (T | T[], ...args: any[]) => void;

export type RawCommand<T> = (regl: any) => {} | Command<T>;

export type Regl = {
  // https://github.com/gajus/eslint-plugin-flowtype/issues/346
  // eslint-disable-next-line no-undef
  [[call]]: ReglFn,
  limits: {
    pointSizeDims: [number, number],
  },
  prop: (string) => any,
};

export type CommandProps = {
  [string]: any,
};

export type CommandDict = {
  [string]: Command<any>,
};

// [left, top, width, height]
export type Viewport = [number, number, number, number];
export type Vec2 = [number, number];
export type Vec3 = [number, number, number];
export type Vec4 = [number, number, number, number];
export type Mat4 = [
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
];

export interface CameraCommand {
  getProjection(): Mat4;
  getView(): Mat4;
  toScreenCoord(viewport: Viewport, point: Vec3): ?Vec3;
  draw(props: {}, (ctx: any) => void): void;
}

export type ReglContext = {
  regl: ReglFn,
  camera: CameraCommand,
  commands: CommandDict,
};

export type ArrowSize = {
  shaftLength: number,
  shaftWidth: number,
  headLength: number,
  headWidth: number,
};

export type ReglClickInfo = {
  ray: Ray,
  object?: Object,
  instanceIndex?: ?number,
};

export type ComponentReglClickInfo = {
  ray: Ray,
  object: Object,
  instanceIndex?: ?number,
};

export type MouseHandler = (MouseEvent, ReglClickInfo) => void;

export type ComponentMouseHandler = (MouseEvent, ComponentReglClickInfo) => void;

export type Coordinate = [number, number];

export type Point = {
  x: number,
  y: number,
  z: number,
};

export type Position = Point;

export type Orientation = {
  x: number,
  y: number,
  z: number,
  w: number,
};

export type Scale = {
  x: number,
  y: number,
  z: number,
};

export type Color = {
  r: number,
  g: number,
  b: number,
  a: number,
};

export type Colors = Color[];

export type Pose = {
  position: Position,
  orientation: Orientation,
};

export type BaseShape = {
  pose: Pose,
  scale: Scale,
  color: Color | Vec4,
};

export type Arrow = BaseShape & {
  points?: Point[],
};

export type Cube = BaseShape & {
  colors?: Color[],
};

export type Cylinder = BaseShape;

export type Line = BaseShape & {
  points: Point[] | Vec3[],
};

export type PointType = BaseShape & {
  points: (Point[] | Vec3)[],
};

export type SphereList = BaseShape & {
  points?: Point[],
};

export type TriangleList = BaseShape & {
  points: Point[],
  colors?: Color[],
};

export type PolygonType = BaseShape & {
  points: (Point | Vec3)[],
};

export type MouseEventObject = {
  object: ?BaseShape,
  instanceIndex: ?number,
};

export type HitmapId = number;
/*
 * type: "instanced" if mapping multiple IDs to a single callback object, "single" if 1:1.
 * callbackObject: the object to pass to event callbacks when this object is interacted with.
 * count: If "instanced", how many IDs to map to the callback object.
 * return type: an array of the IDs assigned.
 */
export type CommandBoundAssignNextIds = (
  { type: "single", callbackObject: BaseShape } | { type: "instanced", callbackObject: BaseShape, count: number }
) => Array<HitmapId>;
export type GetHitmap = <T>(prop: T, CommandBoundAssignNextIds, Array<MouseEventObject>) => T;
export type GetActive = <T>(prop: T) => T;

export type MouseEventEnum = "onClick" | "onMouseUp" | "onMouseMove" | "onMouseDown" | "onDoubleClick";

export type CameraAction =
  | "moveDown"
  | "moveLeft"
  | "moveRight"
  | "moveUp"
  | "rotateLeft"
  | "rotateRight"
  | "tiltDown"
  | "tiltUp"
  | "zoomIn"
  | "zoomOut";
export type CameraKeyMap = { [string]: CameraAction | false | null };
