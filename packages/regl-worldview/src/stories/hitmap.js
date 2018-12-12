// @flow

//  Copyright (c) 2018-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import React from "react";
import styled from "styled-components";

import { getCSSColor } from "../utils/commandUtils";
import FloatingBox from "./FloatingBox";

import Worldview, {
  Cubes,
  Axes,
  Spheres,
  Overlay,
  DEFAULT_CAMERA_STATE,
  type CameraState,
  type ReglClickInfo,
  type Cube,
  type SphereList,
} from "..";

export const StyledContainer = styled.div`
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

const p = (x, y = x, z = x) => ({ x, y, z });
type RGBA = {
  r: number,
  b: number,
  g: number,
  a: number,
};

const DEFAULT_MARKER_COUNT = 20;
const CUBE_GAP = 5;

function numberToColor(number: number, max: number, a: number = 1): RGBA {
  const i = (number * 255) / max;
  const r = Math.round(Math.sin(0.024 * i + 0) * 127 + 128) / 255;
  const g = Math.round(Math.sin(0.024 * i + 2) * 127 + 128) / 255;
  const b = Math.round(Math.sin(0.024 * i + 4) * 127 + 128) / 255;
  return { r, g, b, a };
}

function lerp(start, end, amt) {
  return (1 - amt) * start + amt * end;
}

function generateCubes(clickedIds, count = DEFAULT_MARKER_COUNT, hitmapIdStartIdx = 1): Cube[] {
  const totalLen = count * CUBE_GAP;
  return new Array(count).fill(0).map((_, idx) => {
    const posX = -totalLen / 2 + idx * CUBE_GAP;
    const posY = Math.sin(posX) * 30;
    const posZ = Math.cos(posX) * 20;
    const hitmapId = idx + hitmapIdStartIdx;
    const isClicked = clickedIds.has(hitmapId);
    const scale = isClicked ? p(10, 10) : p(5, 5);
    const alpha = isClicked ? 1 : 0.2 + idx / count;
    return {
      hitmapId,
      pose: {
        orientation: { x: 0.038269, y: -0.01677, z: -0.8394, w: 0.541905 },
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
}

function generateSpheres(clickedIds, count = DEFAULT_MARKER_COUNT, hitmapIdStartIdx = 1): SphereList[] {
  const totalLen = count * CUBE_GAP * 1.1;
  return new Array(count).fill(0).map((_, idx) => {
    const posX = -totalLen / 2 + idx * CUBE_GAP * 1.1;
    const posY = -Math.sin(posX) * 30;
    const posZ = -Math.cos(posX) * 20;

    const hitmapId = idx + hitmapIdStartIdx;
    const isClicked = clickedIds.has(hitmapId);
    const scale = isClicked ? p(10, 10) : p(5, 5);
    const alpha = isClicked ? 1 : 0.2 + idx / count;
    return {
      hitmapId,
      pose: {
        orientation: { x: 0.038269, y: -0.01677, z: -0.8394, w: 0.541905 },
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
}

export default function() {
  const getHitmapId = (shape) => shape.hitmapId || 0;

  type State = {
    clickedIds: Set<number>,
    cameraState: CameraState,
    enableAutoRotate: boolean,
  };

  class Story extends React.Component<{}, State> {
    _objectMap = {};
    _intervalId: IntervalID;
    state = {
      enableAutoRotate: false,
      clickedIds: new Set([7, 27]),
      cameraState: {
        ...DEFAULT_CAMERA_STATE,
        distance: 145,
        phi: 1.22,
        perspective: true,
        thetaOffset: 0,
      },
    };

    componentDidMount() {
      if (this.state.enableAutoRotate) {
        this._intervalId = setInterval(this._move, 1000 / 60);
      }
    }

    _move = () => {
      if (!this.state) {
        return;
      }
      const {
        cameraState: { thetaOffset: prevThetaOffset },
        cameraState,
      } = this.state;
      let thetaOffset = prevThetaOffset;
      if (thetaOffset >= 6.1) {
        thetaOffset = 0;
      }
      thetaOffset = lerp(thetaOffset, 2 * Math.PI, 0.01);

      this.setState({
        cameraState: { ...cameraState, thetaOffset },
      });
    };

    componentWillUnmount() {
      clearInterval(this._intervalId);
    }

    _onClick = (e: MouseEvent, arg: ?ReglClickInfo) => {
      const clickedId = arg && arg.clickedObjectId;
      if (!clickedId) {
        return;
      }
      const clickedIds = this.state.clickedIds;
      if (clickedIds.has(clickedId)) {
        clickedIds.delete(clickedId);
      } else {
        clickedIds.add(clickedId);
      }
      this.setState({ clickedIds });
    };

    _updateObjectMap = (objects: $ReadOnlyArray<Cube | SphereList>, type: "cube" | "sphere") => {
      objects.forEach((object) => {
        if (object.hitmapId) {
          this._objectMap[object.hitmapId] = { object, type };
        }
      });
    };

    _onToggleEnableRotate = () => {
      const enableAutoRotate = !this.state.enableAutoRotate;
      this.setState({ enableAutoRotate });
      if (!enableAutoRotate) {
        clearInterval(this._intervalId);
      } else {
        this._intervalId = setInterval(this._move, 1000 / 60);
      }
    };

    _onCameraStateChange = (cameraState: CameraState) => {
      if (!this.state.enableAutoRotate) {
        this.setState({ cameraState });
      }
    };

    _onClearText = () => {
      const clickedIds = this.state.clickedIds;
      clickedIds.clear();
      this.setState({ clickedIds });
    };

    render() {
      const { clickedIds, cameraState, enableAutoRotate } = this.state;

      const cubes = generateCubes(clickedIds);
      const spheres = generateSpheres(clickedIds, 10, cubes.length + 1);
      this._updateObjectMap(cubes, "cube");
      this._updateObjectMap(spheres, "sphere");

      const textMarkers = [];
      for (const clickedId of clickedIds) {
        const clickedObj = this._objectMap[clickedId];
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
          let text = `hitmapId: ${hitmapId} \n x: ${position.x} \ny: ${position.y} \nz: ${position.z} \n`;
          if (info) {
            text += `\n description: ${info.description} \n objectId: ${info.objectId}`;
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
      }

      return (
        <Worldview cameraState={cameraState} onCameraStateChange={this._onCameraStateChange} onClick={this._onClick}>
          <FloatingBox>
            <div>{clickedIds.size === 0 && "click an object"}</div>
            <button style={{ marginBottom: 4 }} onClick={this._onToggleEnableRotate}>
              {`${enableAutoRotate ? "Disable Auto Rotate" : "Enable Auto Rotate"}`}
            </button>
            {clickedIds.size > 0 && <button onClick={this._onClearText}>Clear Text</button>}
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
  }
  return <Story />;
}
