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
import { groupBy } from "lodash";
import Tree from "rc-tree";
import React, { useCallback, useEffect, useMemo, useRef } from "react";
import { useSpring, animated } from "react-spring";
import styled from "styled-components";

import { type Save3DConfig } from "../index";
import DiffModeSettings from "./DiffModeSettings";
import NoMatchesSvg from "./noMatches.svg";
import renderTreeNodes from "./renderTreeNodes";
import TopicTreeSwitcher from "./TopicTreeSwitcher";
import TopicViewModeSelector from "./TopicViewModeSelector";
import { ROW_HEIGHT } from "./TreeNodeRow";
import type {
  DerivedCustomSettingsByKey,
  GetIsNamespaceCheckedByDefault,
  GetIsTreeNodeVisibleInScene,
  GetIsTreeNodeVisibleInTree,
  NamespacesByTopic,
  OnNamespaceOverrideColorChange,
  SceneErrorsByKey,
  SetCurrentEditingTopic,
  SetEditingNamespace,
  TopicDisplayMode,
  TreeNode,
  VisibleTopicsCountByKey,
} from "./types";
import Dimensions from "webviz-core/src/components/Dimensions";
import Icon from "webviz-core/src/components/Icon";
import useLinkedGlobalVariables from "webviz-core/src/panels/ThreeDimensionalViz/Interactions/useLinkedGlobalVariables";
import type { StructuralDatatypes } from "webviz-core/src/panels/ThreeDimensionalViz/utils/datatypes";
import { useChangeDetector } from "webviz-core/src/util/hooks";
import { colors } from "webviz-core/src/util/sharedStyleConstants";

const CONTAINER_SPACING = 15;
const DEFAULT_WIDTH = 360;
const SWITCHER_WIDTH = 24;
const TREE_SPACING = 8;
const TREE_INDENT_PER_LEVEL = 16;
const BORDER_RADIUS = 6;

const STopicTreeWrapper = styled.div`
  position: absolute;
  top: ${CONTAINER_SPACING}px;
  left: ${CONTAINER_SPACING}px;
  z-index: 102;
  height: calc(100% - ${CONTAINER_SPACING * 2}px);
  width: calc(100% - ${CONTAINER_SPACING * 2}px);

  // Allow clicks right above the TopicTree to close it
  pointer-events: none;
  display: flex;
  flex-direction: column;

  min-width: 100px;
  max-width: calc(100% - 100px);
`;

const STopicTreeResizable = styled.div`
  width: ${DEFAULT_WIDTH}px;
  min-width: 176px;
  max-width: 100%;
  display: flex;
  flex-direction: column;
  resize: horizontal;
  overflow: hidden;
  background: ${colors.DARK2};
  pointer-events: auto;
  border-bottom-left-radius: ${BORDER_RADIUS}px;
  border-bottom-right-radius: ${BORDER_RADIUS}px;
`;

const STopicTree = styled(animated.div)`
  flex: 1 1 auto;
  position: relative;
  color: ${colors.TEXT};
  max-width: 100%;
  pointer-events: none;
  min-height: 0;
  display: flex;
`;

const STopicTreeInner = styled.div`
  display: flex;
  min-width: 0;
  flex-direction: column;

  .rc-tree {
    .rc-tree-list-holder {
      padding-bottom: 8px;
    }

    li {
      ul {
        padding: 0 0 0 ${SWITCHER_WIDTH}px;
      }
    }
    .rc-tree-node-content-wrapper {
      cursor: unset;
      flex: 1 1;
      min-width: 0;
    }
    /* Make the chevron icon transition nicely between pointing down and right. */
    .rc-tree-switcher {
      flex: 0 0;
      height: ${ROW_HEIGHT}px;
      transition: transform 80ms ease-in-out;
    }
    .rc-tree-switcher_close {
      transform: rotate(-90deg);
    }
    .rc-tree-switcher_open {
      transform: rotate(0deg);
    }
    /* Hide the chevron switcher icon when it's not usable. */
    .rc-tree-switcher-noop {
      visibility: hidden;
      width: ${SWITCHER_WIDTH}px;
    }
    .rc-tree-treenode {
      display: flex;
      padding: 0 ${TREE_SPACING}px;
      &:hover {
        background: ${colors.DARK4};
      }
      &.rc-tree-treenode-disabled {
        color: ${colors.TEXT_MUTED};
        cursor: unset;
        .rc-tree-node-content-wrapper {
          cursor: unset;
        }
      }
    }
    .rc-tree-indent {
      display: flex;
      flex: 0 0 auto;
    }
    .rc-tree-indent-unit {
      transition: width 0.2s;
      width: ${TREE_INDENT_PER_LEVEL}px;
    }
    .rc-tree-treenode-switcher-close,
    .rc-tree-treenode-switcher-open {
      .rc-tree-node-content-wrapper {
        padding: 0;
      }
    }
  }
`;

