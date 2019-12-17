// @flow
//
//  Copyright (c) 2019-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.
import ChartBubbleIcon from "@mdi/svg/svg/chart-bubble.svg";
import ChartLineVariantIcon from "@mdi/svg/svg/chart-line-variant.svg";
import TargetIcon from "@mdi/svg/svg/target.svg";
import { uniq } from "lodash";
import React, { type Node, useCallback } from "react";

import { type ValueAction } from "./getValueActionForValue";
import styles from "./index.module.scss";
import Icon from "webviz-core/src/components/Icon";
import Plot, { type PlotConfig, plotableRosTypes } from "webviz-core/src/panels/Plot";
import type { PanelConfig } from "webviz-core/src/types/panels";

type Props = {
  valueAction: ValueAction,
  basePath: string,
  onTopicNameChange: (string) => void,
  openSiblingPanel: (string, cb: (PanelConfig) => PanelConfig) => void,
};

export default function RawMessagesIcons({ valueAction, basePath, onTopicNameChange, openSiblingPanel }: Props): Node {
  const openSiblingPanelOnClick = useCallback(
    (pathSuffix: string) => () => {
      openSiblingPanel(
        // $FlowFixMe: https://stackoverflow.com/questions/52508434/adding-static-variable-to-union-of-class-types
        Plot.panelType,
        (config: PlotConfig) =>
          ({
            ...config,
            paths: uniq(
              config.paths.concat([
                { value: `${basePath}${pathSuffix}`, enabled: true, timestampMethod: "receiveTime" },
              ])
            ),
          }: PlotConfig)
      );
    },
    [basePath, openSiblingPanel]
  );
  const onPivot = useCallback(
    () => onTopicNameChange(`${basePath}${valueAction.type === "pivot" ? valueAction.pivotPath : ""}`),
    [basePath, onTopicNameChange, valueAction]
  );
  if (valueAction.type === "pivot") {
    return (
      <Icon fade className={styles.icon} onClick={onPivot} tooltip="Pivot on this value" key="pivot">
        <TargetIcon />
      </Icon>
    );
  }
  const { singleSlicePath, multiSlicePath, primitiveType } = valueAction;
  return (
    <span>
      {plotableRosTypes.includes(primitiveType) && (
        <Icon fade className={styles.icon} onClick={openSiblingPanelOnClick(singleSlicePath)} tooltip="Line chart">
          <ChartLineVariantIcon />
        </Icon>
      )}
      {plotableRosTypes.includes(primitiveType) && multiSlicePath !== singleSlicePath && (
        <Icon fade className={styles.icon} onClick={openSiblingPanelOnClick(multiSlicePath)} tooltip="Scatter plot">
          <ChartBubbleIcon />
        </Icon>
      )}
    </span>
  );
}
