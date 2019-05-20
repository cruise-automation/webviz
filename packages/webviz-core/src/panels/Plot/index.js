// @flow
//
//  Copyright (c) 2018-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import cx from "classnames";
import React, { PureComponent } from "react";

import helpContent from "./index.help.md";
import styles from "./index.module.scss";
import Flex from "webviz-core/src/components/Flex";
import Item from "webviz-core/src/components/Menu/Item";
import Panel from "webviz-core/src/components/Panel";
import PanelToolbar from "webviz-core/src/components/PanelToolbar";
import type { PlotPath } from "webviz-core/src/panels/Plot/internalTypes";
import PlotChart from "webviz-core/src/panels/Plot/PlotChart";
import PlotLegend from "webviz-core/src/panels/Plot/PlotLegend";

export const plotableRosTypes = [
  "bool",
  "int8",
  "uint8",
  "int16",
  "uint16",
  "int32",
  "uint32",
  "int64",
  "uint64",
  "float32",
  "float64",
];

export type PlotConfig = {
  paths: PlotPath[],
  minYValue: string,
  maxYValue: string,
};

type Props = {
  config: PlotConfig,
  saveConfig: ($Shape<PlotConfig>) => void,
};

function isValidInput(value: string) {
  return value === "" || !isNaN(parseFloat(value));
}

class Plot extends PureComponent<Props> {
  static panelType = "Plot";
  static defaultConfig = { paths: [], minYValue: "", maxYValue: "" };

  _renderMenuContent(minYValue: string, maxYValue: string) {
    const { saveConfig } = this.props;

    return (
      <>
        <Item onClick={() => saveConfig({ maxYValue: maxYValue === "" ? "10" : "" })}>
          <div className={styles.label}>Maximum</div>
          <input
            className={cx(styles.input, { [styles.inputError]: !isValidInput(maxYValue) })}
            value={maxYValue}
            onChange={(event) => {
              saveConfig({ maxYValue: event.target.value });
            }}
            onClick={(event) => event.stopPropagation()}
            placeholder="auto"
          />
        </Item>
        <Item onClick={() => saveConfig({ minYValue: minYValue === "" ? "-10" : "" })}>
          <div className={styles.label}>Minimum</div>
          <input
            className={cx(styles.input, { [styles.inputError]: !isValidInput(minYValue) })}
            value={minYValue}
            onChange={(event) => {
              saveConfig({ minYValue: event.target.value });
            }}
            onClick={(event) => event.stopPropagation()}
            placeholder="auto"
          />
        </Item>
      </>
    );
  }

  render() {
    const { minYValue, maxYValue } = this.props.config;
    let { paths } = this.props.config;
    if (!paths.length) {
      paths = [{ value: "", enabled: true, timestampMethod: "receiveTime" }];
    }

    return (
      <Flex col clip center style={{ position: "relative" }}>
        <PanelToolbar helpContent={helpContent} floating menuContent={this._renderMenuContent(minYValue, maxYValue)} />
        <PlotChart paths={paths} minYValue={parseFloat(minYValue)} maxYValue={parseFloat(maxYValue)} />
        <PlotLegend paths={paths} onChange={this.props.saveConfig} />
      </Flex>
    );
  }
}

export default Panel<PlotConfig>(Plot);
