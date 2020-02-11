// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { Icon, Tree } from "antd";
import fuzzySort from "fuzzysort";
import { intersection, omit, uniq, flatten } from "lodash";
import React, { useRef, useState, useEffect, useMemo } from "react";

import { SAddContainer, SOptionsWrapper, SActionWrapper, SOptions } from "./AddFromAllTopics";
import { SInputWrapper, SInput } from "./QuickAddTopic";
import { TOPIC_CONFIG, transformTopicTree, type TreeNodeConfig } from "./topicGroupsUtils";
import TopicNameDisplay from "./TopicNameDisplay";
import Button from "webviz-core/src/components/Button";
import { colors } from "webviz-core/src/util/colors";
import { useDebouncedValue } from "webviz-core/src/util/hooks";

type NodeListItem = {|
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
    const newNode = {
      ...omit(oldNode, "children"),
      // Add unique key for each tree node, use topicName as primary key in order to derive checked keys by topics from the topic group.
      key: oldNode.topicName || oldNode.name,
      // Combine topicName and name as a single key for fast filtering.
      filterKey: `${oldNode.name || ""} ${oldNode.topicName || ""}`,
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
}: {
  data: PopularTopicTreeNode[],
  filterText: string,
  onlySearchOnTopicNames: boolean,
  existingGroupTopicsSet: Set<string>,
  expandedKeys: string[],
}) {
  return data.map((item) => {
    const isNodeSelectedFromTopicGroup = item.topicName && existingGroupTopicsSet.has(item.topicName);

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
          })}
      </Tree.TreeNode>
    );
  });
}

export default function AddFromPopularTopics({
  defaultFilterText,
  existingGroupTopicsSet,
  onCloseModal,
  onSave,
}: Props) {
  const [expandedKeys, setExpandedKeys] = useState<string[]>([]);
  const [autoExpandParent, setAutoExpandParent] = useState<boolean>(true);
  const [filterText, setFilterText] = useState<string>(defaultFilterText || "");
  const debouncedFilterText = useDebouncedValue(filterText, 100);
  const onlySearchOnTopicNames = !!(debouncedFilterText && debouncedFilterText.startsWith("/"));

  const { treeData, nodeList, topicTreeTopics } = useMemo(() => {
    const treeConfig = transformTopicTree(TOPIC_CONFIG);
    const result = generateNewTreeAndCreateNodeList(treeConfig.children || [], []);
    return {
      ...result,
      topicTreeTopics: result.nodeList.map((item) => (item.topicName ? item.topicName : null)).filter(Boolean),
    };
  }, []);

  const [checkedTopics, setCheckedTopics] = useState<string[]>(() =>
    intersection(topicTreeTopics, [...existingGroupTopicsSet])
  );
  const preparedFilterItemsRef = useRef<?(NodeListItem[])>(undefined);

  useEffect(
    () => {
      // Modify the items to add filePrepared field in order to speed up filtering.
      preparedFilterItemsRef.current = nodeList.map((item) => (item.filePrepared = fuzzySort.prepare(item.filterKey)));
    },
    [nodeList]
  );

  useEffect(
    () => {
      // Fuzzy search on a few hundred nodes and find all the expanded parent keys can be expensive, debounce and
      // put in the useEffect (v.s. inside onInputChange) to improve UX.
      if (debouncedFilterText) {
        const matchedNode: NodeListItem[] = fuzzySort
          .go(debouncedFilterText, preparedFilterItemsRef.current || nodeList, {
            allowTypo: false,
            keys: onlySearchOnTopicNames ? ["topicName"] : ["filterKey"],
            limit: 50,
            threshold: -10000,
          })
          .map((res: { obj: NodeListItem }) => res.obj);
        const parentKeys = uniq(flatten(matchedNode.map((node) => node.parentKeys)));
        setExpandedKeys(parentKeys);
      } else {
        setExpandedKeys([]);
      }
    },
    [debouncedFilterText, nodeList, onlySearchOnTopicNames]
  );

  return (
    <SAddContainer>
      <SInputWrapper style={{ paddingLeft: 16 }}>
        <Icon type="search" style={{ paddingRight: 2 }} />
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
            checkedKeys={checkedTopics}
            onCheck={setCheckedTopics}
            onExpand={(newExpandedKeys) => {
              setExpandedKeys(newExpandedKeys);
              setAutoExpandParent(false);
            }}
            expandedKeys={expandedKeys}
            autoExpandParent={autoExpandParent}>
            {renderTreeNodes({
              data: treeData,
              filterText,
              onlySearchOnTopicNames,
              existingGroupTopicsSet,
              expandedKeys,
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
            onSave(checkedTopics.filter((item) => item.startsWith("/")));
            onCloseModal();
          }}>
          Save
        </Button>
      </SActionWrapper>
    </SAddContainer>
  );
}
