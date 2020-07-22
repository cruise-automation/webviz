export type RGBA = {
  // all values are scaled between 0-1 instead of 0-255
  r: number;
  g: number;
  b: number;
  a: number; // opacity -- typically you should set this to 1.
};

export type Header = {
  frame_id: string;
  stamp: Time;
  seq: number;
};

export type Point = {
  x: number;
  y: number;
  z: number;
};

export type Time = {
  sec: number;
  nsec: number;
};

export type Translation = {
  x: number;
  y: number;
  z: number;
};

export type Rotation = {
  x: number;
  y: number;
  z: number;
  w: number;
};

export type Pose = {
  position: Point;
  orientation: Quaternion;
};

export type Quaternion = {
  x: number;
  y: number;
  z: number;
  w: number;
};

export type Transform = {
  header: Header;
  child_frame_id: string;
  transform: {
    translation: Translation;
    rotation: Rotation;
  };
};

export type TwoDimensionalPlotLine = {
  order?: number;
  label: string;
  backgroundColor?: string;
  borderColor?: string;
  borderDash?: string;
  borderWidth?: number;
  pointBackgroundColor?: string;
  pointBorderColor?: string;
  pointBorderWidth?: number;
  pointRadius?: number;
  pointStyle?: string;
  lineTension?: number,
  data: { x: number; y: number }[];
};
/*
 * Use this type to plot values in the 2D Panel. If you need to change this
 * type, please ensure that is kept in sync with the TwoDimensionalPlot
 * counterpart.
 */
export type TwoDimensionalPlot = {
  lines: TwoDimensionalPlotLine[];
  points: TwoDimensionalPlotLine[];
  polygons: TwoDimensionalPlotLine[];
  title?: string;
  yAxisLabel?: string;
  xAxisLabel?: string;
  gridColor?: string
};
