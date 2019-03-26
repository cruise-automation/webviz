// @flow
//
//  Copyright (c) 2018-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { storiesOf } from "@storybook/react";
import * as React from "react";
import { withScreenshot } from "storybook-chrome-screenshot";

import GlobalVariables from "./index";
import { GLOBAL_DATA_KEY } from "webviz-core/src/reducers/panels";
import PanelSetup from "webviz-core/src/stories/PanelSetup";
import Storage from "webviz-core/src/util/Storage";

const exampleGlobalData = {
  someNum: 5,
  someText: "active",
  someObj: { age: 50 },
  someArrOfNums: [1, 2, 3],
  someArrofText: ["a", "b", "c"],
};

storiesOf("<GlobalVariables>", module)
  .addDecorator(withScreenshot())
  .add("example", () => {
    const storage = new Storage();
    storage.set(GLOBAL_DATA_KEY, exampleGlobalData);
    const fixture = {
      topics: [],
      frame: {},
    };

    return (
      <PanelSetup fixture={fixture}>
        <GlobalVariables />
      </PanelSetup>
    );
  });
