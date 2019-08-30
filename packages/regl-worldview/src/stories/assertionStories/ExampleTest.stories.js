// @flow

//  Copyright (c) 2018-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

/* eslint-disable react/display-name */

import { storiesOf } from "@storybook/react";
import React from "react";
import { withScreenshot } from "storybook-chrome-screenshot";

import { assertionTest, expect } from "stories/assertionTestUtils";

storiesOf("Integration-new/ExampleTest", module)
  .addDecorator(withScreenshot())
  .add(
    "Should fail",
    assertionTest({
      story: (setTestData) => <div />,
      assertions: async (getTestData) => {
        expect(true).toEqual(false);
      },
    })
  );
