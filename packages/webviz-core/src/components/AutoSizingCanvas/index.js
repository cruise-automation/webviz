// @flow
//
//  Copyright (c) 2018-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import * as React from "react";
import Dimensions from "react-container-dimensions";

type Draw = (context: CanvasRenderingContext2D, width: number, height: number) => void;

type CanvasProps = {
  draw: Draw,
  width: number,
  height: number,
};

type AutoSizingCanvasProps = {
  draw: Draw,
};

// Nested within `AutoSizingCanvas` so that componentDidUpdate fires on width/height changes.
// Adding a hook into the 'react-container-dimensions' project on resize changes might be a good improvement!
class Canvas extends React.Component<CanvasProps> {
  canvas = React.createRef<HTMLCanvasElement>();

  _draw(context) {
    const { width, height } = this.props;
    this.props.draw(context, width, height);
  }

  componentDidMount() {
    const canvas = this.canvas.current;
    if (!canvas) {
      return;
    }
    this._draw(canvas.getContext("2d"));
  }

  componentDidUpdate() {
    const canvas = this.canvas.current;
    if (!canvas) {
      return;
    }
    const context = canvas.getContext("2d");
    const RATIO = window.devicePixelRatio;

    // Fix blurry text, can also use scale with context save & restore
    context.setTransform(RATIO, 0, 0, RATIO, 0, 0);
    this._draw(context);
  }

  render() {
    const { width, height } = this.props;
    const RATIO = window.devicePixelRatio;

    // Must set canvas width, height, style width and style height to avoid blurry text
    return (
      <canvas
        ref={this.canvas}
        width={width * RATIO}
        height={height * RATIO}
        style={{
          width,
          height,
        }}
      />
    );
  }
}

const AutoSizingCanvas = ({ draw }: AutoSizingCanvasProps) => (
  <Dimensions>{({ width, height }) => <Canvas width={width} height={height} draw={draw} />}</Dimensions>
);

export default AutoSizingCanvas;
