//  Copyright (c) 2018-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import React from "react";

import useRange from "./useRange";
import { buildSphereList } from "./utils";
import Worldview, { Spheres, DEFAULT_CAMERA_STATE } from "regl-worldview";

// #BEGIN EXAMPLE
function SpheresInstancedDemo() {
  const range = useRange();
  return (
    <Worldview defaultCameraState={{ ...DEFAULT_CAMERA_STATE, perspective: true }} hideDebug={true}>
      <Spheres>{[buildSphereList(range)]}</Spheres>
    </Worldview>
  );
}
// #END EXAMPLE

export default SpheresInstancedDemo;
