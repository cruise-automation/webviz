// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import * as React from "react";
import styled from "styled-components";

import { usePanelContext } from "webviz-core/src/components/PanelContext";
import Tooltip from "webviz-core/src/components/Tooltip";
import RawMessages, { type RawMessagesConfig } from "webviz-core/src/panels/RawMessages/index";
import colors from "webviz-core/src/styles/colors.module.scss";

const STopicLink = styled.span`
  cursor: pointer;
  color: ${colors.highlight};
`;

type Props = {
  topic: string,
};

export default function TopicLink({ topic }: Props) {
  const { openSiblingPanel } = usePanelContext();
  const openRawMessages = React.useCallback(
    () => {
      if (!openSiblingPanel) {
        return;
      }
      openSiblingPanel(
        // $FlowFixMe: https://stackoverflow.com/questions/52508434/adding-static-variable-to-union-of-class-types
        RawMessages.panelType,
        // $FlowFixMe
        (config: RawMessagesConfig) => ({ ...config, topicPath: topic }: RawMessagesConfig)
      );
    },
    [openSiblingPanel, topic]
  );

  return (
    <Tooltip placement="top" contents={`View ${topic} in Raw Messages panel`}>
      {/* extra span to work around tooltip NaN positioning bug */}
      <span>
        <STopicLink onClick={openRawMessages}>{topic}</STopicLink>
      </span>
    </Tooltip>
  );
}
