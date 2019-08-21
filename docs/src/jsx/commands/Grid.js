//  Copyright (c) 2018-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

// #BEGIN EXAMPLE
import React, { useState } from "react";
import Worldview, { Grid, Axes } from "regl-worldview";

// #BEGIN EDITABLE
function Example() {
  const [count, setCount] = useState(6);
  const validatedCount = isNaN(count) || count < 1 ? 6 : Math.round(count);

  return (
    <Worldview>
      <Grid count={validatedCount} />
      <Axes />
      <div
        style={{
          position: "absolute",
          display: "flex",
          flexDirection: "column",
          padding: 8,
          left: 0,
          top: 0,
          right: 0,
          maxWidth: "100%",
          color: "white",
          backgroundColor: "rgba(0, 0, 0, 0.5)",
        }}>
        <div>
          Set grid count:
          <input
            style={{ width: 32, marginLeft: 8 }}
            value={count}
            onChange={(event) => setCount(Number(event.target.value))}
          />
        </div>
      </div>
    </Worldview>
  );
}
// #END EXAMPLE

export default Example;
