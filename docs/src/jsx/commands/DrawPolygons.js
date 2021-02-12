//  Copyright (c) 2018-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

// #BEGIN EXAMPLE
import React from "react";
import Worldview, { PolygonBuilder, DrawPolygons } from "regl-worldview";

// #BEGIN EDITABLE
class Example extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      polygonBuilder: new PolygonBuilder(),
      cameraState: {
        perspective: false,
        distance: 10,
        thetaOffset: 0.3,
        phi: 0.85,
        target: [0, 0, 0],
        targetOrientation: [0, 0, 0, 1],
        targetOffset: [0, 0, 0],
      },
    };

    this._handleEvent = (eventName, ev, args) => {
      this.state.polygonBuilder[eventName](ev, args);
      this.forceUpdate();
    };

    this.onDoubleClick = (ev, args) => {
      this._handleEvent("onDoubleClick", ev, args);
    };
    this.onMouseDown = (ev, args) => {
      this._handleEvent("onMouseDown", ev, args);
    };
    this.onMouseMove = (ev, args) => {
      this._handleEvent("onMouseMove", ev, args);
    };
    this.onMouseUp = (ev, args) => {
      this._handleEvent("onMouseUp", ev, args);
    };
  }

  render() {
    let message = "Ctrl-click to start drawing a polygon, or click on one to select it";
    if (this.state.polygonBuilder.activePolygon) {
      if (this.state.polygonBuilder.isActivePolygonClosed()) {
        message =
          "Click outside the polygon to de-select it, click and drag a point to move it, double click a point to remove it, or double click on a line to add a point.";
      } else {
        message = "Ctrl-click to add a point, or click to end drawing the polygon";
      }
    }

    return (
      <Worldview
        onDoubleClick={this.onDoubleClick}
        onMouseDown={this.onMouseDown}
        onMouseMove={this.onMouseMove}
        onMouseUp={this.onMouseUp}
        onClick={this.onClick}
        cameraState={this.state.cameraState}
        onCameraStateChange={(cameraState) => this.setState({ cameraState })}>
        <DrawPolygons>{this.state.polygonBuilder.polygons}</DrawPolygons>
        <div
          style={{
            position: "absolute",
            display: "flex",
            flexDirection: "column",
            padding: 8,
            left: 0,
            top: 0,
            right: 0,
            maxWidth: "100%",
            color: "white",
            backgroundColor: "rgba(0, 0, 0, 0.5)",
          }}>
          {message}
        </div>
      </Worldview>
    );
  }
}
// #END EXAMPLE

export default Example;
