// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { type RosMsgField } from "rosbag";

export type RosDatatype = $ReadOnly<{|
  name: string,
  fields: RosMsgField[],
|}>;

// The RosDatatypes key is the datatype id. Datatypes with different definitions can (and often do)
// have different definitions, but datatype ids should unambiguously refer to a type with a given
// structure.
export type RosDatatypes = { [datatypeId: string]: RosDatatype };
