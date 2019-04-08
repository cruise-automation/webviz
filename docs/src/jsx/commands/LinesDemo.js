//  Copyright (c) 2018-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

// #BEGIN EXAMPLE
import React, { useState } from "react";
import Worldview, { Lines, Points, Axes } from "regl-worldview";
import seedrandom from "seedrandom";

import LineControls from "../utils/LineControls";

// #BEGIN EDITABLE
function Example() {
  const [debug, setDebug] = useState(false);
  const [thickness, setThickness] = useState(0.75);
  const [joined, setJoined] = useState(true);
  const [scaleInvariant, setScaleInvariant] = useState(false);
  const [closed, setClosed] = useState(false);
  const [monochrome, setMonochrome] = useState(false);
  const scale = { x: thickness };
  const SEED = 123;
  const rng = seedrandom(SEED);

  const randomColor = () => {
    return { r: rng(), g: rng(), b: rng(), a: 1 };
  };

  const points = [
    [0, 0, 0],
    [0, 3, 0],
    [3, 3, 0],
    [3, 0, 0],
    [0, 0, 0],
    [0, 0, 3],
    [0, 3, 3],
    [3, 3, 3],
    [3, 0, 3],
    [0, 0, 3],
  ];
  for (let i = 0; i < 10; i++) {
    points.push([5 + 1.5 * Math.sin((Math.PI * 2 * i) / 10), i, 6]);
  }
  for (let i = 20; i >= 0; i--) {
    points.push([5 + 1.5 * Math.sin((Math.PI * 2 * i) / 20), i * 0.5, 2]);
  }
  for (let i = 0; i < 20; i++) {
    points.push([5, i * 0.7, 4]);
  }
  points.push([0, 0, -6], [0, 5, -6]);
  const pose = {
    position: { x: 0, y: 0, z: 0 },
    orientation: { x: 0, y: 0, z: 0, w: 1 },
  };

  const sharedProps = {
    primitive: joined ? "line strip" : "lines",
    scale,
    closed,
    scaleInvariant,
  };
  const markers = [
    {
      ...sharedProps,
      pose,
      points,
    },
    {
      ...sharedProps,
      pose,
      points: [[-4, 0, 0], [-4, -4, 0], [-8, -3, 2], [-4, 0, 0]],
    },
    {
      ...sharedProps,
      pose,
      points: [[-4, 0, 0], [-4, 0, -4], [-6, 0, -6]],
    },
  ];

  // collect points in order to draw debug markers
  const pts = [];
  markers.forEach((marker) => {
    marker.debug = debug;
    if (monochrome) {
      marker.color = randomColor();
    } else {
      marker.colors = marker.points.map((p) => randomColor());
    }
    marker.points.forEach((point) => pts.push(point));
  });

  return (
    <Worldview>
      <LineControls
        style={{
          position: "absolute",
          top: 0,
          right: 0,
          width: 200,
          display: "flex",
          flexDirection: "column",
        }}
        thickness={thickness}
        setThickness={setThickness}
        debug={debug}
        setDebug={setDebug}
        joined={joined}
        setJoined={setJoined}
        scaleInvariant={scaleInvariant}
        setScaleInvariant={setScaleInvariant}
        closed={closed}
        setClosed={setClosed}
        monochrome={monochrome}
        setMonochrome={setMonochrome}
      />
      <Lines>{markers}</Lines>
      {debug && (
        <Points>
          {[
            {
              points: [{ x: 0, y: 0, z: 0 }],
              scale: { x: 3, y: 3, z: 3 },
              color: { r: 0, g: 1, b: 0, a: 1 },
              pose,
            },
            {
              points: pts,
              scale: { x: 3, y: 3, z: 3 },
              color: { r: 1, g: 1, b: 1, a: 1 },
              pose,
            },
          ]}
        </Points>
      )}
      <Axes />
    </Worldview>
  );
}
// #END EXAMPLE

export default Example;
