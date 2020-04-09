// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.
import * as React from "react";

export type TopicConfig = {|
  // topicConfig fields
  name?: string,
  displayName?: string,
  topic?: string,
  extension?: string,
  children?: TopicConfig[],
  icon?: React.Node,
  description?: string,

  // dynamic fields
  disabled?: boolean,
  hasCheckbox?: boolean,
  checked?: boolean,

  // Previous names or ids for this item under which it might be saved in old layouts.
  // Used for automatic conversion so that old saved layouts continue to work when tree nodes are renamed.
  legacyIds?: string[],
  isSyntheticGroup?: boolean, // Synthetic groups don't have a checkbox, they can only expand/collapse
|};
