// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { cloneDeep } from "lodash";

import type { TopicGroupType, TopicItem, VisibilityByColumn, NamespacesByColumn } from "./types";

export function toggleVisibility(visibilityByColumn: VisibilityByColumn): VisibilityByColumn {
  if (visibilityByColumn.some((val) => val)) {
    // If any are turned on, turn all off.
    return visibilityByColumn.map(() => false);
  }
  // Otherwise, turn all on.
  return visibilityByColumn.map(() => true);
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
  if (topicItem.derivedFields.sortedNamespaceDisplayVisibilityByColumn) {
    if (newVisible) {
      const availableNamespacesByColumn = topicItem.derivedFields.availableNamespacesByColumn;
      // Either select all available namespaces in the column or use fallback to undefined which will make all available namespaces visible.
      newSelectedNsByColumn[columnIndex] =
        (availableNamespacesByColumn && availableNamespacesByColumn[columnIndex]) || undefined;
    } else {
      // Select none.
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
  newTopicVisibilityByColumn.forEach((newVisible, columnIndex) => {
    if (topicItem.derivedFields.sortedNamespaceDisplayVisibilityByColumn) {
      const availableNamespacesByColumn = topicItem.derivedFields.availableNamespacesByColumn;
      if (newVisible) {
        newSelectedNsByColumn[columnIndex] =
          (availableNamespacesByColumn && availableNamespacesByColumn[columnIndex]) || undefined;
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

export function toggleNamespace(
  selectedNamespacesByColumn: NamespacesByColumn,
  availableNamespacesByColumn: NamespacesByColumn,
  nsName: string,
  columnIndex: number
): NamespacesByColumn {
  const existingSelectedNamespaces = selectedNamespacesByColumn[columnIndex];
  const result = cloneDeep(selectedNamespacesByColumn);
  const availableNamespacesInColumn = availableNamespacesByColumn[columnIndex] || [];
  if (!existingSelectedNamespaces) {
    // Select all other namespaces in the column if the column is not set
    result[columnIndex] = availableNamespacesInColumn.filter((ns) => ns !== nsName);
  } else if (existingSelectedNamespaces.includes(nsName)) {
    // Unselects the namespace if already selected
    result[columnIndex] = existingSelectedNamespaces.filter((ns) => ns !== nsName);
  } else {
    result[columnIndex] = [...existingSelectedNamespaces, nsName].sort();
  }
  return result;
}

export function keyboardToggleNamespace(
  selectedNamespacesByColumn: NamespacesByColumn,
  availableNamespacesByColumn: NamespacesByColumn,
  nsName: string
): NamespacesByColumn {
  // Toggle the base column first and the feature column should be in sync with the base column.
  const result = toggleNamespace(selectedNamespacesByColumn, availableNamespacesByColumn, nsName, 0);
  const availableNamespacesInFeatureColumn = availableNamespacesByColumn[1] || [];
  const existingSelectedNamespacesInBaseColumn = selectedNamespacesByColumn[0];
  const existingSelectedNamespacesInFeatureColumn = selectedNamespacesByColumn[1];

  if (!existingSelectedNamespacesInBaseColumn || existingSelectedNamespacesInBaseColumn.includes(nsName)) {
    if (!existingSelectedNamespacesInFeatureColumn) {
      // Selects all other available namespaces in feature column if not set previously.
      result[1] = availableNamespacesInFeatureColumn.filter((ns) => ns !== nsName);
    } else if (existingSelectedNamespacesInFeatureColumn.includes(nsName)) {
      // Unselect the namespace in the feature column if already selected.
      result[1] = existingSelectedNamespacesInFeatureColumn.filter((ns) => ns !== nsName);
    }
  } else if (existingSelectedNamespacesInFeatureColumn && !existingSelectedNamespacesInFeatureColumn.includes(nsName)) {
    // Select the new namespace in feature column if not already selected (when base selectedNamespaces does not contain toggled namespace).
    result[1] = [...existingSelectedNamespacesInFeatureColumn, nsName].sort();
  }

  return result;
}
