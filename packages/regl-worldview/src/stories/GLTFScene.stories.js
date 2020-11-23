//  Copyright (c) 2018-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { storiesOf } from "@storybook/react";
import React, { useState, useEffect } from "react";
import seedrandom from "seedrandom";

import Worldview, { Axes, GLTFScene } from "../index";
import duckModel from "common/fixtures/Duck.glb"; // Webpack magic: we actually import a URL pointing to a .glb file

storiesOf("Worldview/GLTFScene", module).add("<GLTFScene> - Load a scene from file", () => {
  const defaultMsg = "Click on any ducks";
  const [msg, setMsg] = useState(defaultMsg);
  const [seed, setSeed] = useState(0);

  const updateScene = () => {
    setSeed((seed) => seed + 1);
    setTimeout(updateScene, 60);
  };

  useEffect(() => {
    updateScene();
  }, []);

  const rng = seedrandom(seed); // pseudo-random generator for deterministic testing!
  const randomCoord = () => {
    return -10 + 20 * rng();
  };
  const duckMarkerIds = new Array(100).fill().map((_, idx) => 12323 + idx);
  const duckMarkers = duckMarkerIds.map((id, idx) => ({
    id,
    pose: {
      position: { x: randomCoord(), y: randomCoord(), z: randomCoord() },
      orientation: { x: 0, y: 0, z: 0, w: 1 },
    },
    scale: { x: 1, y: 1, z: 1 },
  }));

  return (
    <Worldview
      defaultCameraState={{
        distance: 30,
        thetaOffset: (-3 * Math.PI) / 4,
      }}
      onClick={(ev, { objects }) => {
        if (!objects[0] || !duckMarkerIds.includes(objects[0].object.id)) {
          setMsg(defaultMsg);
        }
      }}>
      <Axes />
      {duckMarkers.map((duckMarker) => (
        <GLTFScene
          key={duckMarker.id}
          onClick={(ev, { objects }) => {
            setMsg(`Clicked on the duck. objectId: ${objects[0].object.id}`);
          }}
          model={duckModel}>
          {duckMarker}
        </GLTFScene>
      ))}
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
        <div>{msg}</div>
      </div>
    </Worldview>
  );
});
