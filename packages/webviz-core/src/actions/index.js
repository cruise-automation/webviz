// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import type { ExtensionsActions } from "./extensions";
import type { LayoutHistoryActions } from "./layoutHistory";
import type { SET_MOSAIC_ID } from "./mosaic";
import type { PanelsActions } from "./panels";
import type { UserNodesActions } from "./userNodes";

export type ActionTypes = PanelsActions | SET_MOSAIC_ID | ExtensionsActions | UserNodesActions | LayoutHistoryActions;
