// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import SearchIcon from "@mdi/svg/svg/magnify.svg";
import { Tree } from "antd";
import fuzzySort from "fuzzysort";
import { intersection, omit, uniq, flatten, difference } from "lodash";
import React, { useState, useEffect, useMemo } from "react";
import { useDebounce } from "use-debounce";

import { SAddContainer, SOptionsWrapper, SActionWrapper, SOptions } from "./AddFromAllTopics";
import { DEFAULT_DEBOUNCE_TIME } from "./constants";
import { SInputWrapper, SInput } from "./QuickAddTopic";
import { TOPIC_CONFIG, transformTopicTree, removeBlankSpaces, type TreeNodeConfig } from "./topicGroupsUtils";
import TopicNameDisplay from "./TopicNameDisplay";
import Button from "webviz-core/src/components/Button";
import Icon from "webviz-core/src/components/Icon";
import { colors } from "webviz-core/src/util/sharedStyleConstants";

export type NodeListItem = {|
  topicName?: string,
  name?: string,
  key: string,
  filterKey: string,
  parentKeys: string[],
  filePrepared?: { target: string },
|};

export type PopularTopicTreeNode = {|
  ...NodeListItem,
  children?: PopularTopicTreeNode[],
|};

// Generate a new tree for rendering, and a nodeList for quick filtering and extracting topic names.
export function generateNewTreeAndCreateNodeList(
  oldTreeData: TreeNodeConfig[],
  parentKeys: string[]
): { treeData: PopularTopicTreeNode[], nodeList: NodeListItem[] } {
  const nodeList: NodeListItem[] = [];
  const newTreeData: PopularTopicTreeNode[] = [];
  for (let i = 0; i < oldTreeData.length; i++) {
    const oldNode = oldTreeData[i];
    const parentKeysStr = parentKeys.length ? `${parentKeys.join(" ")} ` : "";
    const newNode = {
      ...omit(oldNode, "children"),
      // Add unique key for each tree node, use topicName as primary key in order to derive checked keys by topics from the topic group.
      key: oldNode.topicName || oldNode.name,
      // Combine topicName and name as a single key for fast filtering.
      filterKey: `${parentKeysStr}${oldNode.name ? `${oldNode.name} ` : ""}${oldNode.topicName || ""}`,
      parentKeys,
    };
    nodeList.push(omit(newNode, "children"));
    if (oldNode.children) {
      const res = generateNewTreeAndCreateNodeList(oldNode.children, [...parentKeys, newNode.key]);
      newNode.children = res.treeData;
      nodeList.push(...res.nodeList);
    }
    newTreeData.push(newNode);
  }
  return { treeData: newTreeData, nodeList };
}

type Props = {|
  defaultFilterText?: ?string,
  existingGroupTopicsSet: Set<string>,
  onCloseModal: () => void,
  onSave: (string[]) => void,
|};

function renderTreeNodes({
  data,
  filterText,
  onlySearchOnTopicNames,
  existingGroupTopicsSet,
  expandedKeys,
  matchedNodeKeysSet,
}: {
  data: PopularTopicTreeNode[],
  filterText: string,
  onlySearchOnTopicNames: boolean,
  existingGroupTopicsSet: Set<string>,
  expandedKeys: string[],
  matchedNodeKeysSet: ?Set<string>,
}) {
  return data
    .map((item) => {
      const isNodeSelectedFromTopicGroup = item.topicName && existingGroupTopicsSet.has(item.topicName);
      if (
        matchedNodeKeysSet &&
        matchedNodeKeysSet.size > 0 &&
        !(matchedNodeKeysSet.has(item.key) || expandedKeys.includes(item.key))
      ) {
        return null;
      }
      return (
        <Tree.TreeNode
          key={item.key}
          title={
            <TopicNameDisplay
              style={{ marginLeft: 8 }}
              // $FlowFixMe either name or topicName has to be present on each tree node
              displayName={item.name || item.topicName}
              topicName={item.topicName || ""}
              searchText={filterText}
            />
          }
          style={{ color: isNodeSelectedFromTopicGroup ? colors.TEXT_MUTED : "unset" }}>
          {item.children &&
            renderTreeNodes({
              data: item.children,
              filterText,
              onlySearchOnTopicNames,
              existingGroupTopicsSet,
              expandedKeys,
              matchedNodeKeysSet,
            })}
        </Tree.TreeNode>
      );
    })
    .filter(Boolean);
}

