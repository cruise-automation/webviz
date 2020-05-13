// @flow
//
//  Copyright (c) 2019-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.
import React from "react";
import Tree from "react-json-tree";
import styled from "styled-components";

import type { UserNodeLog } from "webviz-core/src/players/UserNodePlayer/types";
import { jsonTreeTheme } from "webviz-core/src/util/globalConstants";
import { colors } from "webviz-core/src/util/sharedStyleConstants";

const SListItem = styled.li`
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  cursor: default;

  :hover {
    background-color: ${colors.DARK4};
  }
`;

type Props = {
  nodeId: ?string,
  logs: UserNodeLog[],
  clearLogs: (nodeId: string) => void,
};

const valueColorMap = {
  string: jsonTreeTheme.base0B,
  number: jsonTreeTheme.base09,
  boolean: jsonTreeTheme.base09,
  object: jsonTreeTheme.base08, // null
  undefined: jsonTreeTheme.base08,
};

const LogsSection = ({ nodeId, logs, clearLogs }: Props) => {
  if (logs.length === 0) {
    return (
      <>
        <p>No logs to display.</p>
        <p>
          Invoke <code>log(someValue)</code> in your Webviz node code to see data printed here.
        </p>
      </>
    );
  }
  return (
    <>
      <button
        data-test="np-logs-clear"
        style={{ padding: "3px 5px", position: "absolute", right: 5, top: 5 }}
        onClick={() => {
          if (nodeId) {
            clearLogs(nodeId);
          }
        }}>
        clear logs
      </button>
      <ul>
        {logs.map(({ source, value }, idx) => {
          const renderTreeObj = value != null && typeof value === "object";
          return (
            <SListItem key={`${idx}${source}`} style={{ padding: renderTreeObj ? "0px 3px" : "6px 3px 3px" }}>
              {renderTreeObj ? (
                <Tree hideRoot data={value} invertTheme={false} theme={jsonTreeTheme} />
              ) : (
                <span style={{ color: valueColorMap[typeof value] || colors.LIGHT }}>
                  {value == null || value === false ? String(value) : value}
                </span>
              )}
              <div style={{ color: colors.DARK9, textDecoration: "underline" }}>{source}</div>
            </SListItem>
          );
        })}
      </ul>
    </>
  );
};

export default LogsSection;
