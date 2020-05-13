// @flow
//
//  Copyright (c) 2019-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.
import { flatMap } from "lodash";

import { incrementVersion } from "webviz-core/migrations/helpers";
import { type PanelsState } from "webviz-core/src/reducers/panels";

const migrationsByVersion = {
  "001": [],
  "002": [
    require("webviz-core/migrations/frozenMigrations/2020.05.06.00:00:01.migratePlaybackConfig").default,
    require("webviz-core/migrations/frozenMigrations/2020.05.06.00:00:02.migrateNodePlaygroundNodesToObjects").default,
    require("webviz-core/migrations/frozenMigrations/2020.05.06.00:00:03.migrate3DPanel").default,
    require("webviz-core/migrations/frozenMigrations/2020.05.06.00:00:04.migrateGlobalDataToGlobalVariables").default,
    require("webviz-core/migrations/frozenMigrations/2020.05.06.00:00:05.migrateSourcePrefix").default,
  ],
};

export default function migratePanels(originalPanelsState: PanelsState): PanelsState {
  if (originalPanelsState.layout === undefined) {
    return originalPanelsState;
  }
  try {
    const panelsState = [
      ...flatMap(Object.keys(migrationsByVersion).sort(), (version) =>
        !originalPanelsState.version || originalPanelsState.version < parseInt(version)
          ? [...migrationsByVersion[version], incrementVersion(parseInt(version))]
          : []
      ),
    ].reduce((_panelsState, fn: (PanelsState) => PanelsState) => fn(_panelsState), originalPanelsState);

    return panelsState;
  } catch (error) {
    console.error(`Error migrating panels:\n${error.stack}`);
    return originalPanelsState;
  }
}
