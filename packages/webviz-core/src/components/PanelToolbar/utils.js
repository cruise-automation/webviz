// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { getNodeAtPath } from "react-mosaic-component";

import { getPanelTypeFromId } from "webviz-core/src/util/layout";

export function getPanelTypeFromMosaic(mosaicWindowActions: any, mosaicActions: any) {
  if (!mosaicWindowActions || !mosaicActions) {
    return null;
  }
  const node = getNodeAtPath(mosaicActions.getRoot(), mosaicWindowActions.getPath());
  const type = getPanelTypeFromId(node);

  return type;
}
