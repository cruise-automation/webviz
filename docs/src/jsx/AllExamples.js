//  Copyright (c) 2018-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import React, { useState } from "react";
import Select from "react-virtualized-select";

import "react-select/dist/react-select.css";
import "react-virtualized-select/styles.css";
import {
  BasicExample,
  CameraStateControlled,
  CameraStateUncontrolled,
  Composition,
  Arrows,
  Cones,
  Cubes,
  Cylinders,
  DynamicCommands,
  FilledPolygon,
  Hitmap,
  LinesDemo,
  LinesWireframe,
  Overlays,
  Points,
  SpheresInstanced,
  SpheresInstancedColor,
  SpheresSingle,
  Text,
  Triangles,
} from "./allLiveEditors";

const allExamples = {
  BasicExample,
  CameraStateControlled,
  CameraStateUncontrolled,
  Composition,
  Arrows,
  Cones,
  Cubes,
  Cylinders,
  DynamicCommands,
  FilledPolygon,
  Hitmap,
  LinesDemo,
  LinesWireframe,
  Overlays,
  Points,
  SpheresInstanced,
  SpheresInstancedColor,
  SpheresSingle,
  Text,
  Triangles,
};

export default function AllExamples() {
  const keys = Object.keys(allExamples);
  const [selectedExample, setSelectedExample] = useState(keys[0]);
  const Component = allExamples[selectedExample];
  const selectOptions = Object.keys(allExamples).map((key) => ({ label: key, value: key }));

  return (
    <div>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
        <Select
          style={{ width: 300, marginBottom: 8 }}
          clearable={false}
          value={selectedExample}
          options={selectOptions}
          onChange={(option) => {
            setSelectedExample(option.value);
          }}
        />
      </div>
      <Component />
    </div>
  );
}
