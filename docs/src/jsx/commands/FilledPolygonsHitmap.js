//  Copyright (c) 2018-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

// #BEGIN EXAMPLE
import polygonGenerator from "polygon-generator";
import React, { useState } from "react";
import Worldview, { FilledPolygons, Axes } from "regl-worldview";

// #BEGIN EDITABLE
function Example() {
  const [clickedObj, setClickedObj] = useState(null);
  const randomPolygon = polygonGenerator.coordinates(5, 10, 30);

  const polygons = [
    {
      points: randomPolygon.map(({ x, y }) => ({ x, y, z: 0 })),
      color: { r: 1, g: 0, b: 1, a: 1 },
      id: 1,
    },
    {
      points: randomPolygon.map(({ x, y }) => ({ x: x - 20, y: y - 20, z: 0 })),
      color: { r: 1, g: 1, b: 1, a: 1 },
      id: 2,
    },
    {
      points: randomPolygon.map(({ x, y }) => ({ x, y: y - 20, z: 0 })),
      color: { r: 0, g: 0, b: 1, a: 1 },
      id: 3,
    },
    {
      points: randomPolygon.map(({ x, y }) => ({ x: x - 20, y, z: 0 })),
      color: { r: 0, g: 1, b: 1, a: 1 },
      id: 4,
    },
  ];
  return (
    <Worldview
      onClick={(_, { objects }) => {
        if (!objects.length) {
          setClickedObj(null);
        }
      }}>
      <FilledPolygons
        onClick={(ev, { objects }) => {
          setClickedObj(objects[0].object);
        }}>
        {polygons}
      </FilledPolygons>
      <Axes />
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          width: 320,
          maxWidth: "100%",
          color: "white",
          backgroundColor: "rgba(0, 0, 0, 0.5)",
        }}>
        {clickedObj ? <span>Clicked polygon id: {clickedObj.id}</span> : <span>Click any polygon</span>}
      </div>
    </Worldview>
  );
}
// #END EXAMPLE

export default Example;
