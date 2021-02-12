// @flow
//
//  Copyright (c) 2019-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

function migrateSourcePrefix(originalPanelsState: any): any {
  const panelsStateJson = JSON.stringify(originalPanelsState).replace(
    /\/webviz_bag_2|\/webviz_tables_2/g,
    "/webviz_source_2"
  );
  const panelsState = JSON.parse(panelsStateJson);

  return panelsState;
}

export default migrateSourcePrefix;
