// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.
import * as React from "react";
import { hot } from "react-hot-loader/root";

import Flex from "webviz-core/src/components/Flex";
import MessageHistoryDEPRECATED from "webviz-core/src/components/MessageHistoryDEPRECATED";
import { type MessagePipelineContext, useMessagePipeline } from "webviz-core/src/components/MessagePipeline";
import Panel from "webviz-core/src/components/Panel";
import PanelToolbar from "webviz-core/src/components/PanelToolbar";
import * as PanelAPI from "webviz-core/src/PanelAPI";
import inScreenshotTests from "webviz-core/src/stories/inScreenshotTests";

const MAX_ALLOWABLE_RENDER_COUNT = 10;

// Little dummy panel that just shows the number of renders that happen when not subscribing
// to anything. Useful for debugging performance issues.
let panelRenderCount = 0;
let messageHistoryRenderCount = 0;
let messagePipelineRenderCount = 0;
let useMessageReducerRenderCount = 0;

// Exported for stories
export const resetRenderCountsForTests = () => {
  panelRenderCount = 0;
  messageHistoryRenderCount = 0;
  messagePipelineRenderCount = 0;
  useMessageReducerRenderCount = 0;
};

window.getNumberOfRendersCountsForTests = function() {
  return {
    panelRenderCount,
    messageHistoryRenderCount,
    useMessageReducerRenderCount,
    messagePipelineRenderCount,
  };
};

const getRenderCountMessage = (renderCount) =>
  renderCount <= MAX_ALLOWABLE_RENDER_COUNT ? "✅ Ok!" : `🆇 Too many renders = ${renderCount}`;

function HooksComponent() {
  PanelAPI.useMessageReducer({
    topics: [],
    restore: React.useCallback(() => null, []),
    addMessage: React.useCallback(() => null, []),
  });
  return `useMessageReducerRenderCount: ${getRenderCountMessage(useMessageReducerRenderCount++)}`;
}

function MessagePipelineRendersComponent() {
  // This is a private API, so panels should not be using it, but it's still bad if it renders too
  // much. And in practice there might still be some panels that use it directly. :-(
  useMessagePipeline<MessagePipelineContext>((context: MessagePipelineContext) => context);
  return `messagePipelineRenderCount: ${++messagePipelineRenderCount}`;
}

function NumberOfRenders(): React.Node {
  panelRenderCount++;
  return (
    <Flex col>
      <PanelToolbar />
      <Flex col center style={{ fontSize: 20, lineHeight: 1.5, textAlign: "center" }}>
        <div>
          <MessageHistoryDEPRECATED paths={[]}>
            {() => (
              <>
                panelRenderCount: {getRenderCountMessage(panelRenderCount)} <br />
                messageHistoryRenderCount: {getRenderCountMessage(++messageHistoryRenderCount)}
              </>
            )}
          </MessageHistoryDEPRECATED>
        </div>
        <div>
          <HooksComponent />
        </div>
        {!inScreenshotTests() && <MessagePipelineRendersComponent /> // Too flakey for screenshots.
        }
      </Flex>
    </Flex>
  );
}

NumberOfRenders.panelType = "NumberOfRenders";
NumberOfRenders.defaultConfig = {};

export default hot(Panel<{}>(NumberOfRenders));
