// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import React, { type Node } from "react";
import { hot } from "react-hot-loader/root";
import styled from "styled-components";

import helpContent from "./index.help.md";
import GlobalVariablesTable from "webviz-core/src/components/GlobalVariablesTable";
import Panel from "webviz-core/src/components/Panel";
import PanelToolbar from "webviz-core/src/components/PanelToolbar";

const SGlobalVariablesPanel = styled.div`
  display: flex;
  flex-direction: column;
`;

function GlobalVariables(): Node {
  return (
    <SGlobalVariablesPanel>
      <PanelToolbar helpContent={helpContent} floating />
      <GlobalVariablesTable />
    </SGlobalVariablesPanel>
  );
}

GlobalVariables.panelType = "Global";
GlobalVariables.defaultConfig = {};

export default hot(Panel<{}>(GlobalVariables));
