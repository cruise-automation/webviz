//  Copyright (c) 2018-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

// #BEGIN EXAMPLE
import React, { useState } from "react";
import Worldview, { Lines } from "regl-worldview";

import LinesWithClickableInterior from "../utils/LinesWithClickableInterior";

// #BEGIN EDITABLE
function Example() {
  const defaultMsg = "Click on top of the green lines or inside the red area.";
  const [msg, setMsg] = useState(defaultMsg);

  const points = [{ x: 0, y: 0, z: 2 }, { x: 0, y: 3, z: 2 }, { x: 3, y: 3, z: 2 }, { x: 3, y: 0, z: 2 }];
  const lines = [
    {
      id: 191,
      closed: true,
      primitive: "line strip",
      pose: {
        position: { x: 0, y: 0, z: 0 },
        orientation: { x: 0, y: 0, z: 0, w: 0 },
      },
      scale: { x: 0.1, y: 0.1, z: 0.1 },
      color: { r: 0, g: 1, b: 0, a: 1 },
      points,
    },
  ];

  return (
    <Worldview
      onClick={(ev, { objects }) => {
        if (!objects.length) {
          setMsg(defaultMsg);
        }
      }}
      defaultCameraState={{ distance: 10 }}>
      <Lines
        onClick={(ev, { objects }) => {
          setMsg(`Clicked on the lines. objectId: ${objects[0].object.id}`);
        }}>
        {lines}
      </Lines>
      <LinesWithClickableInterior
        onClick={(ev, { objects }) => {
          setMsg(`Clicked on the interior of the lines. objectId: ${objects[0].object.id}`);
        }}
        enableClickableInterior
        showBorder
        fillColor={{ r: 1, g: 0, b: 0, a: 0.2 }}>
        {[
          {
            ...lines[0],
            id: 200,
            color: { r: 1, g: 0, b: 0, a: 1 },
            points: points.map(({ x, y, z }) => ({ x: x - 1, y: y - 1, z: z - 1 })),
          },
        ]}
      </LinesWithClickableInterior>
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
