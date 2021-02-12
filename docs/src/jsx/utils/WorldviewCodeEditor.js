//  Copyright (c) 2018-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { useAnimationFrame } from "@cruise-automation/hooks";
import { quat, vec3 } from "gl-matrix";
import last from "lodash/last";
import remove from "lodash/remove";
import sample from "lodash/sample";
import polygonGenerator from "polygon-generator";
import React, { useRef, useState, useCallback, useEffect } from "react";
import Worldview, {
  Command,
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
  DrawPolygons,
  PolygonBuilder,
  Overlay,
  Text,
  GLText,
  GLTFScene,
  DEFAULT_CAMERA_STATE,
  withPose,
  getCSSColor,
  intToRGB,
  cameraStateSelectors,
  getRayFromClick,
} from "regl-worldview";
import seedrandom from "seedrandom";
import styled from "styled-components";

import { getHashUrlByComponentName } from "../../routes";
import CameraStateInfo from "./CameraStateInfo";
import cesiumManModel from "./CesiumMan.glb";
import CodeEditor from "./CodeEditor";
import { inScreenshotTests } from "./codeSandboxUtils";
import InputNumber from "./InputNumber";
import LineControls from "./LineControls";
import LinesWithClickableInterior from "./LinesWithClickableInterior";
import useRange from "./useRange";
import duckModel from "common/fixtures/Duck.glb"; // Webpack magic: we actually import a URL pointing to a .glb file

// Add required packages and files for all examples to run
const CODE_SANDBOX_CONFIG = {
  dependencies: {
    react: "latest",
    "react-dom": "latest",
    "regl-worldview": "latest",
    "@cruise-automation/hooks": "latest",
    seedrandom: "latest",
    "polygon-generator": "latest",
    "styled-components": "latest",
  },
  files: {
    "common/fixtures/Duck.glb": {
      content: "https://uploads.codesandbox.io/uploads/user/dfcf1de7-30d4-4c5b-9675-546a91ea8afb/Zb-T-Duck.glb",
      isBinary: true,
    },
    "utils/codeSandboxStyleFix.css": {
      content: require("!!raw-loader!./codeSandboxStyleFix.css"),
    },
    "utils/CameraStateInfo.js": {
      content: require("!!raw-loader!./CameraStateInfo.js"),
    },
    "utils/CesiumMan.glb": {
      content: "https://uploads.codesandbox.io/uploads/user/dfcf1de7-30d4-4c5b-9675-546a91ea8afb/04aB-CesiumMan.glb",
      isBinary: true,
    },
    "utils/LinesWithClickableInterior.js": {
      content: require("!!raw-loader!./LinesWithClickableInterior.js"),
    },
    "utils/useRange.js": {
      content: require("!!raw-loader!./useRange.js"),
    },
    "utils/InputNumber.js": {
      content: require("!!raw-loader!./InputNumber.js"),
    },
    "utils/Switch.js": {
      content: require("!!raw-loader!./Switch.js"),
    },
    "utils/codeSandboxUtils.js": {
      content: require("!!raw-loader!./codeSandboxUtils.js"),
    },
    "utils/theme.js": {
      content: require("!!raw-loader!./theme.js"),
    },
    "utils/LineControls.js": {
      content: require("!!raw-loader!./LineControls.js"),
    },
  },
};

export const scope = {
  quat,
  vec3,
  intToRGB,
  cameraStateSelectors,
  getCSSColor,
  useRange,
  useAnimationFrame,
  useCallback,
  useRef,
  useState,
  useEffect,
  Worldview,
  seedrandom,
  last,
  remove,
  sample,
  inScreenshotTests,

  polygonGenerator,
  styled,
  DEFAULT_CAMERA_STATE,
  CameraStateInfo,
  LineControls,
  LinesWithClickableInterior,
  InputNumber,

  Command,
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
  DrawPolygons,
  PolygonBuilder,
  Overlay,
  Text,
  GLText,
  GLTFScene,
  withPose,
  getRayFromClick,
  duckModel,
  cesiumManModel,
};

export default function WorldviewCodeEditor({
  scope: customScope = {},
  componentName,
  code,
  nonEditableCode = "",
  insertCodeSandboxStyle,
  noInline,
  ...rest
}) {
  const hashUrl = getHashUrlByComponentName(componentName);
  const docUrl = `https://cruise-automation.github.io/webviz/worldview/#${hashUrl}`;

  const copyCode = `${nonEditableCode}

${code}
    `;

  const render = noInline
    ? ""
    : `
render(
  <div className="App" style={{ width: "100vw", height: "100vh" }}>
    <Example />
  </div>
);
`;

  const codeSandboxCode = `
// regl-worldview example: ${componentName}
// docs: ${docUrl}

${insertCodeSandboxStyle ? 'import "./utils/codeSandboxStyleFix.css"; // #CODE_SANDBOX_ONLY' : ""}
import ReactDOM from "react-dom";
${nonEditableCode}

function render(content) {
  ReactDOM.render(content, document.getElementById("root"));
}

${code}
${render}
`;

  return (
    <CodeEditor
      scope={{ ...customScope, ...scope }}
      {...rest}
      noInline={noInline}
      codeSandboxConfig={CODE_SANDBOX_CONFIG}
      codeSandboxCode={codeSandboxCode}
      code={code}
      copyCode={copyCode}
      nonEditableCode={nonEditableCode}
    />
  );
}
