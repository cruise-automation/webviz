// @flow
//
//  Copyright (c) 2019-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.
import ChartBubbleIcon from "@mdi/svg/svg/chart-bubble.svg";
import ChartLineVariantIcon from "@mdi/svg/svg/chart-line-variant.svg";
import DotsHorizontalIcon from "@mdi/svg/svg/dots-horizontal.svg";
import TargetIcon from "@mdi/svg/svg/target.svg";
import React, { type Node, useCallback } from "react";

import { type ValueAction } from "./getValueActionForValue";
import styles from "./index.module.scss";
import Icon from "webviz-core/src/components/Icon";
import { openSiblingPlotPanel, plotableRosTypes } from "webviz-core/src/panels/Plot";
import { openSiblingStateTransitionsPanel, transitionableRosTypes } from "webviz-core/src/panels/StateTransitions";
import type { PanelConfig } from "webviz-core/src/types/panels";

type Props = {
  valueAction: ValueAction,
  basePath: string,
  onTopicPathChange: (string) => void,
  openSiblingPanel: (string, cb: (PanelConfig) => PanelConfig) => void,
};

export default function RawMessagesIcons({ valueAction, basePath, onTopicPathChange, openSiblingPanel }: Props): Node {
  const openPlotPanel = useCallback(
    (pathSuffix: string) => () => {
      openSiblingPlotPanel(openSiblingPanel, `${basePath}${pathSuffix}`);
    },
    [basePath, openSiblingPanel]
  );
  const openStateTransitionsPanel = useCallback(
    (pathSuffix: string) => () => {
      openSiblingStateTransitionsPanel(openSiblingPanel, `${basePath}${pathSuffix}`);
    },
    [basePath, openSiblingPanel]
  );
  const onPivot = useCallback(
    () => onTopicPathChange(`${basePath}${valueAction.type === "pivot" ? valueAction.pivotPath : ""}`),
    [basePath, onTopicPathChange, valueAction]
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
        <Icon fade className={styles.icon} onClick={openPlotPanel(singleSlicePath)} tooltip="Line chart">
          <ChartLineVariantIcon />
        </Icon>
      )}
      {plotableRosTypes.includes(primitiveType) && multiSlicePath !== singleSlicePath && (
        <Icon fade className={styles.icon} onClick={openPlotPanel(multiSlicePath)} tooltip="Scatter plot">
          <ChartBubbleIcon />
        </Icon>
      )}
      {transitionableRosTypes.includes(primitiveType) && multiSlicePath === singleSlicePath && (
        <Icon
          fade
          className={styles.icon}
          onClick={openStateTransitionsPanel(singleSlicePath)}
          tooltip="State Transitions">
          <DotsHorizontalIcon />
        </Icon>
      )}
    </span>
  );
}
