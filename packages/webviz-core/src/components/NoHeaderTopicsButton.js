// @flow
//
//  Copyright (c) 2019-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.
import InformationIcon from "@mdi/svg/svg/information.svg";
import { groupBy } from "lodash";
import React, { useMemo } from "react";
import styled from "styled-components";

import Icon from "webviz-core/src/components/Icon";
import { useMessagePipeline } from "webviz-core/src/components/MessagePipeline";
import Modal, { Title } from "webviz-core/src/components/Modal";
import renderToBody from "webviz-core/src/components/renderToBody";
import TextContent from "webviz-core/src/components/TextContent";
import { colors } from "webviz-core/src/util/sharedStyleConstants";

const SRoot = styled.div`
  max-width: calc(100vw - 30px);
  max-height: calc(100vh - 30px);
  overflow-y: auto;
  padding: 2.5em;
`;

const DEFAULT_TOPICS = Object.freeze({ topicsWithoutHeaderStamps: [], topics: [] });
const COLOR_THRESHOLD = 5; // show the icon yellow when too many headers are missing

function getTopics({ playerState: { activeData } }) {
  if (activeData == null) {
    return DEFAULT_TOPICS;
  }
  const {
    playerWarnings: { topicsWithoutHeaderStamps },
    topics,
  } = activeData;
  return { topicsWithoutHeaderStamps, topics };
}

function useTopicsWithoutHeaders() {
  const { topicsWithoutHeaderStamps, topics } = useMessagePipeline(getTopics);
  return useMemo(() => {
    const topicsByName = groupBy(topics, "name");
    return (topicsWithoutHeaderStamps || []).map((topicName) => {
      return { topic: topicName, datatype: topicsByName[topicName]?.[0]?.datatype };
    });
  }, [topicsWithoutHeaderStamps, topics]);
}

function NoHeaderTopicsButton() {
  const topicsWithoutHeaders = useTopicsWithoutHeaders();
  if (!topicsWithoutHeaders.length) {
    return null;
  }
  const rows = topicsWithoutHeaders.sort().map(({ topic, datatype }) => (
    <tr key={topic}>
      <td>{topic}</td>
      <td>{datatype}</td>
    </tr>
  ));
  const color = topicsWithoutHeaders.length > COLOR_THRESHOLD ? colors.YELLOW : "default";
  const tooltip =
    topicsWithoutHeaders.length === 1
      ? "1 subscribed topic does not have headers"
      : `${topicsWithoutHeaders.length} subscribed topics do not have headers`;
  return (
    <Icon
      tooltip={tooltip}
      onClick={() => {
        const modal = renderToBody(
          <Modal onRequestClose={() => modal.remove()}>
            <SRoot>
              <Title>Topics without headers</Title>
              <TextContent>
                <p>These topics will not be visible in panels when ordering data by header stamp:</p>
                <table>
                  <thead>
                    <tr>
                      <th>Topic</th>
                      <th>Datatype</th>
                    </tr>
                  </thead>
                  <tbody>{rows}</tbody>
                </table>
              </TextContent>
            </SRoot>
          </Modal>
        );
      }}
      style={{ color, paddingRight: "6px" }}
      dataTest="missing-headers-icon">
      <InformationIcon />
    </Icon>
  );
}

export default React.memo<{}>(NoHeaderTopicsButton);
