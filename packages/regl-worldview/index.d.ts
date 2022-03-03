import { $Shape, $Diff } from "utility-types";
import * as REGL from "regl";
import { Regl } from "regl";

export class Ray {
  origin: Vec3;
  dir: Vec3;
  point: Vec3;

  constructor(origin: Vec3, dir: Vec3, point: Vec3);
  distanceToPoint(point: Vec3): number;
  planeIntersection(planeCoordinate: Vec3, planeNormal: Vec3): Vec3 | null | undefined;
}

export type CameraState = {
  distance: number;
  perspective: boolean;
  phi: number;
  target: Vec3;
  targetOffset: Vec3;
  targetOrientation: Vec4;
  thetaOffset: number;
  fovy: number;
  near: number;
  far: number;
};

export const DEFAULT_CAMERA_STATE: CameraState;

export type Dimensions = {
  width: number;
  height: number;
  left: number;
  top: number;
};

export type ReglBuffer = any;

export type ReglFBOFn = (
  regl: Regl,
  source: ReglBuffer,
  destination: ReglBuffer | null | undefined
) => (width: number, height: number) => void;

// Unused ??
export type CompiledReglCommand<T> = (props: T, context: any) => void;
export type ReglFn = <T>(arg0: ReglCommand) => CompiledReglCommand<T>;
////////////

export type CompiledCommand<T> = (T) => void;
export type RawCommand<T> = (regl: Regl) => CompiledCommand<T>;

export type CommandProps = Record<string, any>;
export type CommandDict = Record<string, CompiledCommand<any>>;

// [left, top, width, height]
export type Vec2 = [number, number];
export type Vec3 = [number, number, number];
export type Vec4 = [number, number, number, number];
export type Viewport = Vec4;
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
  number
];

export interface CameraCommand {
  getProjection(): Mat4;
  getView(): Mat4;
  toScreenCoord(
    viewport: Viewport,
    point: Vec3,
    cameraProjection: Mat4 | null | undefined,
    cameraView: Mat4 | null | undefined
  ): Vec3 | null | undefined;
  draw(props: {}, arg1: (ctx: any) => void): void;
}

export type ReglContext = {
  regl: ReglFn;
  camera: CameraCommand;
  commands: CommandDict;
};

export type ArrowSize = {
  shaftLength: number;
  shaftWidth: number;
  headLength: number;
  headWidth: number;
};
type ClickedObject = {
  object: Record<string, any>;
  instanceIndex?: number | null | undefined;
};
export type ReglClickInfo = {
  ray: Ray;
  objects: Array<ClickedObject>;
};
export type ComponentReglClickInfo = {
  ray: Ray;
  objects: Array<ClickedObject>;
};
export type MouseHandler = (arg0: React.MouseEvent<HTMLCanvasElement>, arg1: ReglClickInfo) => void;
export type ComponentMouseHandler = (arg0: React.MouseEvent<HTMLCanvasElement>, arg1: ComponentReglClickInfo) => void;
export type Coordinate = [number, number];
export type Point = {
  x: number;
  y: number;
  z: number;
};
export type Position = Point;
export type Orientation = {
  x: number;
  y: number;
  z: number;
  w: number;
};
export type Scale = {
  x: number;
  y: number;
  z: number;
};
export type Color = {
  r: number;
  g: number;
  b: number;
  a: number;
};
export type Pose = {
  position: Position;
  orientation: Orientation;
};
export type BaseShape = {
  id?: string | number;
  frame_id?: string;
  pose: Pose;
  scale: Scale;
  color?: Color;
};
type Points = Point[];
export type Arrow = BaseShape & {
  points?: Points;
  interactionData?: any;
};
export type Cube = BaseShape & {
  colors?: Color[];
  points?: Points;
};
export type Cone = BaseShape & {
  colors?: Color[];
  points?: Points;
};
export type Cylinder = BaseShape & {
  colors?: Color[];
  points?: Points;
};
export type Line = BaseShape & {
  primitive?: REGL.PrimitiveType;
  points: Points;
  poses?: Pose[];
};
export type PointType = BaseShape & {
  colors?: Color[];
  points?: Points;
};
export type SphereList = BaseShape & {
  points?: Points;
};
export type TriangleList = BaseShape & {
  points?: Points;
  colors?: Color[];
  // Pass true to not render the triangles to the screen - just the hitmap.
  onlyRenderInHitmap?: boolean;
};
export type PolygonType = BaseShape & {
  points?: Points;
};
export type MouseEventObject = {
  object: BaseShape;
  instanceIndex: number | null | undefined;
};
export type DepthState = {
  enable?: boolean;
  mask?: boolean;
};
export type BlendFuncValue = string | number;
export type BlendState = {
  enable?: boolean;
  func?:
    | BlendFuncValue
    | {
        src?: BlendFuncValue;
        dst?: BlendFuncValue;
        srcAlpha?: BlendFuncValue;
        srcRGB?: BlendFuncValue;
        dstRGB?: BlendFuncValue;
        dstAlpha?: BlendFuncValue;
      };
  equation?:
    | string
    | {
        rgb: string;
        alpha: string;
      };
  color?: Vec4;
};
export type ObjectHitmapId = number;

