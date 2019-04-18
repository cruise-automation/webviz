//  Copyright (c) 2019-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

// #BEGIN EXAMPLE
import React, { useState } from "react";
import Worldview, { Axes, GLTFScene, DEFAULT_CAMERA_STATE } from "regl-worldview";

import duckModel from "../utils/Duck.glb"; // URL pointing to a .glb file

// #BEGIN EDITABLE
function Example() {
  const defaultMsg = "Click on any ducks";
  const [msg, setMsg] = useState(defaultMsg);

  const duckMarkerIds = new Array(3).fill().map((_, idx) => 12323 + idx);
  const duckMarkers = duckMarkerIds.map((id, idx) => ({
    id,
    pose: {
      position: { x: idx, y: idx, z: 0 },
      orientation: { x: 0, y: 0, z: 0, w: 1 },
    },
    scale: { x: 1, y: 1, z: 1 },
  }));

  return (
    <Worldview
      defaultCameraState={{
        ...DEFAULT_CAMERA_STATE,
        distance: 15,
        thetaOffset: (-3 * Math.PI) / 4,
      }}
      onClick={(ev, { objectId }) => {
        if (!duckMarkerIds.includes(objectId)) {
          setMsg(defaultMsg);
        }
      }}>
      <Axes />
      {duckMarkers.map((duckMarker) => (
        <GLTFScene
          key={duckMarker.id}
          onClick={(ev, { object, objectId }) => {
            setMsg(`Clicked on the duck. objectId: ${objectId}`);
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
}
// #END EXAMPLE

export default Example;
