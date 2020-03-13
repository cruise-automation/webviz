// @flow
//
//  Copyright (c) 2019-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.
import { every, uniq, keyBy, isEmpty } from "lodash";

import { isTypicalFilterName } from "webviz-core/src/components/MessagePathSyntax/isTypicalFilterName";
import { jsonTreeTheme } from "webviz-core/src/util/globalConstants";
import { colors } from "webviz-core/src/util/sharedStyleConstants";

export const diffArrow = "->";
export const diffLabels = {
  ADDED: { labelText: "WEBVIZ_DIFF___ADDED", color: colors.DARK6, backgroundColor: "#182924", indicator: "+" },
  DELETED: { labelText: "WEBVIZ_DIFF___DELETED", color: colors.DARK6, backgroundColor: "#3d2327", indicator: "-" },
  CHANGED: { labelText: "WEBVIZ_DIFF___CHANGED", color: jsonTreeTheme.base0B },
  ID: { labelText: "WEBVIZ_DIFF___ID" },
};

// $FlowFixMe - Flow doesn't understand `Object.values`.
export const diffLabelsByLabelText = keyBy(Object.values(diffLabels), "labelText");

export default function getDiff(
  before: mixed,
  after: mixed,
  idLabel: ?string = null,
  showFullMessageForDiff: boolean = false
) {
  if (Array.isArray(before) && Array.isArray(after)) {
    let idToCompareWith: ?string;
    const allItems = before.concat(after);
    if (allItems[0] && typeof allItems[0] === "object") {
      let candidateIdsToCompareWith = {};
      if (allItems[0].id != null) {
        candidateIdsToCompareWith.id = { before: [], after: [] };
      }
      for (const key in allItems[0]) {
        if (isTypicalFilterName(key)) {
          candidateIdsToCompareWith[key] = { before: [], after: [] };
        }
      }
      if (!every(allItems, (item) => item && typeof item === "object")) {
        candidateIdsToCompareWith = {};
      }
      for (const idKey in candidateIdsToCompareWith) {
        for (const beforeItem of before) {
          // $FlowFixMe - we know beforeItem is an object at this point
          if (beforeItem[idKey] != null) {
            candidateIdsToCompareWith[idKey].before.push(beforeItem[idKey]);
          }
        }
      }
      for (const idKey in candidateIdsToCompareWith) {
        for (const afterItem of after) {
          // $FlowFixMe - we know afterItem is an object at this point
          if (afterItem[idKey] != null) {
            candidateIdsToCompareWith[idKey].after.push(afterItem[idKey]);
          }
        }
      }
      for (const idKey in candidateIdsToCompareWith) {
        const { before: candidateIdBefore, after: candidateIdAfter } = candidateIdsToCompareWith[idKey];
        if (uniq(candidateIdBefore).length === before.length && uniq(candidateIdAfter).length === after.length) {
          idToCompareWith = idKey;
          break;
        }
      }
    }

    if (idToCompareWith) {
      const unmatchedAfterById = keyBy(after, idToCompareWith);
      const diff = [];
      for (const beforeItem of before) {
        if (!beforeItem || typeof beforeItem !== "object") {
          throw new Error("beforeItem is invalid; should have checked this earlier");
        }
        const id = beforeItem[idToCompareWith];
        const innerDiff = getDiff(beforeItem, unmatchedAfterById[id], idToCompareWith, showFullMessageForDiff);
        delete unmatchedAfterById[id];
        if (!isEmpty(innerDiff)) {
          const isDeleted =
            Object.keys(innerDiff).length === 1 && Object.keys(innerDiff)[0] === diffLabels.DELETED.labelText;
          diff.push(isDeleted ? innerDiff : { [diffLabels.ID.labelText]: { [idToCompareWith]: id }, ...innerDiff });
        }
      }
      for (const afterItem of Object.values(unmatchedAfterById)) {
        const innerDiff = getDiff(undefined, afterItem, idToCompareWith, showFullMessageForDiff);
        if (!isEmpty(innerDiff)) {
          diff.push(innerDiff);
        }
      }
      return diff;
    }
  }

  if (before && after && typeof before === "object" && typeof after === "object") {
    const diff = {};
    const allKeys = Object.keys(before).concat(Object.keys(after));
    for (const key of uniq(allKeys)) {
      const innerDiff = getDiff(before[key], after[key], null, showFullMessageForDiff);
      if (!isEmpty(innerDiff)) {
        diff[key] = innerDiff;
      } else if (showFullMessageForDiff) {
        diff[key] = before[key];
      }
    }
    return diff;
  }

  if (before === after) {
    return undefined;
  }
  if (before === undefined) {
    const afterIsNotObj = Array.isArray(after) || typeof after !== "object";
    if (!idLabel || afterIsNotObj) {
      return { [diffLabels.ADDED.labelText]: after };
    }
    const idLabelObj = { [diffLabels.ID.labelText]: { [idLabel]: { ...after }[idLabel] } };
    return { [diffLabels.ADDED.labelText]: { ...idLabelObj, ...after } };
  }
  if (after === undefined) {
    const beforeIsNotObj = Array.isArray(before) || typeof before !== "object";
    if (!idLabel || beforeIsNotObj) {
      return { [diffLabels.DELETED.labelText]: before };
    }
    const idLabelObj = { [diffLabels.ID.labelText]: { [idLabel]: { ...before }[idLabel] } };
    return { [diffLabels.DELETED.labelText]: { ...idLabelObj, ...before } };
  }
  return {
    [diffLabels.CHANGED.labelText]: `${JSON.stringify(before) || ""} ${diffArrow} ${JSON.stringify(after) || ""}`,
  };
}