/*
 * object: the object to pass to event callbacks when this object is interacted with.
 * count: How many colors to map to the callback object. If this is greater than 1, this assigns instance indices for
          the object.
 * return type: an array of the colors assigned.
 */
export type AssignNextColorsFn = (object: Record<string, any>, count: number) => Vec4[];
export type GetChildrenForHitmap = <T>(prop: T, arg1: AssignNextColorsFn, arg2: MouseEventObject[]) => T;
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
export type CameraKeyMap = Record<string, CameraAction | false | null>;

export type BaseProps = Dimensions & {
  keyMap?: CameraKeyMap;
  shiftKeys: boolean;
  useFrames?: boolean;
  backgroundColor?: Vec4;
  // (Deprecated) rendering the hitmap on mouse move is expensive, so disable it by default
  hitmapOnMouseMove?: boolean;
  // Disable hitmap generation for specific mouse events
  // For example, if you want to disable hitmap generating on drag, use: ["onMouseDown", "onMouseMove", "onMouseUp"]
  disableHitmapForEvents?: MouseEventEnum[];
  // getting events for objects stacked on top of each other is expensive, so disable it by default
  enableStackedObjectEvents?: boolean;
  // allow users to specify the max stacked object count
  maxStackedObjectCount: number;
  showDebug?: boolean;
  children?: React.ReactNode;
  style: Record<string, number | string>;
  cameraState?: $Shape<CameraState>;
  onCameraStateChange?: (arg0: CameraState) => void;
  defaultCameraState?: $Shape<CameraState>;
  // Pass in custom camera matrices
  cameraView?: Mat4;
  cameraProjection?: Mat4;
  // FBO passes
  fboCommand?: ReglFBOFn;
  // interactions
  onDoubleClick?: MouseHandler;
  onMouseDown?: MouseHandler;
  onMouseUp?: MouseHandler;
  onMouseMove?: MouseHandler;
  onClick?: MouseHandler;
  // Used to scale the canvas resolution and provide a higher image quality
  resolutionScale?: number;
  // Context attributes passed into canvas.getContext.
  contextAttributes?: Record<string, any> | null | undefined;
  canvas?: HTMLCanvasElement;
};

export type Props = $Diff<
  JSX.LibraryManagedAttributes<typeof WorldviewBase, React.ComponentProps<typeof WorldviewBase>>,
  Dimensions
>;
export declare function shouldConvert(point: Point | Vec4): boolean;
export declare function pointToVec3(point: Point): Vec3;
export declare function withPose<A, B, C, D, E>(
  drawConfig: REGL.DrawConfig<A, B, C, D, E>
): REGL.DrawConfig<A, B, C, D, E>;

export declare class Command<T> extends React.PureComponent<{
  reglCommand: RawCommand<T>;
  layerIndex?: number;
  drawProps?: T;
  children?: T;
}> {
  render(): JSX.Element;
}
export declare type TextMarker = {
  name?: string;
  pose: Pose;
  scale: Scale;
  color?: Color | Vec4;
  colors?: (Color | Vec4)[];
  text: string;
};

