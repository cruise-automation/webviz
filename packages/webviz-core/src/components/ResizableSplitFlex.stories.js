// @flow
//
//  Copyright (c) 2020-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.
import { storiesOf } from "@storybook/react";
import * as React from "react";
import styled from "styled-components";

import ResizableSplitFlex from "./ResizableSplitFlex";

const SOne = styled.div`
  background: red;
  width: 100%;
  height: 100%;
`;

const STwo = styled.div`
  background: blue;
  width: 100%;
  height: 100%;
`;

storiesOf("<ResizableSplitFlex>", module)
  .add("default splitPercent", () => (
    <div style={{ width: 200, height: 400 }}>
      <ResizableSplitFlex defaultSplitPercent={0.2}>
        <SOne>one</SOne>
        <STwo>two</STwo>
      </ResizableSplitFlex>
    </div>
  ))
  .add("row", () => (
    <div style={{ width: 200, height: 400 }}>
      <ResizableSplitFlex>
        <SOne>one</SOne>
        <STwo>two</STwo>
      </ResizableSplitFlex>
    </div>
  ))
  .add("column", () => (
    <div style={{ width: 200, height: 400 }}>
      <ResizableSplitFlex column>
        <SOne>one</SOne>
        <STwo>two</STwo>
      </ResizableSplitFlex>
    </div>
  ))
  .add("with maxHeight", () => (
    <div style={{ width: 200, height: 400 }}>
      <ResizableSplitFlex column>
        <SOne style={{ maxHeight: 300 }} />
        <STwo>two</STwo>
      </ResizableSplitFlex>
    </div>
  ))
  .add("with minHeight", () => (
    <div style={{ width: 200, height: 400 }}>
      <ResizableSplitFlex column>
        <SOne>one</SOne>
        <STwo style={{ minHeight: 40 }} />
      </ResizableSplitFlex>
    </div>
  ))
  .add("controlled", () => <ControlledResizableSplitFlexExample />);

const ControlledResizableSplitFlexExample = () => {
  const [split, setSplit] = React.useState(0.5);

  return (
    <div>
      <div style={{ width: 200, height: 400 }}>
        <ResizableSplitFlex column onChange={setSplit} splitPercent={split}>
          <SOne>one</SOne>
          <STwo>two</STwo>
        </ResizableSplitFlex>
      </div>
      <button onClick={() => setSplit(0.25)}>Split 25%</button>
      <button onClick={() => setSplit(0.75)}>Split 75%</button>
    </div>
  );
};
