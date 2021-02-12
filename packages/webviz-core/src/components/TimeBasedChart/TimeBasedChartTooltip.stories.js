// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { storiesOf } from "@storybook/react";
import React from "react";

import TimeBasedChartTooltip from "./TimeBasedChartTooltip";

storiesOf("<TimeBasedChartTooltip>", module).add("default", () => {
  return (
    <div style={{ width: "100%", height: "100%", background: "white" }}>
      <TimeBasedChartTooltip
        tooltip={{
          x: 0,
          y: 0,
          datasetKey: "0",
          path: "/some/topic.path",
          value: 3,
          constantName: "ACTIVE",
          item: {
            queriedData: [],
            receiveTime: { sec: 123, nsec: 456 },
            headerStamp: { sec: 100, nsec: 30 },
          },
          startTime: { sec: 95, nsec: 0 },
        }}>
        <div />
      </TimeBasedChartTooltip>
    </div>
  );
});
