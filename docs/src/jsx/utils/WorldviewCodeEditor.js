//  Copyright (c) 2018-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import polygonGenerator from "polygon-generator";
import React, { useState, useEffect } from "react";
import seedrandom from "seedrandom";
import styled from "styled-components";

import { getHashUrlByComponentName } from "../../routes";
import CameraStateInfo from "./CameraStateInfo";
import CodeEditor from "./CodeEditor";
import duckModel from "./Duck.glb";
import InputNumber from "./InputNumber";
import LineControls from "./LineControls";
import useRange from "./useRange";
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
  Overlay,
  Text,
  GLTFScene,
  DEFAULT_CAMERA_STATE,
  withPose,
  getCSSColor,
} from "regl-worldview";

// Add required packages and files for all examples to run
const CODE_SANDBOX_CONFIG = {
  dependencies: {
    // TODO(Audrey): update to use "latest" once hooks api is finalized
    react: "16.7.0-alpha.2",
    "react-dom": "16.7.0-alpha.2",
    "regl-worldview": "latest",
    seedrandom: "latest",
    "polygon-generator": "latest",
    "styled-components": "latest",
  },
  files: {
    "utils/CameraStateInfo.js": {
      content: require("!!raw-loader!./CameraStateInfo.js"),
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
  getCSSColor,
  useRange,
  useState,
  useEffect,
  Worldview,
  seedrandom,

  polygonGenerator,
  styled,
  DEFAULT_CAMERA_STATE,
  CameraStateInfo,
  LineControls,
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
  Overlay,
  Text,
  GLTFScene,
  withPose,

  duckModel,
};

export default function WorldviewCodeEditor({
  scope: customScope = {},
  componentName,
  code,
  nonEditableCode = "",
  ...rest
}) {
  const hashUrl = getHashUrlByComponentName(componentName);
  const docUrl = `https://cruise-automation.github.io/webviz/worldview/#${hashUrl}`;

  const copyCode = `
${nonEditableCode}

${code}
    `;

  const codeSandboxCode = `
// regl-worldview example: ${componentName}
// docs: ${docUrl}

import ReactDOM from "react-dom";
${copyCode}

function App() {
  return (
    <div className="App" style={{ width: "100vw", height: "100vh" }}>
      <Example />
    </div>
  );
}

ReactDOM.render(<App />, document.getElementById("root"));
  `;

  return (
    <CodeEditor
      scope={{ ...customScope, ...scope }}
      {...rest}
      codeSandboxConfig={CODE_SANDBOX_CONFIG}
      codeSandboxCode={codeSandboxCode}
      code={code}
      copyCode={copyCode}
      nonEditableCode={nonEditableCode}
    />
  );
}
