// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import ChevronDownIcon from "@mdi/svg/svg/chevron-down.svg";
import CloseIcon from "@mdi/svg/svg/close.svg";
import MagnifyIcon from "@mdi/svg/svg/magnify.svg";
import LessIcon from "@mdi/svg/svg/unfold-less-horizontal.svg";
import MoreIcon from "@mdi/svg/svg/unfold-more-horizontal.svg";
import { Tree } from "antd";
import React, { useMemo, useRef, useEffect } from "react";
import styled from "styled-components";

import { type Save3DConfig } from "../index";
import NoMatchesSvg from "./noMatches.svg";
import renderTreeNodes, { SWITCHER_WIDTH } from "./renderTreeNodes";
import TopicTreeSwitcher, { SWITCHER_HEIGHT } from "./TopicTreeSwitcher";
import TopicViewModeSelector from "./TopicViewModeSelector";
import { DOT_MENU_WIDTH } from "./TreeNodeDotMenu";
import { ROW_HEIGHT, ROW_CONTENT_HEIGHT } from "./TreeNodeRow";
import type {
  DerivedCustomSettingsByKey,
  GetIsNamespaceCheckedByDefault,
  GetIsTreeNodeVisibleInScene,
  GetIsTreeNodeVisibleInTree,
  NamespacesByTopic,
  SceneErrorsByKey,
  SetCurrentEditingTopic,
  ToggleNamespaceChecked,
  ToggleNode,
  TopicDisplayMode,
  TreeNode,
} from "./types";
import { TOGGLE_WRAPPER_SIZE } from "./VisibilityToggle";
import Icon from "webviz-core/src/components/Icon";
import { useChangeDetector } from "webviz-core/src/util/hooks";
import { colors } from "webviz-core/src/util/sharedStyleConstants";

const CONTAINER_SPACING = 15;
const DEFAULT_WIDTH = 360;
const DEFAULT_XS_WIDTH = 200;
const SEARCH_BAR_HEIGHT = 40;
const SWITCHER_ICON_SIZE = 20;
export const TREE_SPACING = 8;
const MAX_CONTAINER_WIDTH_RATIO = 0.9;

const MAX_DATA_SOURCE_TOGGLES_WIDTH = TOGGLE_WRAPPER_SIZE;

const TopicTreeV2Container = styled.div`
  position: absolute;
  top: ${CONTAINER_SPACING}px;
  left: ${CONTAINER_SPACING}px;
  z-index: 102;
  max-width: ${MAX_CONTAINER_WIDTH_RATIO * 100}%;
  .ant-tree {
    li {
      ul {
        padding: 0 0 0 ${SWITCHER_WIDTH}px;
      }
    }
    .ant-tree-node-content-wrapper {
      cursor: unset;
    }
    .ant-tree-switcher {
      height: ${ROW_HEIGHT}px;
    }
    .ant-tree-treenode {
      padding: 0 ${({ isXSWidth }) => (isXSWidth ? 0 : TREE_SPACING)}px;
      &:hover {
        background: ${colors.DARK4};
      }
      &.ant-tree-treenode-disabled {
        color: ${colors.DISABLED};
        cursor: unset;
        .ant-tree-node-content-wrapper {
          cursor: unset;
        }
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
  max-width: 100%;
  overflow: auto;
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
  padding: 8px 4px;
  align-items: center;
  flex: 1;
`;

const SInput = styled.input`
  background: transparent;
  flex: 1;
  overflow: auto;
  font-size: 14px;
  margin-left: 4px;
  padding: 4px 8px;
  min-width: 80px;
  border: none;
  :focus,
  :hover {
    outline: none;
    background: transparent;
  }
`;

const SSwitcherIcon = styled.span`
  width: ${SWITCHER_WIDTH}px;
  height: ${ROW_CONTENT_HEIGHT}px;
  padding-top: 6px;
  transition: transform 0.2s ease-in-out;
  & .ant-tree-switcher_close {
    transform: rotate(-90deg);
  }
  & .ant-tree-switcher_open {
    transform: rotate(0deg);
  }
`;

const SNoMatches = styled.div`
  margin-top: 57px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  margin-bottom: 74px;
`;

const SNoMatchesText = styled.div`
  margin-top: 25px;
  font-size: 16px;
  width: 205px;
  text-align: center;
  line-height: 130%;
`;

