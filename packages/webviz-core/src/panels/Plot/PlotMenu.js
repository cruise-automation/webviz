// @flow
//
//  Copyright (c) 2018-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import cx from "classnames";
import React from "react";

import styles from "./PlotMenu.module.scss";
import Item from "webviz-core/src/components/Menu/Item";
import type { PlotConfig } from "webviz-core/src/panels/Plot";

function isValidInput(value: string) {
  return value === "" || !isNaN(parseFloat(value));
}

export default function PlotMenu({
  minYValue,
  maxYValue,
  saveConfig,
  setMinMax,
}: {
  minYValue: string,
  maxYValue: string,
  saveConfig: ($Shape<PlotConfig>) => void,
  setMinMax: () => void,
}) {
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
      <Item>
        <button onClick={setMinMax}>Set min and max</button>
      </Item>
    </>
  );
}
