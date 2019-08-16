//  Copyright (c) 2018-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

// #BEGIN EXAMPLE
import React, { useState } from "react";
import Worldview, { Arrows, Axes } from "regl-worldview";

// #BEGIN EDITABLE
function Example() {
  const [clickedObj, setClickedObj] = useState(null);

  const poseArrow = {
    id: 1,
    pose: {
      orientation: { x: 0, y: 0, z: -1, w: 0.5 },
      position: { x: 0, y: 0, z: 0 },
    },
    scale: { x: 20, y: 3, z: 3 },
    color: { r: 1, g: 0, b: 1, a: 1 },
  };
  const pointArrow = {
    id: 2,
    color: { r: 1, g: 1, b: 1, a: 1 },
    points: [{ x: 0, y: 0, z: 0 }, { x: 10, y: 10, z: 10 }],
    scale: { x: 2, y: 2, z: 3 },
  };

  return (
    <Worldview
      onClick={(_, { objects }) => {
        if (!objects.length) {
          setClickedObj(null);
        }
      }}>
      <Arrows
        onClick={(ev, { objects }) => {
          setClickedObj(objects[0].object);
        }}>
        {[poseArrow, pointArrow]}
      </Arrows>
      <Axes />
      <div
        style={{
          position: "absolute",
          flexDirection: "column",
          left: 0,
          top: 0,
          width: 320,
          maxWidth: "100%",
          color: "white",
        }}>
        <div>{clickedObj ? "Clicked object details:" : "Click an object to see it's details"}</div>
        {clickedObj && <pre style={{ whiteSpace: "pre-wrap" }}>{JSON.stringify(clickedObj, null, 2)}</pre>}
      </div>
    </Worldview>
  );
}
// #END EXAMPLE

export default Example;