type ShapeComponent<T> = React.ComponentType<{
  children: T[];
}>;
export declare const Arrows: ShapeComponent<Arrow>;
export declare const Cubes: React.ComponentType<{
  children: Cube[];
  onMouseMove?: MouseHandler;
}>;
export declare const Cylinders: ShapeComponent<Cylinder>;
export declare const Axes: React.ComponentType<{}>;
export declare const Lines: ShapeComponent<Line>;
export declare const Spheres: ShapeComponent<Sphere>;
export declare const Triangles: ShapeComponent<Triangle>;
export declare const Points: React.ComponentType<{
  children: PointType[];
  useWorldSpaceSize: boolean;
}>;
export declare const Grid: React.ComponentType<{
  count: number;
  size: number;
}>;
export declare const Text: React.ComponentType<{
  children: TextMarker[];
  autoBackgroundColor?: boolean;
}>;
export declare const GLText: React.ComponentType<{
  children: TextMarker[];
  autoBackgroundColor?: boolean;
}>;
export declare const GLTFScene: React.ComponentType<{
  model: string | ((arg0: string) => Promise<GLBModel>);
  onClick?: MouseHandler;
  onDoubleClick?: MouseHandler;
  onMouseDown?: MouseHandler;
  onMouseMove?: MouseHandler;
  onMouseUp?: MouseHandler;
  children: {
    pose?: Pose;
    poseMatrix?: Mat4;
    scale: Scale;
    alpha?: ?number;
    localTransform?: Mat4;
    color?: Color | Vec4;
  };
}>;

declare const Worldview: React.ComponentType<{
  keyMap?: CameraKeyMap;
  shiftKeys?: boolean;
  useFrames?: boolean;
  backgroundColor?: Vec4;
  // (Deprecated) rendering the hitmap on mouse move is expensive, so disable it by default
  hitmapOnMouseMove?: boolean;
  // Disable hitmap generation for specific mouse events
  // For example, if you want to disable hitmap generating on drag, use: ["onMouseDown", "onMouseMove", "onMouseUp"]
  disableHitmapForEvents?: MouseEventEnum[];
  // getting events for objects stacked on top of each other is expensive, so disable it by default
  enableStackedObjectEvents?: boolean;
  // allow users to specify the max stacked object count
  maxStackedObjectCount?: number;
  showDebug?: boolean;
  children?: React.Node;
  style?: { [styleAttribute: string]: number | string };

  cameraState?: $Shape<CameraState>;
  onCameraStateChange?: (CameraState) => void;
  defaultCameraState?: $Shape<CameraState>;

  // Pass in custom camera matrices
  cameraView?: Mat4;
  cameraProjection?: Mat4;

  // FBO passes
  fboCommand?: ReglFBOFn;

  // interactions
  onDoubleClick?: MouseHandler;
  onMouseDown?: MouseHandler;
  onMouseUp?: MouseHandler;
  onMouseMove?: MouseHandler;
  onClick?: MouseHandler;

  // Used to scale the canvas resolution and provide a higher image quality
  resolutionScale?: number;

  // Context attributes passed into canvas.getContext.
  contextAttributes?: ?Record<string, any>;
  canvas?: HTMLCanvasElement;
}>;
export default Worldview;

export declare const defaultBlend: REGL.BlendingOptions;
export declare const defaultDepth: REGL.DepthTestOptions;
export declare const defaultReglDepth: REGL.BlendingOptions;
export declare const defaultReglBlend: REGL.BlendingOptions;
export declare function toRGBA(color: Color): Vec4;
export declare function vec4ToOrientation(point: Vec4): Orientation;
export declare function orientationToVec4(point: Orientation): Vec4;
export declare function vec3ToPoint(point: Vec3): Point;
export declare function vec4ToRGBA(point: Vec4): Color;
export declare function fromGeometry(
  positions: Vec3[],
  elements: Vec3[]
): RawCommand<{
  color?: Vec4;
}>;
