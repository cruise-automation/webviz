// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import type { CommentingActions } from "./commenting";
import type { LayoutHistoryActions } from "./layoutHistory";
import type { MosaicActions } from "./mosaic";
import type { PanelsActions } from "./panels";
import type { TestsActions } from "./tests";
import type { UserNodesActions } from "./userNodes";

export type ActionTypes =
  | TestsActions
  | LayoutHistoryActions
  | MosaicActions
  | PanelsActions
  | UserNodesActions
  | CommentingActions;