const STopicTreeHeader = styled.div`
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  pointer-events: auto;
  background-color: ${colors.DARK5};
  border-top-left-radius: ${BORDER_RADIUS}px;
  border-top-right-radius: ${BORDER_RADIUS}px;
  overflow: hidden;
  position: relative;
  height: 40px;
`;

const STopicTreeHeaderCollapse = styled.div`
  overflow: hidden;
  display: flex;
  flex: 1 1 0px;
  min-width: 0;
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  align-items: center;
  padding-left: 8px;
  justify-content: space-between;
`;

const SFilter = styled.div`
  display: flex;
  padding: 8px 4px;
  align-items: center;
  flex: 1;
  min-width: 0;
`;

const SInput = styled.input`
  height: 24px;
  background: transparent;
  flex: 1;
  overflow: auto;
  font-size: 12px;
  margin-left: 4px;
  padding: 4px 8px;
  min-width: 80px;
  border: none;
  overflow: hidden;
  :focus,
  :hover {
    outline: none;
    background: transparent;
  }
`;

const SSwitcherIcon = styled.div`
  width: ${SWITCHER_WIDTH}px;
  height: ${ROW_HEIGHT}px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
`;

const SNoMatches = styled.div`
  padding: 57px 8px 74px 8px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  background-color: ${colors.DARK2};
  border-bottom-left-radius: ${BORDER_RADIUS}px;
  border-bottom-right-radius: ${BORDER_RADIUS}px;
`;

const SNoMatchesText = styled.div`
  margin-top: 25px;
  font-size: 16px;
  width: 205px;
  text-align: center;
  line-height: 130%;
`;

type SharedProps = {|
  allKeys: string[],
  availableNamespacesByTopic: NamespacesByTopic,
  checkedKeys: string[],
  derivedCustomSettingsByKey: DerivedCustomSettingsByKey,
  expandedKeys: string[],
  filterText: string,
  getIsNamespaceCheckedByDefault: GetIsNamespaceCheckedByDefault,
  getIsTreeNodeVisibleInScene: GetIsTreeNodeVisibleInScene,
  getIsTreeNodeVisibleInTree: GetIsTreeNodeVisibleInTree,
  hasFeatureColumn: boolean,
  isPlaying?: boolean,
  onExitTopicTreeFocus: () => void,
  onNamespaceOverrideColorChange: OnNamespaceOverrideColorChange,
  pinTopics: boolean,
  diffModeEnabled: boolean,
  rootTreeNode: TreeNode,
  saveConfig: Save3DConfig,
  sceneErrorsByKey: SceneErrorsByKey,
  setCurrentEditingTopic: SetCurrentEditingTopic,
  setEditingNamespace: SetEditingNamespace,
  setFilterText: (string) => void,
  setShowTopicTree: (boolean | ((boolean) => boolean)) => void,
  shouldExpandAllKeys: boolean,
  showTopicTree: boolean,
  structuralDatatypes: StructuralDatatypes,
  topicDisplayMode: TopicDisplayMode,
  visibleTopicsCountByKey: VisibleTopicsCountByKey,
|};

type Props = {|
  ...SharedProps,
|};

type BaseProps = {|
  ...SharedProps,
  showDiffMode: boolean,
|};