type Props = {|
  allKeys: string[],
  availableNamespacesByTopic: NamespacesByTopic,
  checkedKeys: string[],
  containerHeight: number,
  containerWidth: number,
  derivedCustomSettingsByKey: DerivedCustomSettingsByKey,
  expandedKeys: string[],
  filterText: string,
  getIsNamespaceCheckedByDefault: GetIsNamespaceCheckedByDefault,
  getIsTreeNodeVisibleInScene: GetIsTreeNodeVisibleInScene,
  getIsTreeNodeVisibleInTree: GetIsTreeNodeVisibleInTree,
  onExitTopicTreeFocus: () => void,
  pinTopics: boolean,
  rootTreeNode: TreeNode,
  saveConfig: Save3DConfig,
  sceneErrorsByKey: SceneErrorsByKey,
  setCurrentEditingTopic: SetCurrentEditingTopic,
  setFilterText: (string) => void,
  setShowTopicTree: (boolean) => void,
  shouldExpandAllKeys: boolean,
  showTopicTree: boolean,
  toggleCheckAllAncestors: ToggleNode,
  toggleCheckAllDescendants: ToggleNode,
  toggleNamespaceChecked: ToggleNamespaceChecked,
  toggleNodeChecked: ToggleNode,
  toggleNodeExpanded: ToggleNode,
  topicDisplayMode: TopicDisplayMode,
|};

