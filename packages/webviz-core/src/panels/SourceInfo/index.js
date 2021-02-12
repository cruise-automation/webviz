// @flow
//
//  Copyright (c) 2019-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import React, { type Node, useCallback } from "react";
import { hot } from "react-hot-loader/root";
import styled from "styled-components";

import EmptyState from "webviz-core/src/components/EmptyState";
import { useMessagePipeline } from "webviz-core/src/components/MessagePipeline";
import Panel from "webviz-core/src/components/Panel";
import PanelToolbar from "webviz-core/src/components/PanelToolbar";
import SelectableTimestamp from "webviz-core/src/components/SelectableTimestamp";
import clipboard from "webviz-core/src/util/clipboard";
import { formatDuration } from "webviz-core/src/util/formatTime";
import { subtractTimes, toSec } from "webviz-core/src/util/time";

const STableContainer = styled.div`
  overflow-y: auto;
  overflow-x: hidden;
`;

const STable = styled.div`
  max-width: 100%;
  min-width: 400px;
  overflow: auto;
`;

const SRow = styled.div`
  &:nth-child(even) {
    background: #333;
  }
`;

const SCell = styled.div`
  border: 0;
  text-overflow: ellipsis;
  overflow: hidden;
  font-size: 14px;
  line-height: 1.6;
  width: 33%;
  display: inline-block;
  padding: 2px 8px;
  white-space: nowrap;
`;

const SHeader = styled.div`
  font-size: 14px;
  border-bottom: #333 solid 2px;
`;

const STitle = styled.div`
  padding: 2px 8px;
`;

const SHeaderItem = styled.div`
  overflow: hidden;
  white-space: nowrap;
`;

function SourceInfo(): Node {
  const { topics, startTime, endTime } = useMessagePipeline(
    useCallback(
      ({ playerState: { activeData } }) =>
        activeData
          ? {
              topics: activeData.topics,
              startTime: activeData.startTime,
              endTime: activeData.endTime,
            }
          : { topics: [], startTime: undefined, endTime: undefined },
      []
    )
  );
  if (!startTime || !endTime) {
    return (
      <>
        <PanelToolbar floating />
        <EmptyState>Waiting for player data...</EmptyState>
      </>
    );
  }

  const duration = subtractTimes(endTime, startTime);
  return (
    <>
      <PanelToolbar floating />
      <STableContainer>
        <SHeader>
          <SHeaderItem>
            <STitle>Start time:</STitle>
            <SelectableTimestamp
              startTime={startTime}
              endTime={endTime}
              currentTime={startTime}
              pausePlayback={() => {}}
              seekPlayback={() => {}}
            />
          </SHeaderItem>
          <SHeaderItem>
            <STitle>End Time:</STitle>
            <SelectableTimestamp
              startTime={startTime}
              endTime={endTime}
              currentTime={endTime}
              pausePlayback={() => {}}
              seekPlayback={() => {}}
            />
          </SHeaderItem>
          <SHeaderItem>
            <STitle>Duration: {formatDuration(duration)}</STitle>
          </SHeaderItem>
        </SHeader>
        <STable>
          {topics.map((t) => (
            <SRow key={t.name}>
              <SCell
                title={`Click to copy topic name ${t.name} to clipboard.`}
                onClick={() => {
                  clipboard.copy(t.name);
                }}>
                {t.name}
              </SCell>
              <SCell
                title={`Click to copy topic type ${t.datatype} to clipboard.`}
                onClick={() => {
                  clipboard.copy(t.datatype);
                }}>
                {t.datatype}
              </SCell>
              {t.numMessages != null ? (
                <SCell>
                  {t.numMessages} msgs ({(t.numMessages / toSec(duration)).toFixed(2)} Hz)
                </SCell>
              ) : (
                <SCell />
              )}
            </SRow>
          ))}
        </STable>
      </STableContainer>
    </>
  );
}

SourceInfo.panelType = "SourceInfo";
SourceInfo.defaultConfig = {};

export default hot(Panel<{}>(SourceInfo));
