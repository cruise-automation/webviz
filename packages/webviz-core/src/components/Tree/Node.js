/* eslint-disable header/header */

//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import * as React from "react";

// @flow
export type Node = {
  id: string,
  legacyIds: string[],
  text: string,
  tooltip: ?(React.Node[]),
  icon: React.Node,
  checked: boolean,
  disabled: boolean,
  expanded: boolean,
  visible: boolean,
  filtered: boolean,
  missing: boolean,
  children: any[],
  canEdit: boolean,
  hasEdit: boolean,
  hasCheckbox: boolean,
};