function TopicTreeV2({
  allKeys,
  availableNamespacesByTopic,
  checkedKeys,
  containerHeight,
  containerWidth,
  derivedCustomSettingsByKey,
  expandedKeys,
  filterText,
  getIsNamespaceCheckedByDefault,
  getIsTreeNodeVisibleInScene,
  getIsTreeNodeVisibleInTree,
  pinTopics,
  rootTreeNode,
  saveConfig,
  sceneErrorsByKey,
  setCurrentEditingTopic,
  setFilterText,
  setShowTopicTree,
  shouldExpandAllKeys,
  showTopicTree,
  toggleCheckAllAncestors,
  toggleCheckAllDescendants,
  toggleNamespaceChecked,
  toggleNodeChecked,
  toggleNodeExpanded,
  topicDisplayMode,
}: Props) {
  const renderTopicTree = pinTopics || showTopicTree;
  const scrollContainerRef = useRef<?HTMLDivElement>();
  const checkedKeysSet = useMemo(() => new Set(checkedKeys), [checkedKeys]);
  const treeContainerHeight = containerHeight - CONTAINER_SPACING * 2;
  const treeHeight = treeContainerHeight - SEARCH_BAR_HEIGHT - SWITCHER_HEIGHT;

  const maxAvailableContainerWidth = Math.floor(containerWidth * MAX_CONTAINER_WIDTH_RATIO);
  let treeWidth = Math.max(Math.min(maxAvailableContainerWidth, DEFAULT_WIDTH), DEFAULT_XS_WIDTH);
  const isXSWidth = treeWidth >= maxAvailableContainerWidth;
  if (!rootTreeNode.providerAvailable) {
    treeWidth -= MAX_DATA_SOURCE_TOGGLES_WIDTH + DOT_MENU_WIDTH;
  }

  const filterTextFieldRef = useRef();

  // HACK: Ant Tree does not auto expand dynamic tree nodes. Create a copy of expandedNodes
  // to ensure newly added nodes such as `uncategorized` are properly expanded:
  // https://github.com/ant-design/ant-design/issues/18012
  const expandedKeysRef = useRef(expandedKeys);
  const hasRootNodeChanged = useChangeDetector([rootTreeNode], false);
  expandedKeysRef.current = hasRootNodeChanged ? [...expandedKeys] : expandedKeys;

  useEffect(
    () => {
      // auto focus whenever first rendering the topic tree
      if (renderTopicTree && filterTextFieldRef.current) {
        filterTextFieldRef.current.focus();
      }
    },
    [renderTopicTree]
  );

  const topLevelNodesCollapsed = useMemo(
    () => {
      const topLevelChildren = rootTreeNode.type === "group" ? rootTreeNode.children : [];
      const topLevelKeys = topLevelChildren.map(({ key }) => key);
      return topLevelKeys.every((key) => !expandedKeys.includes(key));
    },
    [expandedKeys, rootTreeNode]
  );

  const showNoMatchesState = !getIsTreeNodeVisibleInTree(rootTreeNode.key);
  const headerRightIconStyle = { margin: `4px ${(isXSWidth ? 0 : TREE_SPACING) + 2}px 4px 8px` };

  return (
    <TopicTreeV2Container
      isXSWidth={isXSWidth}
      className="ant-component"
      style={{ maxHeight: containerHeight - CONTAINER_SPACING * 3 }}>
      <TopicTreeSwitcher
        showErrorBadge={!renderTopicTree && Object.keys(sceneErrorsByKey).length > 0}
        pinTopics={pinTopics}
        renderTopicTree={renderTopicTree}
        saveConfig={saveConfig}
        setShowTopicTree={setShowTopicTree}
        showTopicTree={showTopicTree}
      />
      {renderTopicTree && (
        <STopicTreeV2 onClick={(e) => e.stopPropagation()}>
          <div style={{ width: treeWidth }}>
            <STopicTreeHeader>
              <SFilter>
                <Icon style={{ color: "rgba(255,255,255, 0.3)" }}>
                  <MagnifyIcon style={{ width: 16, height: 16 }} />
                </Icon>
                <SInput
                  size={3}
                  data-test="topic-tree-filter-input"
                  value={filterText}
                  placeholder="Type to filter"
                  onChange={(event) => setFilterText(event.target.value)}
                  ref={filterTextFieldRef}
                />
              </SFilter>
              {rootTreeNode.providerAvailable && (
                <TopicViewModeSelector
                  isXSWidth={isXSWidth}
                  saveConfig={saveConfig}
                  topicDisplayMode={topicDisplayMode}
                />
              )}
              {!filterText && (
                <Icon
                  dataTest="expand-all-icon"
                  tooltip={topLevelNodesCollapsed ? "Expand all" : "Collapse all"}
                  small
                  fade
                  onClick={() => {
                    saveConfig({ expandedKeys: topLevelNodesCollapsed ? allKeys : [] }, { keepLayoutInUrl: true });
                  }}
                  style={headerRightIconStyle}>
                  {topLevelNodesCollapsed ? <MoreIcon /> : <LessIcon />}
                </Icon>
              )}
              {filterText && (
                <Icon
                  dataTest="clear-filter-icon"
                  small
                  fade
                  style={headerRightIconStyle}
                  onClick={() => setFilterText("")}>
                  <CloseIcon />
                </Icon>
              )}
            </STopicTreeHeader>
            <div ref={scrollContainerRef} style={{ overflow: "auto", width: treeWidth }}>
              {showNoMatchesState ? (
                <SNoMatches>
                  <NoMatchesSvg />
                  <SNoMatchesText>No results found. Try searching a different term.</SNoMatchesText>
                </SNoMatches>
              ) : (
                <Tree
                  treeData={renderTreeNodes({
                    availableNamespacesByTopic,
                    checkedKeysSet,
                    children: rootTreeNode.children || [],
                    getIsTreeNodeVisibleInScene,
                    getIsTreeNodeVisibleInTree,
                    getIsNamespaceCheckedByDefault,
                    isXSWidth,
                    sceneErrorsByKey,
                    setCurrentEditingTopic,
                    derivedCustomSettingsByKey,
                    toggleCheckAllAncestors,
                    toggleCheckAllDescendants,
                    toggleNamespaceChecked,
                    toggleNodeChecked,
                    toggleNodeExpanded,
                    topicDisplayMode,
                    width: treeWidth,
                    filterText,
                  })}
                  height={treeHeight}
                  itemHeight={ROW_HEIGHT}
                  // Disable motion because it seems to cause a bug in the `rc-tree` (used under the hood by `antd` for
                  // the tree). This bug would result in nodes no longer being rendered after a search.
                  motion={null}
                  selectable={false}
                  onExpand={(newExpandedKeys) => {
                    if (!shouldExpandAllKeys) {
                      saveConfig({ expandedKeys: newExpandedKeys }, { keepLayoutInUrl: true });
                    }
                  }}
                  expandedKeys={shouldExpandAllKeys ? allKeys : expandedKeysRef.current}
                  autoExpandParent={false /* Set autoExpandParent to true when filtering */}
                  switcherIcon={
                    <SSwitcherIcon style={filterText ? { width: 0, height: 0, overflow: "hidden" } : {}}>
                      <ChevronDownIcon
                        fill="currentColor"
                        style={{ width: SWITCHER_ICON_SIZE, height: SWITCHER_ICON_SIZE }}
                      />
                    </SSwitcherIcon>
                  }
                />
              )}
            </div>
          </div>
        </STopicTreeV2>
      )}
    </TopicTreeV2Container>
  );
}

export default React.memo<Props>(TopicTreeV2);
