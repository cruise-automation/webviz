// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { Tree } from "antd";
import React, { useMemo, useState, useRef } from "react";
import styled from "styled-components";

import { type Save3DConfig } from "../index";
import renderTreeNodes from "./renderTreeNode";
import TopicTreeSwitcher, { SWITCHER_HEIGHT } from "./TopicTreeSwitcher";
import SceneBuilder from "webviz-core/src/panels/ThreeDimensionalViz/SceneBuilder";
import { generateNewTreeAndCreateNodeList } from "webviz-core/src/panels/ThreeDimensionalViz/TopicGroups/AddFromPopularTopics";
import TopicGroupsMenu from "webviz-core/src/panels/ThreeDimensionalViz/TopicGroups/TopicGroupsMenu";
import {
  TOPIC_CONFIG,
  transformTopicTree,
  getSceneErrorsByTopic,
} from "webviz-core/src/panels/ThreeDimensionalViz/TopicGroups/topicGroupsUtils";
import { type Topic } from "webviz-core/src/players/types";
import { useDeepChangeDetector } from "webviz-core/src/util/hooks";
import { colors } from "webviz-core/src/util/sharedStyleConstants";

const SWITCHER_WIDTH = 24;
const DEFAULT_WIDTH = 512;
const CONTAINER_SPACING = 15;
const SEARCH_BAR_HEIGHT = 40;

const DEFAULT_SCENE_BUILDER_DATA = {
  sceneCollectorMsgForTopicSetting: undefined,
  sceneErrorsByTopic: {},
  sceneNamespacesByTopic: {},
};

type SceneData = {|
  sceneCollectorMsgForTopicSetting: any,
  sceneErrorsByTopic: { [topicName: string]: string[] },
  sceneNamespacesByTopic: { [topicName: string]: string[] },
|};

type SharedProps = {|
  availableTopics: Topic[],
  containerHeight: number,
  pinTopics: boolean,
  saveConfig: Save3DConfig,
  onExitTopicTreeFocus: () => void,
  setShowTopicTree: (boolean) => void,
  showTopicTree: boolean,
  availableTfs: string[],
  checkedNodes: string[],
  expandedNodes: string[],
  topicSettings: any,
|};

type Props = {|
  ...SharedProps,
  ...SceneData,
  renderTopicTree: boolean,
  setSettingsTopicName: (topicName: ?string) => void,
|};

type TopicTreeV2Props = {|
  ...SharedProps,
  setShowTopicTree: (boolean) => void,
  showTopicTree: boolean,
  sceneBuilder: SceneBuilder,
|};

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

// TODO(Audrey):
// - TopicTree data model in a class
// - Datatype icon
// - Show available state
// - Handle namespace
// - Errors by topic
export function TopicTreeV2Base({
  availableTfs,
  availableTopics,
  checkedNodes,
  expandedNodes,
  topicSettings,
  saveConfig,
  containerHeight,
  pinTopics,
  renderTopicTree,
  showTopicTree,
  setShowTopicTree,
  sceneNamespacesByTopic,
}: Props) {
  const scrollContainerRef = useRef<?HTMLDivElement>();
  const checkedNodesSet = useMemo(() => new Set(checkedNodes), [checkedNodes]);

  const [autoExpandParent, setAutoExpandParent] = useState<boolean>(true);

  const { treeData } = useMemo(() => {
    const treeConfig = transformTopicTree(TOPIC_CONFIG);
    const result = generateNewTreeAndCreateNodeList(treeConfig.children || [], []);
    return {
      ...result,
      topicTreeTopics: result.nodeList.map((item) => (item.topicName ? item.topicName : null)).filter(Boolean),
    };
  }, []);

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
                setAutoExpandParent(true);
                saveConfig({ expandedNodes: newExpandedKeys });
              }}
              expandedKeys={expandedNodes}
              autoExpandParent={autoExpandParent}>
              {renderTreeNodes({
                data: treeData,
                checkedNodesSet,
                saveConfig,
                width: DEFAULT_WIDTH,
              })}
            </Tree>
          </div>
        </STopicTreeV2>
      )}
    </TopicTreeV2Container>
  );
}

function TopicTreeV2({ pinTopics, sceneBuilder, setShowTopicTree, showTopicTree, ...rest }: TopicTreeV2Props) {
  const renderTopicTree = pinTopics || showTopicTree;

  // Set the settingsTopic at top level so that we can collect the msg needed for topic settings from SceneBuilder and pass it down.
  const [settingsTopicName, setSettingsTopicName] = useState<?string>(undefined);

  const sceneDataRef = useRef<SceneData>(DEFAULT_SCENE_BUILDER_DATA);
  let sceneErrorsByTopic = {};
  let sceneNamespacesByTopic = {};
  let sceneCollectorMsgForTopicSetting;

  // Recompute the scene data on each render.
  if (renderTopicTree) {
    sceneErrorsByTopic = getSceneErrorsByTopic(sceneBuilder.errors);
    sceneCollectorMsgForTopicSetting =
      (settingsTopicName &&
        (sceneBuilder.collectors[settingsTopicName] && sceneBuilder.collectors[settingsTopicName].getMessages()[0])) ||
      undefined;
    sceneNamespacesByTopic = sceneBuilder.allNamespaces.reduce((memo, { name, topic }) => {
      memo[topic] = memo[topic] || [];
      memo[topic].push(name);
      return memo;
    }, {});
  }

  // Do a deep-comparison and detect if the sceneData has changed and set `sceneDataRef` accordingly.
  const sceneDataChanged = useDeepChangeDetector(
    [sceneErrorsByTopic, sceneNamespacesByTopic, sceneCollectorMsgForTopicSetting],
    true
  );
  if (sceneDataChanged) {
    // Update the sceneData so the MemoizedTopicTree can be re-rendered.
    sceneDataRef.current = { sceneErrorsByTopic, sceneNamespacesByTopic, sceneCollectorMsgForTopicSetting };
  }

  return (
    <TopicTreeV2Base
      {...rest}
      {...sceneDataRef.current}
      renderTopicTree={renderTopicTree}
      pinTopics={pinTopics}
      sceneCollectorMsgForTopicSetting={sceneCollectorMsgForTopicSetting}
      setSettingsTopicName={setSettingsTopicName}
      setShowTopicTree={setShowTopicTree}
      showTopicTree={showTopicTree}
    />
  );
}

export default TopicTreeV2;
