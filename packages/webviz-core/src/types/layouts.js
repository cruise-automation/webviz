// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.
import type { MosaicNode } from "webviz-core/src/types/panels";

export type LayoutDescription = {
  id: string,
  name: string,
  folderId: string,
  private: boolean,
};

export type SaveLayoutPayload = {
  name: string,
  folderId: string,
  private: boolean,
  // the layout description
  layout: MosaicNode,
};

export type TabConfig = {| title: string, layout: ?MosaicNode |};

export type TabPanelConfig = {
  activeTabIdx: number,
  tabs: Array<TabConfig>,
};

export type TabLocation = {|
  panelId: string,
  tabIndex?: number,
|};
