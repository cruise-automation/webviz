// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { storiesOf } from "@storybook/react";
import React from "react";

import Confirm from "webviz-core/src/components/Confirm";

storiesOf("Confirm", module).add("Update your browser", () => {
  Confirm({
    title: "Update your browser",
    prompt: "Chrome 1.2.3 is not supported. Please use Chrome 68 or later to continue.",
    confirmStyle: "primary",
    ok: "Update Chrome",
    cancel: "Continue anyway",
  });

  return <div />;
});
