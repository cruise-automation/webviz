// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.
// eslint-disable-next-line no-restricted-imports
import { get } from "lodash";

import { FOCUS_ITEM_OPS } from "./constants";
import {
  toggleVisibility,
  keyboardToggleAllForGroupVisibility,
  keyboardToggleAllForTopicVisibility,
  keyboardToggleNamespace,
} from "./topicGroupsVisibilityUtils";
import type {
  FocusItemOp,
  KeyboardFocusData,
  KeyboardFocusType,
  NamespaceItem,
  NamespacesByColumn,
  TopicGroupType,
  TopicItem,
  VisibilityByColumn,
} from "./types";

// Get new selectedNamespacesByColumn after keyboard toggle. Throw errors when objectPaths don't match with any data.
function getOnChangeDataForNamespaceKeyboardToggle(
  topicGroups: TopicGroupType[],
  derivedFieldObjectPath: string
): {| objectPath: string, newValue: NamespacesByColumn |} {
  const maybeNamespaceItem: ?NamespaceItem = get(topicGroups, derivedFieldObjectPath);
  if (!maybeNamespaceItem) {
    throw new Error(`Not able to get namespace item by ${derivedFieldObjectPath}`);
  }

  // The first 3 partials for the path: [groupIndex].items.[itemIndex]
  const topicItemPath = derivedFieldObjectPath
    .split(".")
    .slice(0, 3)
    .join(".");
  const objectPathForSelectedNamespacesByColumn = `${topicItemPath}.selectedNamespacesByColumn`;
  const maybeSelectedNamespacesByColumn = get(topicGroups, objectPathForSelectedNamespacesByColumn) || [
    undefined,
    undefined,
  ];
  const objectPathForAvailableNamespacesByColumn = `${topicItemPath}.derivedFields.availableNamespacesByColumn`;
  const maybeAvailableNamespacesByColumn: NamespacesByColumn = get(
    topicGroups,
    objectPathForAvailableNamespacesByColumn
  );
  if (!maybeAvailableNamespacesByColumn) {
    throw new Error(`Not able to get availableNamespacesByColumn by ${objectPathForAvailableNamespacesByColumn}`);
  }
  const nsName: string = maybeNamespaceItem.namespace;
  const newSelectedNamespacesByColumn = keyboardToggleNamespace(
    maybeSelectedNamespacesByColumn,
    maybeAvailableNamespacesByColumn,
    nsName
  );
  return { objectPath: objectPathForSelectedNamespacesByColumn, newValue: newSelectedNamespacesByColumn };
}

export function getOnTopicGroupsChangeDataByKeyboardOp({
  focusItemOp,
  topicGroups,
  focusData,
  focusIndex,
  isShiftKeyPressed,
}: {
  focusItemOp: FocusItemOp,
  topicGroups: TopicGroupType[],
  focusData: KeyboardFocusData[],
  focusIndex: number,
  isShiftKeyPressed: ?boolean,
}): ?{|
  focusType: KeyboardFocusType,
  objectPath: string,
  newValue?: boolean | ?VisibilityByColumn | TopicGroupType | TopicItem | NamespacesByColumn,
  unhandledFocusItemOp?: FocusItemOp,
|} {
  // Current no op is supported when focusIndex is -1, add more if needed
  if (focusIndex === -1) {
    return;
  }
  const focusDataItem = focusData[focusIndex];
  if (!focusDataItem) {
    throw new Error(`focusIndex ${focusIndex} should map to objectPath and focusType.`);
  }
  const { objectPath, focusType } = focusDataItem;

  switch (focusType) {
    case "GROUP":
      {
        const maybeGroup: ?TopicGroupType = get(topicGroups, objectPath);
        if (!maybeGroup) {
          throw new Error(`Not able to get topic group by ${objectPath}`);
        }
        if (focusItemOp === FOCUS_ITEM_OPS.Enter) {
          // toggle group visibility
          return isShiftKeyPressed
            ? {
                focusType,
                objectPath,
                newValue: keyboardToggleAllForGroupVisibility(maybeGroup),
              }
            : {
                focusType,
                objectPath: `${objectPath}.visibilityByColumn`,
                newValue: toggleVisibility(maybeGroup.visibilityByColumn || [false, false]),
              };
        } else if (focusItemOp === FOCUS_ITEM_OPS.ArrowRight && !maybeGroup.expanded) {
          // expand the group
          return { focusType, objectPath: `${objectPath}.expanded`, newValue: true };
        } else if (focusItemOp === FOCUS_ITEM_OPS.ArrowLeft && maybeGroup.expanded) {
          // collapse the group only if the filterText is valid since we auto expand the group when filtering
          if (!maybeGroup.derivedFields.filterText) {
            return { focusType, objectPath: `${objectPath}.expanded`, newValue: false };
          }
        } else if (focusItemOp === FOCUS_ITEM_OPS.Backspace) {
          // delete the group
          return { focusType, objectPath, newValue: undefined, unhandledFocusItemOp: focusItemOp };
        }
      }
      break;
    case "NEW_GROUP":
      if (focusItemOp === FOCUS_ITEM_OPS.Enter) {
        // Return the op directly to be handled in the UI
        return { focusType, objectPath, unhandledFocusItemOp: focusItemOp };
      }
      break;
    case "TOPIC":
      {
        const maybeTopic: ?TopicItem = get(topicGroups, objectPath);
        if (!maybeTopic) {
          throw new Error(`Not able to get topic by ${objectPath}`);
        }
        if (focusItemOp === FOCUS_ITEM_OPS.Enter) {
          // toggle topic visibility
          return isShiftKeyPressed
            ? {
                focusType,
                objectPath,
                newValue: keyboardToggleAllForTopicVisibility(maybeTopic),
              }
            : {
                focusType,
                objectPath: `${objectPath}.visibilityByColumn`,
                newValue: toggleVisibility(maybeTopic.visibilityByColumn || [false, false]),
              };
        } else if (focusItemOp === FOCUS_ITEM_OPS.ArrowRight && !maybeTopic.expanded) {
          // expand the topic
          return { focusType, objectPath: `${objectPath}.expanded`, newValue: true };
        } else if (focusItemOp === FOCUS_ITEM_OPS.ArrowLeft && maybeTopic.expanded) {
          // collapse the topic
          return { focusType, objectPath: `${objectPath}.expanded`, newValue: false };
        } else if (focusItemOp === FOCUS_ITEM_OPS.Backspace) {
          // delete the topic
          return { focusType, objectPath, newValue: undefined, unhandledFocusItemOp: focusItemOp };
        }
      }
      break;
    case "NEW_TOPIC":
      if (focusItemOp === FOCUS_ITEM_OPS.Enter) {
        // Return the op directly to be handled in the UI
        return { focusType, objectPath, unhandledFocusItemOp: focusItemOp };
      }
      break;

    case "NAMESPACE":
      if (focusItemOp === FOCUS_ITEM_OPS.Enter) {
        return { focusType, ...getOnChangeDataForNamespaceKeyboardToggle(topicGroups, objectPath) };
      }
      break;
    default:
      (focusType: empty);
      throw new Error(`${focusType} is not supported.`);
  }
}
