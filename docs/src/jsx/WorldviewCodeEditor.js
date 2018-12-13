//  Copyright (c) 2018-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import range from "lodash/range";
import polygonGenerator from "polygon-generator";
import React, { useState, useEffect } from "react";
import seedrandom from "seedrandom";
import styled from "styled-components";

import CameraStateInfo from "./CameraStateInfo";
import CodeEditor from "./CodeEditor";
import ConeControls from "./ConeControls";
import { seed } from "./constants";
import LineControls from "./LineControls";
import useRange from "./useRange";
import { buildMatrix, buildSphereList, p, q, generateCubes, generateSpheres, lerp } from "./utils";
import Worldview, {
  Command,
  SimpleCommand,
  Arrows,
  Cones,
  Cubes,
  Cylinders,
  Grid,
  Lines,
  Points,
  Spheres,
  Triangles,
  Axes,
  FilledPolygons,
  Overlay,
  Text,
  DEFAULT_CAMERA_STATE,
  withPose,
  getCSSColor,
} from "regl-worldview";

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

export const FloatingBox = styled.div`
  position: absolute;
  border: 1px solid white;
  background-color: grey;
  top: 10px;
  left: 10px;
  padding: 10px;
  display: flex;
  flex-direction: column;
`;

export const scope = {
  StyledContainer,
  FloatingBox,

  p,
  q,
  getCSSColor,
  buildMatrix,
  buildSphereList,
  lerp,
  generateCubes,
  generateSpheres,
  useRange,
  useState,
  useEffect,
  Worldview,
  seed,
  seedrandom,

  polygonGenerator,
  range,
  styled,
  DEFAULT_CAMERA_STATE,
  CameraStateInfo,
  LineControls,
  ConeControls,

  Command,
  SimpleCommand,
  Arrows,
  Cones,
  Cubes,
  Cylinders,
  Grid,
  Lines,
  Points,
  Spheres,
  Triangles,
  Axes,
  FilledPolygons,
  Overlay,
  Text,
  withPose,
};

export default function WorldviewCodeEditor({ code, noInline, scope: customScope = {} }) {
  return <CodeEditor code={code} scope={{ ...customScope, ...scope }} noInline={noInline} />;
}
