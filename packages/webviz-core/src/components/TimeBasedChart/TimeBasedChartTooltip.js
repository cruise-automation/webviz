// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import * as React from "react";

import type { TimeBasedChartTooltipData } from "./index";
import styles from "./TimeBasedChartTooltip.module.scss";
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
    const { receiveTime, headerStamp } = tooltip.item;
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
        {receiveTime && headerStamp && (
          <table>
            <tbody>
              <tr>
                <th />
                {receiveTime && <th>receive time</th>}
                {headerStamp && <th>header.stamp</th>}
              </tr>
              <tr>
                <th>ROS</th>
                {receiveTime && <td>{formatTimeRaw(receiveTime)}</td>}
                {headerStamp && <td>{formatTimeRaw(headerStamp)}</td>}
              </tr>
              <tr>
                <th>Time</th>
                {receiveTime && <td>{formatTime(receiveTime)}</td>}
                {headerStamp && <td>{formatTime(headerStamp)}</td>}
              </tr>
              <tr>
                <th>Elapsed</th>
                {receiveTime && <td>{toSec(subtractTimes(receiveTime, tooltip.startTime)).toFixed(9)} sec</td>}
                {headerStamp && <td>{toSec(subtractTimes(headerStamp, tooltip.startTime)).toFixed(9)} sec</td>}
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
