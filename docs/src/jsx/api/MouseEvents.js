//  Copyright (c) 2018-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

// #BEGIN EXAMPLE
import last from "lodash/last";
import remove from "lodash/remove";
import sample from "lodash/sample";
import React, { useState } from "react";
import Worldview, { Cubes } from "regl-worldview";
import seedrandom from "seedrandom";

// #BEGIN EDITABLE
function Example() {
  const SEED = 555;
  const rng = seedrandom(SEED);
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

  const [cubes, setCubes] = useState([createCube(0)]);
  const [cubeDetails, setCubeDetails] = useState({});
  const [cursor, setCursor] = useState("auto");

  function cube(range, id) {
    const marker = {
      id,
      pose: {
        orientation: { x: 0, y: 0, z: 0, w: 0 },
        position: { x: range, y: range, z: range },
      },
      scale: { x: 5, y: 5, z: 5 },
      color: { r: 1, g: 0, b: 1, a: 1 },
    };
    return marker;
  }

  function createCube(i) {
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
  }

  function onContainerClick(e, { objects }) {
    if (!objects.length) {
      setCubeDetails({});
    }
  }

  function onContainerMouseMove(e, { objects }) {
    if (!objects.length) {
      setCursor("auto");
    }
  }

  function onCubeClick(e, { objects }) {
    setCubeDetails(objects[0].object);
  }

  function onCubeDoubleClick(id, { objects }) {
    const newCubes = [...cubes];
    remove(newCubes, (cube) => cube.id === objects[0].object.id);

    setCubes(newCubes);
  }

  function onCubeHover(e, { objects }) {
    setCursor(objects[0].object.mouseCursor);
  }

  return (
    <div style={{ cursor, height: 800 }}>
      <Worldview hitmapOnMouseMove onClick={onContainerClick} onMouseMove={onContainerMouseMove}>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            color: "white",
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
          <div style={{ margin: "5px 0" }}>you clicked on cube:</div>
          <pre style={{ whiteSpace: "pre-wrap" }}>{JSON.stringify(cubeDetails, null, 2)}</pre>{" "}
          <button onClick={() => setCubes([...cubes, createCube(last(cubes) ? last(cubes).index + 1 : 0)])}>
            Add Cube
          </button>
        </div>
        <Cubes onMouseMove={onCubeHover} onClick={onCubeClick} onDoubleClick={onCubeDoubleClick}>
          {cubes}
        </Cubes>
      </Worldview>
    </div>
  );
}
// #END EXAMPLE

export default Example;
