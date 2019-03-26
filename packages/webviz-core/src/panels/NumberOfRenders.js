// @flow
//
//  Copyright (c) 2018-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.
import * as React from "react";

import Flex from "webviz-core/src/components/Flex";
import MessageHistory from "webviz-core/src/components/MessageHistory";
import Panel from "webviz-core/src/components/Panel";
import PanelToolbar from "webviz-core/src/components/PanelToolbar";

// Little dummy panel that just shows the number of renders that happen when not subscribing
// to anything. Useful for debugging performance issues.
let panelRenderRenderCount = 0;
let messageHistoryRenderCount = 0;
function NumberOfRenders(): React.Node {
  panelRenderRenderCount++;
  return (
    <Flex col>
      <PanelToolbar />
      <MessageHistory paths={[]}>
        {() => (
          <Flex row center style={{ fontSize: 20, lineHeight: 1.5, textAlign: "center" }}>
            panelRenderRenderCount: {panelRenderRenderCount} <br />
            messageHistoryRenderCount: {++messageHistoryRenderCount}
          </Flex>
        )}
      </MessageHistory>
    </Flex>
  );
}

NumberOfRenders.panelType = "NumberOfRenders";
NumberOfRenders.defaultConfig = {};

export default Panel<{}>(NumberOfRenders);
