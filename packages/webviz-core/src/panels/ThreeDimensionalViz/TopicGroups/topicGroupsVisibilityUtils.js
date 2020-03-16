// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import type { TopicGroupType, TopicItem, VisibilityByColumn } from "./types";

export function toggleVisibility(visibilityByColumn: VisibilityByColumn): VisibilityByColumn {
  if (visibilityByColumn.some((val) => val)) {
    // If any are turned on, turn all off.
    return visibilityByColumn.map((val) => false);
  }
  // Otherwise, turn all on.
  return visibilityByColumn.map((val) => true);
}

export function toggleAllForGroupVisibility(topicGroup: TopicGroupType, columnIndex: number): TopicGroupType {
  const newGroupVisibilityByColumn = [...(topicGroup.visibilityByColumn || [false, false])];
  const newVisible = !newGroupVisibilityByColumn[columnIndex];
  newGroupVisibilityByColumn[columnIndex] = newVisible;

  const newItems = topicGroup.items.map((item) => {
    const newTopicVisibilityByColumn = [...(item.visibilityByColumn || [false, false])];
    newTopicVisibilityByColumn[columnIndex] = newVisible;
    return { ...item, visibilityByColumn: newTopicVisibilityByColumn };
  });
  return { ...topicGroup, items: newItems, visibilityByColumn: newGroupVisibilityByColumn };
}

export function keyboardToggleAllForGroupVisibility(topicGroup: TopicGroupType): TopicGroupType {
  const newGroupVisibilityByColumn = toggleVisibility([...(topicGroup.visibilityByColumn || [false, false])]);
  return {
    ...topicGroup,
    items: topicGroup.items.map((item) => ({ ...item, visibilityByColumn: [...newGroupVisibilityByColumn] })),
    visibilityByColumn: newGroupVisibilityByColumn,
  };
}

export function toggleAllForTopicVisibility(topicItem: TopicItem, columnIndex: number): TopicItem {
  const newVisible = !(topicItem.visibilityByColumn || [false, false])[columnIndex];
  const newTopicVisibilityByColumn = [...(topicItem.visibilityByColumn || [false, false])];
  newTopicVisibilityByColumn[columnIndex] = newVisible;
  const newSelectedNsByColumn = [...(topicItem.selectedNamespacesByColumn || [[], []])];
  if (topicItem.derivedFields.namespaceDisplayVisibilityByNamespace) {
    if (newVisible) {
      const allNsItems = Object.keys(topicItem.derivedFields.namespaceDisplayVisibilityByNamespace);
      newSelectedNsByColumn[columnIndex] = allNsItems;
    } else {
      newSelectedNsByColumn[columnIndex] = [];
    }
  }
  return {
    ...topicItem,
    visibilityByColumn: newTopicVisibilityByColumn,
    selectedNamespacesByColumn: newSelectedNsByColumn,
  };
}

export function keyboardToggleAllForTopicVisibility(topicItem: TopicItem): TopicItem {
  const newTopicVisibilityByColumn = toggleVisibility([...(topicItem.visibilityByColumn || [false, false])]);
  const newSelectedNsByColumn = [...(topicItem.selectedNamespacesByColumn || [[], []])];
  const allNsItems = Object.keys(topicItem.derivedFields.namespaceDisplayVisibilityByNamespace || {});
  newTopicVisibilityByColumn.forEach((newVisible, columnIndex) => {
    if (topicItem.derivedFields.namespaceDisplayVisibilityByNamespace) {
      if (newVisible) {
        newSelectedNsByColumn[columnIndex] = allNsItems;
      } else {
        newSelectedNsByColumn[columnIndex] = [];
      }
    }
  });
  return {
    ...topicItem,
    visibilityByColumn: newTopicVisibilityByColumn,
    selectedNamespacesByColumn: newSelectedNsByColumn,
  };
}