export default function AddFromPopularTopics({
  defaultFilterText,
  existingGroupTopicsSet,
  onCloseModal,
  onSave,
}: Props) {
  const [expandedKeys, setExpandedKeys] = useState<string[]>([]);
  const [matchedNodeKeys, setMatchedNodeKeys] = useState<string[]>([]);
  const [autoExpandParent, setAutoExpandParent] = useState<boolean>(true);
  const [filterText, setFilterText] = useState<string>(defaultFilterText || "");
  const filterTextWithoutSpaces = useMemo(() => removeBlankSpaces(filterText), [filterText]);
  const [debouncedFilterText] = useDebounce(filterTextWithoutSpaces, DEFAULT_DEBOUNCE_TIME);
  const onlySearchOnTopicNames = !!(debouncedFilterText && debouncedFilterText.startsWith("/"));

  const { treeData, nodeList, topicTreeTopics } = useMemo(() => {
    const treeConfig = transformTopicTree(TOPIC_CONFIG);
    const result = generateNewTreeAndCreateNodeList(treeConfig.children || [], []);
    return {
      ...result,
      topicTreeTopics: result.nodeList.map((item) => (item.topicName ? item.topicName : null)).filter(Boolean),
    };
  }, []);

  const [checkedKeys, setCheckedKeys] = useState<string[]>(() =>
    intersection(topicTreeTopics, [...existingGroupTopicsSet])
  );
  const checkedTopics = useMemo(() => checkedKeys.filter((node) => node.startsWith("/")), [checkedKeys]);

  useEffect(
    () => {
      // Fuzzy search on a few hundred nodes and find all the expanded parent keys can be expensive, debounce and
      // put in the useEffect (v.s. inside onInputChange) to improve UX.
      if (debouncedFilterText) {
        const matchedNode: NodeListItem[] = fuzzySort
          .go(debouncedFilterText, nodeList, {
            allowTypo: false,
            keys: onlySearchOnTopicNames ? ["topicName"] : ["filterKey"],
            limit: 50,
            threshold: -50000, // Threshold for better matches.
          })
          .map((res: { obj: NodeListItem }) => res.obj);
        const parentKeys = uniq(flatten(matchedNode.map((node) => node.parentKeys)));
        setExpandedKeys(parentKeys);
        setMatchedNodeKeys(matchedNode.map((node) => node.key));
      } else {
        setExpandedKeys([]);
        setMatchedNodeKeys([]);
      }
    },
    [debouncedFilterText, nodeList, onlySearchOnTopicNames]
  );

  const checkedTopicsByVisibility = useMemo(
    () => {
      let visibleCheckedTopics = checkedTopics;
      let invisibleCheckedTopics = [];
      if (debouncedFilterText) {
        // Only include checked topics that exist in the tree to prevent non-existing checkedKey warning.
        visibleCheckedTopics = intersection(checkedTopics, matchedNodeKeys);
        invisibleCheckedTopics = difference(checkedTopics, visibleCheckedTopics);
      }
      return { visibleCheckedTopics, invisibleCheckedTopics };
    },
    [checkedTopics, debouncedFilterText, matchedNodeKeys]
  );

  return (
    <SAddContainer>
      <SInputWrapper style={{ paddingLeft: 16 }}>
        <Icon small fade>
          <SearchIcon />
        </Icon>
        <SInput
          data-test="popular-topics-input"
          placeholder="Filter popular topics"
          value={filterText}
          onChange={(e) => {
            setFilterText(e.target.value);
            if (!autoExpandParent) {
              setAutoExpandParent(true);
            }
          }}
        />
      </SInputWrapper>
      <SOptionsWrapper className="ant-component">
        <SOptions style={{ padding: "0 8px" }}>
          <Tree
            checkable
            selectable={false}
            checkedKeys={checkedTopicsByVisibility.visibleCheckedTopics}
            onCheck={(newCheckedKeys) => {
              setCheckedKeys(uniq([...checkedTopicsByVisibility.invisibleCheckedTopics, ...newCheckedKeys]));
            }}
            onExpand={(newExpandedKeys) => {
              setExpandedKeys(newExpandedKeys);
              setAutoExpandParent(false);
            }}
            expandedKeys={expandedKeys}
            autoExpandParent={autoExpandParent}>
            {renderTreeNodes({
              data: treeData,
              filterText: debouncedFilterText,
              onlySearchOnTopicNames,
              existingGroupTopicsSet,
              expandedKeys,
              matchedNodeKeysSet: debouncedFilterText ? new Set(matchedNodeKeys) : undefined,
            })}
          </Tree>
        </SOptions>
      </SOptionsWrapper>
      <SActionWrapper>
        <Button style={{ marginRight: 8 }} onClick={onCloseModal}>
          Cancel
        </Button>
        <Button
          isPrimary
          className="test-popular-topics-save-button"
          onClick={() => {
            onSave(checkedTopics);
            onCloseModal();
          }}>
          Save ({checkedTopics.length} {checkedTopics.length > 1 ? "topics" : "topic"})
        </Button>
      </SActionWrapper>
    </SAddContainer>
  );
}
