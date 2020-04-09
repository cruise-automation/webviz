// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { Tree } from "antd";
import React, { type Node } from "react";
import styled from "styled-components";

import NodeName from "./NodeName";
import { type PopularTopicTreeNode } from "webviz-core/src/panels/ThreeDimensionalViz/TopicGroups/AddFromPopularTopics";

const SWITCHER_WIDTH = 24;

const SRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 4px 0;
`;
const SToggles = styled.div`
  display: flex;
  align-items: center;
`;
const SToggle = styled.div`
  width: 24px;
  height: 24px;
`;

type Props = {|
  data: PopularTopicTreeNode[],
  checkedNodesSet: Set<string>,
  saveConfig: (any) => void,
  width: number,
|};

// A recursive function for generating TreeNode UI based on treeData.
export default function renderTreeNodes({ data, checkedNodesSet, saveConfig, width }: Props): Node[] {
  const titleWidth = width - SWITCHER_WIDTH;
  return data.map((item) => {
    let nodeChecked = false;
    let nodeKey = "";

    if (item.topicName) {
      nodeKey = `t:${item.topicName}`;
      nodeChecked = checkedNodesSet.has(nodeKey);
    } else if (item.name) {
      nodeKey = `name:${item.name}`;
      nodeChecked = checkedNodesSet.has(nodeKey);
    }

    return (
      <Tree.TreeNode
        key={item.key}
        title={
          <SRow style={{ width: titleWidth }}>
            <NodeName
              style={{ marginLeft: 8 }}
              // $FlowFixMe either name or topicName has to be present on each tree node
              displayName={item.name || item.topicName}
              topicName={item.topicName || ""}
              searchText={""}
            />
            <SToggles>
              <SToggle>
                <input
                  type="checkbox"
                  checked={nodeChecked}
                  onChange={() => {
                    let newCheckedKeys = Array.from(checkedNodesSet);
                    newCheckedKeys = nodeChecked
                      ? newCheckedKeys.filter((k) => k !== nodeKey)
                      : [...newCheckedKeys, nodeKey];
                    saveConfig({ checkedNodes: newCheckedKeys });
                  }}
                />
              </SToggle>
            </SToggles>
          </SRow>
        }>
        {item.children &&
          renderTreeNodes({
            data: item.children,
            checkedNodesSet,
            saveConfig,
            width: titleWidth,
          })}
      </Tree.TreeNode>
    );
  });
}
