// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { storiesOf } from "@storybook/react";
import * as React from "react";

import KeyboardShortcut from "./KeyboardShortcut";

storiesOf("<KeyboardShortcut>", module).add("basic", () => (
  <div>
    <KeyboardShortcut description="Toggle visibility" keys={["Enter"]} />
    <KeyboardShortcut description="Copy all" keys={["Shift", "Option", "V"]} />
  </div>
));
