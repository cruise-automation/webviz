// @flow
//
//  Copyright (c) 2018-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import cx from "classnames";
import React, { PureComponent } from "react";

import { plotableRosTypes } from "./index";
import styles from "./PlotLegend.module.scss";
import MessageHistory, { type MessageHistoryTimestampMethod } from "webviz-core/src/components/MessageHistory";
import type { PlotPath } from "webviz-core/src/panels/Plot/internalTypes";
import { lineColors } from "webviz-core/src/util/plotColors";

type PlotLegendProps = {|
  paths: PlotPath[],
  onChange: ({ paths: PlotPath[] }) => void,
|};
export default class PlotLegend extends PureComponent<PlotLegendProps> {
  _onInputChange = (value: string, index: ?number) => {
    if (index == null) {
      throw new Error("index not set");
    }
    const newPaths = this.props.paths.slice();
    newPaths[index] = { ...newPaths[index], value: value.trim() };
    this.props.onChange({ paths: newPaths });
  };

  _onInputTimestampMethodChange = (value: MessageHistoryTimestampMethod, index: ?number) => {
    if (index == null) {
      throw new Error("index not set");
    }
    const newPaths = this.props.paths.slice();
    newPaths[index] = { ...newPaths[index], timestampMethod: value };
    this.props.onChange({ paths: newPaths });
  };

  render() {
    const { paths, onChange } = this.props;

    return (
      <div className={styles.root}>
        {paths.map((path: PlotPath, index: number) => {
          return (
            <React.Fragment key={index}>
              <div className={styles.item}>
                <div
                  className={styles.itemIconContainer}
                  onClick={() => {
                    const newPaths = paths.slice();
                    newPaths[index] = { ...newPaths[index], enabled: !newPaths[index].enabled };
                    onChange({ paths: newPaths });
                  }}>
                  <div
                    className={styles.itemIcon}
                    style={{ color: path.enabled ? lineColors[index % lineColors.length] : "#777" }}
                  />
                </div>
                <div
                  className={styles.itemRemove}
                  onClick={() => {
                    const newPaths = paths.slice();
                    newPaths.splice(index, 1);
                    onChange({ paths: newPaths });
                  }}>
                  ✕
                </div>
                <div
                  className={cx({
                    [styles.itemInput]: true,
                    [styles.itemInputDisabled]: !path.enabled,
                  })}>
                  <MessageHistory.Input
                    path={path.value}
                    onChange={this._onInputChange}
                    onTimestampMethodChange={this._onInputTimestampMethodChange}
                    validTypes={plotableRosTypes}
                    index={index}
                    autoSize
                    timestampMethod={path.timestampMethod}
                  />
                </div>
              </div>
            </React.Fragment>
          );
        })}
        <div
          className={styles.addLine}
          onClick={() => onChange({ paths: [...paths, { value: "", enabled: true, timestampMethod: "receiveTime" }] })}>
          + add line
        </div>
      </div>
    );
  }
}
