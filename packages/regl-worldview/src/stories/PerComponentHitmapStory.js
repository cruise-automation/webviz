import last from "lodash/last";
import remove from "lodash/remove";
import sample from "lodash/sample";
import React from "react";

import Container from "./Container";
import { cube, rng } from "./util";

import { Cubes, DEFAULT_CAMERA_STATE } from "..";

const randomCubeFacts = [
  "A cube is a three dimensional shape",
  "A cube has 6 square faces.",
  "A cube has the largest volume of all cuboids with a certain surface area",
  "All the matter that makes up the human race could fit in a sugar cube",
  "There are 43,252,003,274,489,856,000 possible permutations of the Rubik's Cube",
  "Ice Cube was the only member of NWA not born in Compton",
  "Wombats have cube-shaped poop",
];

const randomMouseCursors = ["progress", "wait", "crosshair", "text", "move", "grab", "ew-resize", "ns-resize"];

const getCube = (marker, position, color) => ({
  ...marker,
  color,
  pose: {
    orientation: { x: 0, y: 0, z: 0, w: 1 },
    position,
  },
});

class PerCubeInteractions extends React.Component<any, any> {
  constructor() {
    super();
    this.state = { cubes: [this.createCube(0)], cubeDetails: {}, cursor: "auto" };
  }

  onContainerClick = (e, args) => {
    if (!args.clickedObjectId) {
      this.setState({ cubeDetails: {} });
    }
  };

  onContainerMouseMove = (e, args) => {
    if (!args.clickedObjectId) {
      this.setState({ cursor: "auto" });
    }
  };

  onCubeClick = (id, ray, event, clickedObject) => this.setState({ cubeDetails: clickedObject });

  onCubeDoubleClick = (id, ray, event, clickedObject) => {
    const newCubes = [...this.state.cubes];
    remove(newCubes, (cube) => cube.id === clickedObject.id);
    this.setState({ cubes: newCubes });
  };

  onCubeHover = (id, ray, event, hoveredObject) => this.setState({ cursor: hoveredObject.mouseCursor });

  createCube = (i) => {
    const marker = cube(0, i + 1);
    const { position: posePosition } = marker.pose;
    const color = [rng(), rng(), rng(), 1];
    const { x, y, z } = posePosition;
    const position = { x: x + i * 5, y: y + i * 5, z: z + i * 5 };
    return {
      ...getCube(marker, position, color),
      cubeFact: sample(randomCubeFacts),
      mouseCursor: sample(randomMouseCursors),
      index: i,
    };
  };

  render() {
    const { cubes, cubeDetails, cursor } = this.state;

    return (
      <div style={{ cursor, width: "100%", height: "100%" }}>
        <Container
          hitmapOnMouseMove
          cameraState={DEFAULT_CAMERA_STATE}
          onClick={this.onContainerClick}
          onMouseMove={this.onContainerMouseMove}>
          <div
            style={{
              position: "absolute",
              padding: "5px",
              top: 30,
              left: 30,
              width: "400px",
              backgroundColor: "rgba(165, 94, 255, 0.1)",
            }}>
            <div>click on a cube to see its details</div>
            <div>double click on a cube to remove it</div>
            <br />
            <div style={{ margin: "5px 0" }}>
              you clicked on cube: <pre style={{ whiteSpace: "pre-wrap" }}>{JSON.stringify(cubeDetails, null, 2)}</pre>{" "}
            </div>
            <button onClick={() => this.setState({ cubes: [...cubes, this.createCube(last(cubes).index + 1)] })}>
              Add Cube
            </button>
          </div>
          <Cubes
            onMouseMove={this.onCubeHover}
            onClick={this.onCubeClick}
            onDoubleClick={this.onCubeDoubleClick}
            getHitmapId={(marker) => marker.id}>
            {cubes}
          </Cubes>
        </Container>
      </div>
    );
  }
}

export default PerCubeInteractions;
