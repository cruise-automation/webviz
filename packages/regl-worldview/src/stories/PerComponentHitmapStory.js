import last from "lodash/last";
import remove from "lodash/remove";
import sample from "lodash/sample";
import React, { useState } from "react";

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

const createCube = (i) => {
  const marker = cube(0, i + 1);
  const { position: posePosition } = marker.pose;
  const color = [rng(), rng(), rng(), 1];
  const { x, y, z } = posePosition;
  const position = { x: x + i * 5, y: y + i * 5, z: z + i * 5 };
  return {
    ...marker,
    color,
    pose: {
      position,
      orientation: { x: 0, y: 0, z: 0, w: 1 },
    },
    index: i,
    cubeFact: sample(randomCubeFacts),
    mouseCursor: sample(randomMouseCursors),
  };
};

function PerCubeInteractions() {
  const [cubes, setCubes] = useState([createCube(0)]);
  const [cubeDetails, setCubeDetails] = useState({});
  const [cursor, setCursor] = useState("auto");

  function onContainerClick(e, args) {
    if (!args.clickedObjectId) {
      setCubeDetails({});
    }
  }

  function onContainerMouseMove(e, args) {
    if (!args.clickedObjectId) {
      setCursor("auto");
    }
  }

  function onCubeClick(e, { interactedObject }) {
    setCubeDetails(interactedObject);
  }

  function onCubeDoubleClick(id, { interactedObject }) {
    const newCubes = [...cubes];
    remove(newCubes, (cube) => cube.id === interactedObject.id);

    setCubes(newCubes);
  }

  function onCubeHover(e, { interactedObject }) {
    setCursor(interactedObject.mouseCursor);
  }

  return (
    <div style={{ cursor, width: "100%", height: "100%" }}>
      <Container
        hitmapOnMouseMove
        cameraState={DEFAULT_CAMERA_STATE}
        onClick={onContainerClick}
        onMouseMove={onContainerMouseMove}>
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
          <button onClick={() => setCubes([...cubes, createCube(last(cubes) ? last(cubes).index + 1 : 0)])}>
            Add Cube
          </button>
        </div>
        <Cubes
          onMouseMove={onCubeHover}
          onClick={onCubeClick}
          onDoubleClick={onCubeDoubleClick}
          getHitmapId={(marker) => marker.id}>
          {cubes}
        </Cubes>
      </Container>
    </div>
  );
}

export default PerCubeInteractions;
