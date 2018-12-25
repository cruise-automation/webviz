//  Copyright (c) 2018-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

// #BEGIN EXAMPLE
import React, { useEffect, useState } from "react";
import styled from "styled-components";

import Worldview, { Axes, Cubes, DEFAULT_CAMERA_STATE, Overlay, Spheres, getCSSColor } from "regl-worldview";

const StyledContainer = styled.div`
  position: absolute;
  white-space: nowrap;
  z-index: 100;
  pointer-events: none;
  top: 0;
  left: 0;
  will-change: transform;
  padding: 0.8rem;
  background: #24bbcaa3;
  max-width: 240px;
  color: #fff;
  white-space: pre-line;
  > div {
    position: relative;
    white-space: pre-line;
  }
`;

// #BEGIN EDITABLE
function HitmapDemo() {
  const getHitmapId = (shape) => shape.hitmapId || 0;
  const lerp = (start, end, amt) => {
    return (1 - amt) * start + amt * end;
  };
  const numberToColor = (number, max, a = 1) => {
    const i = (number * 255) / max;
    const r = Math.round(Math.sin(0.024 * i + 0) * 127 + 128) / 255;
    const g = Math.round(Math.sin(0.024 * i + 2) * 127 + 128) / 255;
    const b = Math.round(Math.sin(0.024 * i + 4) * 127 + 128) / 255;
    return { r, g, b, a };
  };

  const [enableAutoRotate, setEnableAutoRotate] = useState(false);
  const [clickedIds, setClickedIds] = useState(new Set([7, 27]));
  const [cameraState, setCameraState] = useState({
    ...DEFAULT_CAMERA_STATE,
    distance: 145,
    phi: 1.22,
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
  const count = 20;
  const cubeGap = 5;

  // generate cubes
  let hitmapIdCounter = 1;
  const cubes = new Array(count).fill(0).map((_, idx) => {
    const totalLen = count * cubeGap;
    const posX = -totalLen / 2 + idx * cubeGap;
    const posY = Math.sin(posX) * 30;
    const posZ = Math.cos(posX) * 20;
    const hitmapId = hitmapIdCounter++;
    const isClicked = clickedIds.has(hitmapId);
    const scale = isClicked ? { x: 10, y: 10, z: 10 } : { x: 5, y: 5, z: 5 };
    const alpha = isClicked ? 1 : 0.2 + idx / count;
    return {
      hitmapId,
      pose: {
        orientation: { x: 0, y: 0, z: 0, w: 1 },
        position: { x: posX, y: posY, z: posZ },
      },
      scale,
      color: numberToColor(idx, count, alpha),
      info: {
        description: "additional cube info",
        objectId: hitmapId + 10000,
      },
    };
  });

  // generate spheres
  const spheres = new Array(count).fill(0).map((_, idx) => {
    const totalLen = count * cubeGap * 1.1;
    const posX = -totalLen / 2 + idx * cubeGap * 1.1;
    const posY = -Math.sin(posX) * 30;
    const posZ = -Math.cos(posX) * 20;

    const hitmapId = hitmapIdCounter++;
    const isClicked = clickedIds.has(hitmapId);
    const scale = isClicked ? { x: 10, y: 10, z: 10 } : { x: 5, y: 5, z: 5 };
    const alpha = isClicked ? 1 : 0.2 + idx / count;
    return {
      hitmapId,
      pose: {
        orientation: { x: 0, y: 0, z: 0, w: 1 },
        position: { x: posY, y: posX, z: posZ },
      },
      scale,
      color: numberToColor(count - idx - 1, count, alpha),
      info: {
        description: "additional sphere info",
        objectId: hitmapId + 1000,
      },
    };
  });

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
      <div
        style={{
          position: "absolute",
          border: "1px solid white",
          backgroundColor: "grey",
          top: 10,
          left: 10,
          padding: 10,
          display: "flex",
          flexDirection: "column",
        }}>
        <div>{clickedIds.size === 0 && "click an object"}</div>
        <button style={{ marginBottom: 4 }} onClick={() => setEnableAutoRotate(!enableAutoRotate)}>
          {enableAutoRotate ? "Disable Auto Rotate" : "Enable Auto Rotate"}
        </button>
        {clickedIds.size > 0 && <button onClick={() => setClickedIds(new Set())}>Clear Text</button>}
      </div>
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
                flexDirection: "column",
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
