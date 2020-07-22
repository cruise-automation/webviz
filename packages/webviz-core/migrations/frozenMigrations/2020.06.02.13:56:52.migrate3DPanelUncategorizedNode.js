// @flow
//
//  Copyright (c) 2019-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { uniq } from "lodash";

import { migrate3DPanelSavedProps } from "webviz-core/migrations/frozenMigrations/2020.05.06.00:00:03.migrate3DPanel";

type ThreeDimensionalVizConfig = any;

// Uncategorized nodes in the open source version is named differently.
export function migrateUncategorizedNode(nodes: string[]): string[] {
  return uniq(nodes.map((node) => node.replace("(Uncategorized)", "Topic")));
}

export function migrate3DPanelUncategorizedNode({
  // eslint-disable-next-line no-unused-vars
  savedPropsVersion,
  checkedKeys,
  expandedKeys,
  ...rest
}: ThreeDimensionalVizConfig): ThreeDimensionalVizConfig {
  return {
    ...rest,
    checkedKeys: migrateUncategorizedNode(checkedKeys || []),
    expandedKeys: migrateUncategorizedNode(expandedKeys || []),
  };
}

export default migrate3DPanelSavedProps(migrate3DPanelUncategorizedNode);
