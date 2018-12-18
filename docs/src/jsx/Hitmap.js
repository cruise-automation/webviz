//  Copyright (c) 2018-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import React, { useEffect, useState } from "react";

import { generateCubes, generateSpheres, lerp } from "./utils";
import { FloatingBox, StyledContainer } from "./WorldviewCodeEditor";
import Worldview, { Axes, Cubes, DEFAULT_CAMERA_STATE, Overlay, Spheres, getCSSColor } from "regl-worldview";

// #BEGIN EXAMPLE
function HitmapDemo() {
  const getHitmapId = (shape) => shape.hitmapId || 0;
  const [enableAutoRotate, setEnableAutoRotate] = useState(false);
  const [clickedIds, setClickedIds] = useState(new Set([7, 27]));
  const [cameraState, setCameraState] = useState({
    ...DEFAULT_CAMERA_STATE,
    distance: 145,
    phi: 1.22,
    perspective: true,
    thetaOffset: 0,
  });

  let intervalId;
  const objectMap = {};

  useEffect(() => {
    if (enableAutoRotate) {
      intervalId = setInterval(() => {
        const { thetaOffset: prevThetaOffset } = cameraState;
        let thetaOffset = prevThetaOffset;
        if (thetaOffset >= 6.1) {
          thetaOffset = 0;
        }
        thetaOffset = lerp(thetaOffset, 2 * Math.PI, 0.01);
        setCameraState({ ...cameraState, thetaOffset });
      }, 16.6);
      return function cleanup() {
        clearInterval(intervalId);
      };
    }
  });

  // Generate shapes and update the map
  const cubes = generateCubes(clickedIds);
  const spheres = generateSpheres(clickedIds, 10, cubes.length + 1);
  cubes.forEach((object) => {
    if (object.hitmapId) {
      objectMap[object.hitmapId] = { object, type: "cube" };
    }
  });

  spheres.forEach((object) => {
    if (object.hitmapId) {
      objectMap[object.hitmapId] = { object, type: "sphere" };
    }
  });

  const textMarkers = [];
  clickedIds.forEach((clickedId) => {
    const clickedObj = objectMap[clickedId];
    if (clickedObj) {
      const {
        object: {
          hitmapId,
          pose: { orientation, position },
          info,
          color,
        },
        type,
      } = clickedObj;
      let text = `hitmapId: ${hitmapId} x: ${position.x} y: ${position.y} z: ${position.z}`;
      if (info) {
        text += ` description: ${info.description} objectId:${info.objectId}`;
      }

      const id = textMarkers.length;
      textMarkers.push({
        id,
        text,
        color: { r: 1, g: 1, b: 1, a: 1 },
        pose: {
          orientation,
          position: { x: position.x + 2, y: position.y, z: position.z },
        },
        scale: { x: 1, y: 1, z: 1 },
        info: {
          title: type,
          color,
        },
      });
    }
  });

  return (
    <Worldview
      cameraState={cameraState}
      onCameraStateChange={(cameraState) => {
        if (!enableAutoRotate) {
          setCameraState(cameraState);
        }
      }}
      onClick={(e, arg) => {
        const clickedId = arg && arg.clickedObjectId;
        if (!clickedId) {
          return;
        }
        if (clickedIds.has(clickedId)) {
          clickedIds.delete(clickedId);
        } else {
          clickedIds.add(clickedId);
        }

        setClickedIds(clickedIds);
      }}>
      <FloatingBox>
        <div>{clickedIds.size === 0 && "click an object"}</div>
        <button style={{ marginBottom: 4 }} onClick={() => setEnableAutoRotate(!enableAutoRotate)}>
          {enableAutoRotate ? "Disable Auto Rotate" : "Enable Auto Rotate"}
        </button>
        {clickedIds.size > 0 && <button onClick={() => setClickedIds(new Set())}>Clear Text</button>}
      </FloatingBox>
      <Cubes getHitmapId={getHitmapId}>{cubes}</Cubes>
      <Spheres getHitmapId={getHitmapId}>{spheres}</Spheres>
      <Overlay
        renderItem={({ item, coordinates, dimension: { width, height } }) => {
          if (!coordinates) {
            return null;
          }
          const [left, top] = coordinates;
          if (left < -10 || top < -10 || left > width + 10 || top > height + 10) {
            return null; // Don't render anything that's too far outside of the canvas
          }

          const {
            text,
            info: { color, title },
          } = item;
          return (
            <StyledContainer
              key={item.id}
              style={{
                transform: `translate(${left.toFixed()}px,${top.toFixed()}px)`,
              }}>
              <h2 style={{ color: getCSSColor(color), fontSize: "2rem" }}>{title}</h2>
              <div>{text}</div>
              <a
                style={{ pointerEvents: "visible" }}
                href="https://google.com/"
                target="_blank"
                rel="noopener noreferrer">
                A custom link
              </a>
            </StyledContainer>
          );
        }}>
        {textMarkers}
      </Overlay>
      <Axes />
    </Worldview>
  );
}
// #END EXAMPLE
export default HitmapDemo;
