// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { Tree } from "antd";
import React, { useMemo, useRef } from "react";
import styled from "styled-components";

import { type Save3DConfig } from "../index";
import renderTreeNodes from "./renderTreeNodes";
import TopicTreeSwitcher, { SWITCHER_HEIGHT } from "./TopicTreeSwitcher";
import type { TreeNode, NamespacesByTopic } from "./types";
import TopicGroupsMenu from "webviz-core/src/panels/ThreeDimensionalViz/TopicGroups/TopicGroupsMenu";
import type { Topic } from "webviz-core/src/players/types";
import { colors } from "webviz-core/src/util/sharedStyleConstants";

const CONTAINER_SPACING = 15;
const DEFAULT_WIDTH = 512;
const SEARCH_BAR_HEIGHT = 40;
const SWITCHER_WIDTH = 24;

const TopicTreeV2Container = styled.div`
  position: absolute;
  top: ${CONTAINER_SPACING}px;
  left: ${CONTAINER_SPACING}px;
  z-index: 102;
  .ant-tree {
    li {
      ul {
        padding: 0 0 0 ${SWITCHER_WIDTH}px;
      }
    }
    .ant-tree-treenode-switcher-close,
    .ant-tree-treenode-switcher-open {
      .ant-tree-node-content-wrapper {
        padding: 0;
      }
    }
  }
`;

const STopicTreeV2 = styled.div`
  position: relative;
  color: ${colors.TEXTL1};
  border-radius: 6px;
  background-color: ${colors.TOOLBAR};
  padding-bottom: 6px;
`;

const STopicTreeHeader = styled.div`
  position: sticky;
  top: 0;
  z-index: 1;
  display: flex;
  padding-left: 8px;
  align-items: center;
  background-color: ${colors.DARK5};
  border-top-left-radius: 6px;
  border-top-right-radius: 6px;
`;

const SFilter = styled.div`
  display: flex;
  padding: 8px 8px 8px 4px;
  align-items: center;
  flex: 1;
`;

type Props = {|
  availableNamespacesByTopic: NamespacesByTopic,
  checkedKeys: string[],
  containerHeight: number,
  expandedKeys: string[],
  onExitTopicTreeFocus: () => void,
  pinTopics: boolean,
  rootTreeNode: TreeNode,
  saveConfig: Save3DConfig,
  setCurrentEditingTopic: (?Topic) => void,
  settingsChangedKeysSet: Set<string>,
  setShowTopicTree: (boolean) => void,
  showTopicTree: boolean,
|};

/**
 * TODO(Audrey):
 * - Compute topic and namespace selections from config
 * - Toggle
 * - Available state
 * - Bag2
 * - Datatype icon
 * - Errors
 * - Filter
 */
function TopicTreeV2({
  availableNamespacesByTopic,
  checkedKeys,
  rootTreeNode,
  expandedKeys,
  saveConfig,
  containerHeight,
  pinTopics,
  showTopicTree,
  setCurrentEditingTopic,
  setShowTopicTree,
  settingsChangedKeysSet,
}: Props) {
  const renderTopicTree = pinTopics || showTopicTree;
  const scrollContainerRef = useRef<?HTMLDivElement>();
  const checkedKeysSet = useMemo(() => new Set(checkedKeys), [checkedKeys]);
  const treeContainerHeight = containerHeight - CONTAINER_SPACING * 2;
  const treeHeight = treeContainerHeight - SEARCH_BAR_HEIGHT - SWITCHER_HEIGHT;

  return (
    <TopicTreeV2Container className="ant-component" style={{ maxHeight: containerHeight - CONTAINER_SPACING * 3 }}>
      <TopicTreeSwitcher
        pinTopics={pinTopics}
        renderTopicTree={renderTopicTree}
        saveConfig={saveConfig}
        setShowTopicTree={setShowTopicTree}
        showTopicTree={showTopicTree}
      />
      {renderTopicTree && (
        <STopicTreeV2 onClick={(e) => e.stopPropagation()}>
          <STopicTreeHeader>
            <SFilter />
            <TopicGroupsMenu saveConfig={saveConfig} onImportSettings={() => {}} />
          </STopicTreeHeader>
          <div ref={scrollContainerRef} style={{ overflow: "auto", width: DEFAULT_WIDTH }}>
            <Tree
              height={treeHeight}
              selectable={false}
              onExpand={(newExpandedKeys) => {
                saveConfig({ expandedNodes: newExpandedKeys });
              }}
              expandedKeys={expandedKeys}
              autoExpandParent={false /* Set autoExpandParent to true when filtering */}>
              {rootTreeNode.children &&
                renderTreeNodes({
                  children: rootTreeNode.children,
                  checkedKeysSet,
                  expandedKeys,
                  saveConfig,
                  availableNamespacesByTopic,
                  setCurrentEditingTopic,
                  settingsChangedKeysSet,
                  width: DEFAULT_WIDTH,
                })}
            </Tree>
          </div>
        </STopicTreeV2>
      )}
    </TopicTreeV2Container>
  );
}

export default TopicTreeV2;
