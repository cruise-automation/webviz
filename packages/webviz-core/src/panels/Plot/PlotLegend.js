// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import MenuIcon from "@mdi/svg/svg/menu.svg";
import cx from "classnames";
import { last } from "lodash";
import React, { useCallback } from "react";

import { plotableRosTypes, type PlotConfig } from "./index";
import styles from "./PlotLegend.module.scss";
import Icon from "webviz-core/src/components/Icon";
import { MessageHistoryInput, type MessageHistoryTimestampMethod } from "webviz-core/src/components/MessageHistory";
import { type PlotPath, isReferenceLinePlotPathType } from "webviz-core/src/panels/Plot/internalTypes";
import { lineColors } from "webviz-core/src/util/plotColors";

type PlotLegendProps = {|
  paths: PlotPath[],
  saveConfig: ($Shape<PlotConfig>) => void,
  showLegend: boolean,
  xAxisVal: "timestamp" | "index",
|};

function PlotLegendToggle(props: { onToggle: () => void }) {
  return (
    <div className={styles.legendToggle} onClick={props.onToggle}>
      <Icon>
        <MenuIcon />
      </Icon>
    </div>
  );
}

export default function PlotLegend(props: PlotLegendProps) {
  const { paths, saveConfig, showLegend, xAxisVal } = props;
  const lastPath = last(paths);

  const onInputChange = useCallback(
    (value: string, index: ?number) => {
      if (index == null) {
        throw new Error("index not set");
      }
      const newPaths = paths.slice();
      newPaths[index] = { ...newPaths[index], value: value.trim() };
      saveConfig({ paths: newPaths });
    },
    [paths, saveConfig]
  );

  const onInputTimestampMethodChange = useCallback(
    (value: MessageHistoryTimestampMethod, index: ?number) => {
      if (index == null) {
        throw new Error("index not set");
      }
      const newPaths = paths.slice();
      newPaths[index] = { ...newPaths[index], timestampMethod: value };
      saveConfig({ paths: newPaths });
    },
    [paths, saveConfig]
  );

  if (!showLegend) {
    return (
      <div className={styles.root}>
        <PlotLegendToggle onToggle={() => saveConfig({ showLegend: !showLegend })} />
      </div>
    );
  }

  return (
    <div className={styles.root}>
      <PlotLegendToggle onToggle={() => saveConfig({ showLegend: !showLegend })} />
      {paths.map((path: PlotPath, index: number) => {
        const isReferenceLinePlotPath = isReferenceLinePlotPathType(path);
        let timestampMethod;
        // Only allow chosing the timestamp method if it is applicable (not a reference line) and there is at least
        // one character typed.
        if (!isReferenceLinePlotPath && path.value.length > 0) {
          timestampMethod = path.timestampMethod;
        }
        return (
          <React.Fragment key={index}>
            <div className={styles.item}>
              <div
                className={styles.itemIconContainer}
                onClick={() => {
                  const newPaths = paths.slice();
                  newPaths[index] = { ...newPaths[index], enabled: !newPaths[index].enabled };
                  saveConfig({ paths: newPaths });
                }}>
                <div
                  className={styles.itemIcon}
                  style={{ color: path.enabled ? lineColors[index % lineColors.length] : "#777" }}
                />
              </div>
              <div
                className={cx({
                  [styles.itemInput]: true,
                  [styles.itemInputDisabled]: !path.enabled,
                })}>
                <MessageHistoryInput
                  path={path.value}
                  onChange={onInputChange}
                  onTimestampMethodChange={onInputTimestampMethodChange}
                  validTypes={plotableRosTypes}
                  placeholder="Enter a topic name or a number"
                  index={index}
                  autoSize
                  disableAutocomplete={isReferenceLinePlotPath}
                  {...(xAxisVal === "timestamp" ? { timestampMethod } : null)}
                />
              </div>
              <div
                className={styles.itemRemove}
                onClick={() => {
                  const newPaths = paths.slice();
                  newPaths.splice(index, 1);
                  saveConfig({ paths: newPaths });
                }}>
                ✕
              </div>
            </div>
          </React.Fragment>
        );
      })}
      <div
        className={styles.addLine}
        onClick={() =>
          saveConfig({
            paths: [
              ...paths,
              {
                value: "",
                enabled: true,
                // For convenience, default to the `timestampMethod` of the last path.
                timestampMethod: lastPath ? lastPath.timestampMethod : "receiveTime",
              },
            ],
          })
        }>
        + add line
      </div>
    </div>
  );
}
