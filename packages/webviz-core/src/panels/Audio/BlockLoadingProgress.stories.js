// @flow
//
//  Copyright (c) 2021-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { storiesOf } from "@storybook/react";
import React from "react";

import BlockLoadingProgress from "./BlockLoadingProgress";

storiesOf("<BlockLoadingProgressBase>", module).add("default", () => (
  <div>
    {[
      [],
      [true, false],
      [false, true],
      [false, false, true],
      [false, true, false, false, true, true, true, true, false, false],
    ].map((blockLoadingStates, idx) => (
      <div style={{ marginBottom: 24 }} key={idx}>
        <div>{JSON.stringify(blockLoadingStates)}</div>
        <BlockLoadingProgress blockLoadingStates={blockLoadingStates} />
      </div>
    ))}
  </div>
));
