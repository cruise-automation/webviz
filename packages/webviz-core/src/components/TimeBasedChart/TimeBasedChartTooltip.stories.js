// @flow
//
//  Copyright (c) 2018-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { storiesOf } from "@storybook/react";
import React from "react";
import { withScreenshot } from "storybook-chrome-screenshot";

import TimeBasedChartTooltip from "./TimeBasedChartTooltip";

storiesOf("<TimeBasedChartTooltip>", module)
  .addDecorator(withScreenshot())
  .add("default", () => {
    return (
      <div style={{ width: "100%", height: "100%", background: "white" }}>
        <TimeBasedChartTooltip
          tooltip={{
            path: "/some/topic.path",
            value: 3,
            constantName: "ACTIVE",
            item: {
              queriedData: [],
              timestamp: { sec: 100, nsec: 30 },
              hasAccurateTimestamp: false,
              elapsedSinceStart: { sec: 10, nsec: 30 },
              message: {
                topic: "/some/topic",
                datatype: "some_datatype",
                op: "message",
                receiveTime: { sec: 123, nsec: 456 },
                message: {
                  header: {
                    stamp: { sec: 100, nsec: 30 },
                  },
                },
              },
              index: 0,
            },
            startTime: { sec: 95, nsec: 0 },
          }}>
          <div />
        </TimeBasedChartTooltip>
      </div>
    );
  });
