// @flow
//
//  Copyright (c) 2018-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import * as React from "react";

import type { TimeBasedChartTooltipData } from "./index";
import styles from "./TimeBasedChartTooltip.module.scss";
import { getTimestampForMessage } from "webviz-core/src/components/MessageHistory";
import Tooltip from "webviz-core/src/components/Tooltip";
import { formatTime, formatTimeRaw, subtractTimes, toSec } from "webviz-core/src/util/time";

type Props = {|
  children: React.Element<any>,
  tooltip: TimeBasedChartTooltipData,
|};
export default class TimeBasedChartTooltip extends React.PureComponent<Props> {
  render() {
    const { tooltip } = this.props;
    const value = typeof tooltip.value === "string" ? tooltip.value : JSON.stringify(tooltip.value);
    const timestampReceiveTime = getTimestampForMessage(tooltip.item.message, "receiveTime");
    const timestampHeaderStamp = getTimestampForMessage(tooltip.item.message, "headerStamp");
    const content = (
      <div className={styles.root}>
        <div>
          <span className={styles.title}>Value:&nbsp;</span>
          {tooltip.constantName ? `${tooltip.constantName} (${value})` : value}
        </div>
        <div>
          <span className={styles.title}>Path:&nbsp;</span>
          {tooltip.path}
        </div>
        {timestampReceiveTime && timestampHeaderStamp && (
          <table>
            <tbody>
              <tr>
                <th />
                {timestampReceiveTime && <th>receive time</th>}
                {timestampHeaderStamp && <th>header.stamp</th>}
              </tr>
              <tr>
                <th>ROS</th>
                {timestampReceiveTime && <td>{formatTimeRaw(timestampReceiveTime)}</td>}
                {timestampHeaderStamp && <td>{formatTimeRaw(timestampHeaderStamp)}</td>}
              </tr>
              <tr>
                <th>Time</th>
                {timestampReceiveTime && <td>{formatTime(timestampReceiveTime)}</td>}
                {timestampHeaderStamp && <td>{formatTime(timestampHeaderStamp)}</td>}
              </tr>
              <tr>
                <th>Elapsed</th>
                {timestampReceiveTime && (
                  <td>{toSec(subtractTimes(timestampReceiveTime, tooltip.startTime)).toFixed(9)} sec</td>
                )}
                {timestampHeaderStamp && (
                  <td>{toSec(subtractTimes(timestampHeaderStamp, tooltip.startTime)).toFixed(9)} sec</td>
                )}
              </tr>
            </tbody>
          </table>
        )}
      </div>
    );

    return (
      <Tooltip defaultShown placement="top" contents={content}>
        {this.props.children}
      </Tooltip>
    );
  }
}