function TopicTree({
  allKeys,
  availableNamespacesByTopic,
  checkedKeys,
  derivedCustomSettingsByKey,
  expandedKeys,
  filterText,
  getIsNamespaceCheckedByDefault,
  getIsTreeNodeVisibleInScene,
  getIsTreeNodeVisibleInTree,
  hasFeatureColumn,
  onNamespaceOverrideColorChange,
  pinTopics,
  diffModeEnabled,
  rootTreeNode,
  saveConfig,
  sceneErrorsByKey,
  setCurrentEditingTopic,
  setEditingNamespace,
  setFilterText,
  setShowTopicTree,
  shouldExpandAllKeys,
  showTopicTree,
  showDiffMode,
  structuralDatatypes,
  topicDisplayMode,
  visibleTopicsCountByKey,
}: BaseProps) {
  const renderTopicTree = pinTopics || showTopicTree;
  const checkedKeysSet = useMemo(() => new Set(checkedKeys), [checkedKeys]);

  const filterTextFieldRef = useRef<?HTMLInputElement>();

  // HACK: rc-tree does not auto expand dynamic tree nodes. Create a copy of expandedNodes
  // to ensure newly added nodes such as `uncategorized` are properly expanded:
  // https://github.com/ant-design/ant-design/issues/18012
  const expandedKeysRef = useRef(expandedKeys);
  const hasRootNodeChanged = useChangeDetector([rootTreeNode], false);
  expandedKeysRef.current = hasRootNodeChanged ? [...expandedKeys] : expandedKeys;

  useEffect(() => {
    // auto focus whenever first rendering the topic tree
    if (renderTopicTree && filterTextFieldRef.current) {
      const filterTextFieldEl: HTMLInputElement = filterTextFieldRef.current;
      filterTextFieldEl.focus();
      filterTextFieldEl.select();
    }
  }, [renderTopicTree]);

  const topLevelNodesCollapsed = useMemo(() => {
    const topLevelChildren = rootTreeNode.type === "group" ? rootTreeNode.children : [];
    const topLevelKeys = topLevelChildren.map(({ key }) => key);
    return topLevelKeys.every((key) => !expandedKeys.includes(key));
  }, [expandedKeys, rootTreeNode]);

  const showNoMatchesState = !getIsTreeNodeVisibleInTree(rootTreeNode.key);
  const headerRightIconStyle = { margin: `4px ${TREE_SPACING}px 4px 8px` };

  const { linkedGlobalVariables } = useLinkedGlobalVariables();
  const linkedGlobalVariablesByTopic = groupBy(linkedGlobalVariables, ({ topic }) => topic);

  // Close the TopicTree if the user hits the "Escape" key
  const onKeyDown = useCallback((event: SyntheticKeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Escape" && document.activeElement) {
      document.activeElement.blur();
      setShowTopicTree(false);
    }
  }, [setShowTopicTree]);

  const treeData = useMemo(
    () =>
      renderTreeNodes({
        availableNamespacesByTopic,
        checkedKeysSet,
        children: rootTreeNode.type === "group" ? rootTreeNode.children : [],
        getIsTreeNodeVisibleInScene,
        getIsTreeNodeVisibleInTree,
        getIsNamespaceCheckedByDefault,
        hasFeatureColumn,
        onNamespaceOverrideColorChange,
        sceneErrorsByKey,
        setCurrentEditingTopic,
        derivedCustomSettingsByKey,
        setEditingNamespace,
        structuralDatatypes,
        topicDisplayMode,
        visibleTopicsCountByKey,
        filterText,
        linkedGlobalVariablesByTopic,
        diffModeEnabled: hasFeatureColumn && diffModeEnabled,
      }),
    [
      availableNamespacesByTopic,
      checkedKeysSet,
      derivedCustomSettingsByKey,
      diffModeEnabled,
      filterText,
      getIsNamespaceCheckedByDefault,
      getIsTreeNodeVisibleInScene,
      getIsTreeNodeVisibleInTree,
      hasFeatureColumn,
      linkedGlobalVariablesByTopic,
      onNamespaceOverrideColorChange,
      rootTreeNode,
      sceneErrorsByKey,
      setCurrentEditingTopic,
      setEditingNamespace,
      structuralDatatypes,
      topicDisplayMode,
      visibleTopicsCountByKey,
    ]
  );

  return (
    <STopicTreeInner>
      <STopicTreeHeader>
        <STopicTreeHeaderCollapse>
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
              onKeyDown={onKeyDown}
              ref={filterTextFieldRef}
            />
          </SFilter>
          {rootTreeNode.providerAvailable && (
            <TopicViewModeSelector saveConfig={saveConfig} topicDisplayMode={topicDisplayMode} />
          )}
          {!filterText && (
            <Icon
              dataTest="expand-all-icon"
              tooltip={topLevelNodesCollapsed ? "Expand all" : "Collapse all"}
              small
              fade
              onClick={() => {
                saveConfig({ expandedKeys: topLevelNodesCollapsed ? allKeys : [] });
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
        </STopicTreeHeaderCollapse>
      </STopicTreeHeader>
      {showDiffMode && <DiffModeSettings enabled={diffModeEnabled} saveConfig={saveConfig} />}

      <div style={{ flex: "1 1 auto", overflow: "hidden" }}>
        <Dimensions>
          {({ height: treeHeight }) => (
            <STopicTreeResizable>
              {showNoMatchesState ? (
                <SNoMatches>
                  <NoMatchesSvg />
                  <SNoMatchesText>No results found. Try searching a different term.</SNoMatchesText>
                </SNoMatches>
              ) : (
                <Tree
                  treeData={treeData}
                  height={treeHeight}
                  itemHeight={ROW_HEIGHT}
                  // Disable motion because it seems to cause a bug in the `rc-tree` (used under the hood by `antd` for
                  // the tree). This bug would result in nodes no longer being rendered after a search.
                  motion={null}
                  selectable={false}
                  onExpand={(newExpandedKeys) => {
                    if (!shouldExpandAllKeys) {
                      saveConfig({ expandedKeys: newExpandedKeys });
                    }
                  }}
                  expandedKeys={shouldExpandAllKeys ? allKeys : expandedKeysRef.current}
                  autoExpandParent={false /* Set autoExpandParent to true when filtering */}
                  switcherIcon={
                    <SSwitcherIcon style={filterText ? { visibility: "hidden" } : {}}>
                      <ChevronDownIcon fill="currentColor" style={{ width: 20, height: 20 }} />
                    </SSwitcherIcon>
                  }
                />
              )}
            </STopicTreeResizable>
          )}
        </Dimensions>
      </div>
    </STopicTreeInner>
  );
}

// An animated wrapper.
function TopicTreeWrapper({ pinTopics, showTopicTree, hasFeatureColumn, ...rest }: Props) {
  const renderTopicTree = pinTopics || showTopicTree;
  const { sceneErrorsByKey, saveConfig, setShowTopicTree, isPlaying } = rest;
  const springProps = useSpring({
    native: true,
    unique: true,
    precision: 0.1,
    // Skip the animation if we are playing because it looks nicer than having the animation lag
    immediate: isPlaying,
    to: { opacity: renderTopicTree ? 1 : 0, transformX: renderTopicTree ? 0 : -20 },
    config: { tension: 340, friction: 26, clamp: true },
  });

  return (
    <STopicTreeWrapper>
      <TopicTreeSwitcher
        showErrorBadge={!renderTopicTree && Object.keys(sceneErrorsByKey).length > 0}
        pinTopics={pinTopics}
        renderTopicTree={renderTopicTree}
        saveConfig={saveConfig}
        setShowTopicTree={setShowTopicTree}
      />
      <STopicTree
        onClick={(e) => e.stopPropagation()}
        style={{
          opacity: springProps.opacity,
          transform: springProps.transformX.interpolate((x) => (x === 0 ? "none" : `translate3d(${x}px, 0px, 0px)`)),
        }}>
        {renderTopicTree && (
          <TopicTree
            {...rest}
            pinTopics={pinTopics}
            showTopicTree={showTopicTree}
            showDiffMode={hasFeatureColumn}
            hasFeatureColumn={hasFeatureColumn}
          />
        )}
      </STopicTree>
    </STopicTreeWrapper>
  );
}

export default React.memo<Props>(TopicTreeWrapper);
