// @flow
//
//  Copyright (c) 2020-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.
import React, { useState } from "react";
import { type Time } from "rosbag";

import Dropdown from "webviz-core/src/components/Dropdown";
import Flex from "webviz-core/src/components/Flex";
import { ndash } from "webviz-core/src/util/entities";
import { formatTime } from "webviz-core/src/util/formatTime";
import { colors } from "webviz-core/src/util/sharedStyleConstants";
import { formatTimeRaw } from "webviz-core/src/util/time";

const MAX_WIDTH = 170;
const PlaybackTimeDisplayMethod = ({ currentTime, timezone }: { currentTime: Time, timezone?: ?string }) => {
  const [timeDisplayMethod, setTimeDisplayMethod] = useState<"ROS" | "Date">("ROS");
  return (
    <Flex start style={{ maxWidth: `${MAX_WIDTH}px` }}>
      <Dropdown
        position="above"
        value={timeDisplayMethod}
        menuStyle={{ width: `${MAX_WIDTH - 10}px`, marginLeft: currentTime ? 0 : `-${MAX_WIDTH - 50}px` }}
        text={
          currentTime
            ? timeDisplayMethod === "ROS"
              ? formatTimeRaw(currentTime)
              : formatTime(currentTime, timezone)
            : ndash
        }
        onChange={setTimeDisplayMethod}
        btnStyle={{
          minWidth: "32px",
          backgroundColor: "transparent",
          margin: "0px 16px 0px 8px",
          paddingLeft: "0px",
          paddingRight: "0px",
          fontFamily: "Roboto Mono",
          color: colors.LIGHT,
          opacity: 0.6,
        }}
        dataTest="PlaybackTimeDisplayMethod-Dropdown">
        <span key="day" value="Date">
          Time of day
        </span>
        <span key="ros" value="ROS">
          ROS time
        </span>
      </Dropdown>
    </Flex>
  );
};

export default PlaybackTimeDisplayMethod;
