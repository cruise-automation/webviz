// @flow
//
//  Copyright (c) 2019-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.
import { isEmpty } from "lodash";

import getPanelTypeFromId from "webviz-core/migrations/frozenHelpers/getPanelTypeFromId";

type MosaicDirection = "row" | "column";
type MosaicNode =
  | {
      direction: MosaicDirection,
      first: MosaicNode,
      second: MosaicNode,
      splitPercentage?: number,
    }
  | string;

function replacePanelLayout(layout: MosaicNode, oldPanelType: string, replacer: (id: string) => any): any {
  if (typeof layout === "object" && !isEmpty(layout)) {
    return {
      ...layout,
      first: replacePanelLayout(layout.first, oldPanelType, replacer),
      second: replacePanelLayout(layout.second, oldPanelType, replacer),
    };
  } else if (typeof layout === "string" && layout.length > 0 && getPanelTypeFromId(layout) === oldPanelType) {
    return replacer(layout);
  }
  return layout;
}

export default replacePanelLayout;
