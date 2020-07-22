// @flow
//
//  Copyright (c) 2019-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.
import { flatMap } from "lodash";

import incrementVersion from "webviz-core/migrations/frozenHelpers/incrementVersion";
import validateVersions from "webviz-core/migrations/frozenHelpers/validateVersions";

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
  "004": [
    require("webviz-core/migrations/frozenMigrations/2020.06.02.11:27:59.addDefaultPlaybackConfig").default,
    require("webviz-core/migrations/frozenMigrations/2020.06.01.11:34:51.migrate3DPanelPointCloudHexColors").default,
  ],
  "005": [
    require("webviz-core/migrations/frozenMigrations/2020.06.02.13:56:52.migrate3DPanelUncategorizedNode").default,
    require("webviz-core/migrations/frozenMigrations/2020.06.03.13:56:52.migrate3DPanelTopicSettingsToSettingsByKey")
      .default,
  ],
  "006": [],
  "007": [],
  "008": [require("webviz-core/migrations/frozenMigrations/2020.06.26.17:40:24.migrate3DPanelColorSettings").default],
  "009": [
    require("webviz-core/migrations/frozenMigrations/2020.07.07.11:17:28.prefixCollapsedSectionsWithDiagnosticName.js")
      .default,
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
