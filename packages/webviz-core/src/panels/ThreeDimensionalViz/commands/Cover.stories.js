// @flow
//
//  Copyright (c) 2020-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { storiesOf } from "@storybook/react";
import { noop } from "lodash";
import React from "react";
import { Worldview } from "regl-worldview";
import styled from "styled-components";

import Cover from "./Cover";

const SExpectedResult = styled.div`
  position: fixed;
  top: 25px;
  left: 0;
  color: lightgreen;
  margin: 16px;
  z-index: 1000;
`;

storiesOf("Commands / <Cover> ", module).add("renders with blending", () => {
  const transparentRed = [1, 0, 0, 0.5];
  const transparentBlue = [0, 0, 1, 0.5];
  return (
    <div style={{ width: 1001, height: 745 }}>
      <Worldview
        onClick={noop}
        onCameraStateChange={noop}
        cameraState={{ target: [-627, -608, -17], perspective: true }}
        onDoubleClick={noop}
        onMouseDown={noop}
        onMouseMove={noop}
        onMouseUp={noop}>
        <Cover color={transparentRed} layerIndex={0} />
        <Cover color={transparentBlue} layerIndex={1} />
      </Worldview>
      <SExpectedResult>The whole viewport should be purple</SExpectedResult>
    </div>
  );
});
