import { Input, Messages } from "ros";
import { TwoDimensionalPlot, TwoDimensionalPlotLine } from "./types";

type GlobalVariables = { id: number };

export const inputs = [];
export const output = "/webviz_node/";

// Populate 'Input' with a parameter to properly type your inputs, e.g. 'Input<"/your_input_topic">'
const publisher = (message: Input<>, globalVars: GlobalVariables): TwoDimensionalPlot => {
  const lines: TwoDimensionalPlotLine[] = [];
  const points: TwoDimensionalPlotLine[] = [];
  const polygons: TwoDimensionalPlotLine[] = [];

  return {
    lines,
    points,
    polygons,
  };
};

export default publisher;
