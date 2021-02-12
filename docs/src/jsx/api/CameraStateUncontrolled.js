//  Copyright (c) 2018-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

// #BEGIN EXAMPLE
import React, { useState } from "react";
import Worldview, { Axes, Grid } from "regl-worldview";

import InputNumber from "../utils/InputNumber";

// #BEGIN EDITABLE
function Example() {
  const [distance, setDistance] = useState(100);

  return (
    <Worldview
      defaultCameraState={{
        distance,
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
        <InputNumber label="distance" value={distance} min={0} max={400} step={1} onChange={setDistance} />
      </div>

      <Grid />
      <Axes />
    </Worldview>
  );
}
// #END EXAMPLE

export default Example;
