// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import * as React from "react";

// All these are exported for tests; please don't use them directly in your code.
export type FeatureDescriptions = {
  [id: string]: {|
    name: string,
    description: string | React.Node,
    developmentDefault: boolean,
    productionDefault: boolean,
  |},
};

export type FeatureValue = "default" | "alwaysOn" | "alwaysOff";
export type FeatureStorage = { [id: string]: "alwaysOn" | "alwaysOff" };
export type FeatureSettings = { [id: string]: { enabled: boolean, manuallySet: boolean } };
