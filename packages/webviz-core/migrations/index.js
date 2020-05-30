// @flow
//
//  Copyright (c) 2019-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.
import { flatMap } from "lodash";

import incrementVersion from "webviz-core/migrations/activeHelpers/incrementVersion";
import validateVersions from "webviz-core/migrations/activeHelpers/validateVersions";

export const CURRENT_LAYOUT_VERSION = 3;
const migrationsByVersion = {
  "001": [],
  "002": [
    require("webviz-core/migrations/frozenMigrations/2020.05.06.00:00:02.migrateNodePlaygroundNodesToObjects").default,
    require("webviz-core/migrations/frozenMigrations/2020.05.06.00:00:03.migrate3DPanel").default,
    require("webviz-core/migrations/frozenMigrations/2020.05.06.00:00:04.migrateGlobalDataToGlobalVariables").default,
    require("webviz-core/migrations/frozenMigrations/2020.05.06.00:00:05.migrateSourcePrefix").default,
  ],
  "003": [
    require("webviz-core/migrations/frozenMigrations/2020.05.14.13:39:17.migrate3DPanelFeatureGroupKeys").default,
  ],
};

export default function migratePanels(originalPanelsState: any): any {
  if (originalPanelsState.layout === undefined) {
    return originalPanelsState;
  }
  const versionNumbers = Object.keys(migrationsByVersion);
  if (!validateVersions(versionNumbers)) {
    throw new Error(
      "CURRENT_LAYOUT_VERSION must match the # of releases specified in webviz-core/migrations/index.js."
    );
  }
  try {
    const panelsState = [
      ...flatMap(versionNumbers.sort(), (version) =>
        !originalPanelsState.version || originalPanelsState.version < parseInt(version)
          ? [...migrationsByVersion[version], incrementVersion(parseInt(version))]
          : []
      ),
    ].reduce((_panelsState, fn: (any) => any) => fn(_panelsState), originalPanelsState);

    return panelsState;
  } catch (error) {
    console.error(`Error migrating panels:\n${error.stack}`);
    return originalPanelsState;
  }
}
