// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { storiesOf } from "@storybook/react";
import React from "react";

import DropOverlay from "webviz-core/src/components/DropOverlay";

storiesOf("<DropOverlay>", module).add("default", () => {
  return <DropOverlay>Some DropOverlay</DropOverlay>;
});
