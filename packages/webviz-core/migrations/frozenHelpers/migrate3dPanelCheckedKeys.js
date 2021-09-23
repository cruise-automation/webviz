// @flow
//
//  Copyright (c) 2019-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import type { TopicTreeConfig } from "webviz-core/migrations/frozenMigrations/2020.05.06.00:00:03.migrate3DPanel";

const $WEBVIZ_SOURCE_2 = "/webviz_source_2";
const ROOT_NAME = "name:root";
const ROOT_2_NAME = "name_2:root";
const UNCATEGORIZED_NAME = "name:(Uncategorized)";
const UNCATEGORIZED_2_NAME = "name_2:(Uncategorized)";

// Exported for tests.
export const makePredecessorRelations = (topicTree: TopicTreeConfig): Map<string, string> => {
  // Depth-first search, making a map of "t:/metadata" -> "name:Map" -> "name:root".
  const relations = new Map<string, string>();
  const makeRelation = (key1, key2, isTopic) => {
    if (isTopic) {
      if (relations.has(`t:${key1}`)) {
        throw new Error(`Duplicate key ${key1}. Migration won't work.`);
      }
      relations.set(`t:${key1}`, `name:${key2}`);
      relations.set(`t:${$WEBVIZ_SOURCE_2}${key1}`, `name_2:${key2}`);
    } else {
      if (relations.has(`name:${key1}`)) {
        throw new Error(`Duplicate key ${key1}. Migration won't work.`);
      }
      relations.set(`name:${key1}`, `name:${key2}`);
      relations.set(`name_2:${key1}`, `name_2:${key2}`);
    }
  };
  const addPredecessors = (tree: TopicTreeConfig) => {
    if (tree.name == null || tree.children == null) {
      return;
    }
    const { name } = tree; // so flow knows it's not null later.
    tree.children.forEach((child) => {
      if (child.topicName) {
        makeRelation(child.topicName, name, true);
      } else if (child.name != null) {
        makeRelation(child.name, name, false);
        addPredecessors(child);
      }
    });
  };
  addPredecessors(topicTree);
  return relations;
};

// Exported for tests
export const visibleTopicKeys = (predecessors: Map<string, string>, checkedKeys: Set<string>): Set<string> => {
  const ret = new Set<string>();

  // Visible topics are those that are,
  const isVisible = (key): boolean => {
    // - Not in the topic tree, with "name:(Uncategorized)" checked.
    if (!predecessors.has(key)) {
      const uncategorizedGroup = key.startsWith(`t:${$WEBVIZ_SOURCE_2}`) ? UNCATEGORIZED_2_NAME : UNCATEGORIZED_NAME;
      return checkedKeys.has(uncategorizedGroup);
    }
    // - In the topic-tree with all ancestors checked.
    let iterKey: ?string = key;
    while (iterKey != null) {
      if (iterKey === ROOT_NAME || iterKey === ROOT_2_NAME) {
        return true;
      }
      if (!checkedKeys.has(iterKey)) {
        return false;
      }
      iterKey = predecessors.get(iterKey);
    }
    return false;
  };

  for (const key of checkedKeys) {
    if (key.startsWith("t:") && isVisible(key)) {
      ret.add(key);
    }
  }
  return ret;
};

const migrateCheckedKeys = (
  oldTopicTree: TopicTreeConfig,
  newTopicTree: TopicTreeConfig,
  checkedKeys: $ReadOnlyArray<?string>,
  getWantedVisibleTopicKeys: (Set<string>) => Set<string>
): string[] => {
  // Goal: Any topic that was visible before should stay visible. Any topic that was not visible
  // before should not be visible after.
  //
  // Find the topic keys that were visible before.
  const oldPredecessors = makePredecessorRelations(oldTopicTree);
  const oldCheckedKeys = new Set(checkedKeys.filter(Boolean));
  const oldVisibleTopicKeys = visibleTopicKeys(oldPredecessors, oldCheckedKeys);
  // Find the topics that we want to be visible after (in case new topics are added etc.)
  const wantedVisibleTopicKeys = getWantedVisibleTopicKeys(oldVisibleTopicKeys);

  // If they're not visible in the new tree, activate parent nodes until they are.
  const newPredecessors = makePredecessorRelations(newTopicTree);
  const newCheckedKeys = new Set(oldCheckedKeys);
  for (const topicKey of wantedVisibleTopicKeys) {
    let iterKey: ?string = topicKey;
    while (true) {
      if (iterKey === ROOT_NAME || iterKey === ROOT_2_NAME) {
        break;
      }
      if (iterKey == null) {
        const uncategorizedGroup = topicKey.startsWith(`t:${$WEBVIZ_SOURCE_2}`)
          ? UNCATEGORIZED_2_NAME
          : UNCATEGORIZED_NAME;
        newCheckedKeys.add(uncategorizedGroup);
        break;
      }
      newCheckedKeys.add(iterKey);
      iterKey = newPredecessors.get(iterKey);
    }
  }

  // Find the topics that are visible after. If they aren't wanted, deactivate them.
  // An example, moving topic /t1 from "Old Group" to "New Group":
  // Before:
  // -[x] Old Group
  //   -[x] /t1
  // -[ ] New Group (inactive)
  //   -[x] /t2 (active but invisible)
  //
  // After:
  // -[x] Old Group
  // -[x] New Group (newly active to show t1)
  //   -[x] /t1 (still visible)
  //   -[ ] /t2 (now disabled so it remains invisible)
  const currentlyVisibleTopicKeys = visibleTopicKeys(newPredecessors, newCheckedKeys);
  for (const topicKey of currentlyVisibleTopicKeys) {
    if (!wantedVisibleTopicKeys.has(topicKey)) {
      newCheckedKeys.delete(topicKey);
    }
  }
  return [...newCheckedKeys].sort(); // sort for determinism.
};

export default migrateCheckedKeys;
