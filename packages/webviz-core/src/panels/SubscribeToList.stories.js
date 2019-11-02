// @flow
//
//  Copyright (c) 2019-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.
import { storiesOf } from "@storybook/react";
import React from "react";
import { withScreenshot } from "storybook-chrome-screenshot";

import SubscribeToList from "./SubscribeToList";
import PanelSetup from "webviz-core/src/stories/PanelSetup";

storiesOf("<SubscribeToList>", module)
  .addDecorator(withScreenshot())
  .add("shows a topic list", () => {
    return (
      <PanelSetup
        fixture={{
          topics: [{ name: "/my/topic", datatype: "my_datatype" }],
          frame: {
            "/my/topic": [
              {
                op: "message",
                receiveTime: { sec: 1, nsec: 0 },
                topic: "/my/topic",
                datatype: "my_datatype",
                message: {},
              },
            ],
          },
        }}>
        <SubscribeToList config={{ topics: "/my/topic" }} />
      </PanelSetup>
    );
  });
