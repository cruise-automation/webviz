// @flow
//
//  Copyright (c) 2019-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { storiesOf } from "@storybook/react";
import React from "react";
import { withScreenshot } from "storybook-chrome-screenshot";

import Note from "./index";
import PanelSetup from "webviz-core/src/stories/PanelSetup";

storiesOf("<Note>", module)
  .addDecorator(withScreenshot())
  .add("default", () => {
    const fixture = {
      topics: [],
      datatypes: {
        "std_msgs/String": { fields: [{ name: "noteText", type: "string" }] },
      },
      frame: {},
    };
    return (
      <PanelSetup fixture={fixture}>
        <Note config={{ noteText: "abc" }} />
      </PanelSetup>
    );
  });
