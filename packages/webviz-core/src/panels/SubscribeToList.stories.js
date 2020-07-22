// @flow
//
//  Copyright (c) 2019-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.
import { storiesOf } from "@storybook/react";
import React from "react";

import SubscribeToList from "./SubscribeToList";
import PanelSetup from "webviz-core/src/stories/PanelSetup";

storiesOf("<SubscribeToList>", module).add("shows a topic list", () => {
  return (
    <PanelSetup
      fixture={{
        topics: [{ name: "/my/topic", datatype: "my_datatype" }],
        frame: {
          "/my/topic": [
            {
              receiveTime: { sec: 1, nsec: 0 },
              topic: "/my/topic",
              message: {},
            },
          ],
        },
      }}>
      <SubscribeToList config={{ topics: "/my/topic" }} />
    </PanelSetup>
  );
});
