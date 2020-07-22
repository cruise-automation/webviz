// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import AlertCircleIcon from "@mdi/svg/svg/alert-circle.svg";
import MenuIcon from "@mdi/svg/svg/menu.svg";
import cx from "classnames";
import { last } from "lodash";
import React, { useCallback, useMemo } from "react";

import { plotableRosTypes, type PlotConfig, type PlotXAxisVal } from "./index";
import styles from "./PlotLegend.module.scss";
import Dropdown from "webviz-core/src/components/Dropdown";
import Icon from "webviz-core/src/components/Icon";
import MessagePathInput from "webviz-core/src/components/MessagePathSyntax/MessagePathInput";
import {
  type PlotPath,
  type BasePlotPath,
  isReferenceLinePlotPathType,
} from "webviz-core/src/panels/Plot/internalTypes";
import { lineColors } from "webviz-core/src/util/plotColors";
import { colors } from "webviz-core/src/util/sharedStyleConstants";
import type { TimestampMethod } from "webviz-core/src/util/time";

type PlotLegendProps = {|
  paths: PlotPath[],
  saveConfig: ($Shape<PlotConfig>) => void,
  showLegend: boolean,
  xAxisVal: PlotXAxisVal,
  xAxisPath?: BasePlotPath,
  pathsWithMismatchedDataLengths: string[],
|};

const shortXAxisLabel = (path: PlotXAxisVal): string => {
  switch (path) {
    case "custom":
      return "path (accum)";
    case "index":
      return "index";
    case "currentCustom":
      return "path (current)";
    case "timestamp":
      return "timestamp";
    default:
      (path: empty); // Assert the switch is exhaustive
      throw new Error("Satisfy flow");
  }
};

export default function PlotLegend(props: PlotLegendProps) {
  const { paths, saveConfig, showLegend, xAxisVal, xAxisPath, pathsWithMismatchedDataLengths } = props;
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
    (value: TimestampMethod, index: ?number) => {
      if (index == null) {
        throw new Error("index not set");
      }
      const newPaths = paths.slice();
      newPaths[index] = { ...newPaths[index], timestampMethod: value };
      saveConfig({ paths: newPaths });
    },
    [paths, saveConfig]
  );

  const { toggleToHideLegend, toggleToShowLegend } = useMemo(
    () => ({
      toggleToHideLegend: () => saveConfig({ showLegend: false }),
      toggleToShowLegend: () => saveConfig({ showLegend: true }),
    }),
    [saveConfig]
  );

  if (!showLegend) {
    return (
      <div className={styles.root}>
        <Icon className={styles.legendToggle} onClick={toggleToShowLegend}>
          <MenuIcon />
        </Icon>
      </div>
    );
  }

  return (
    <div className={styles.root}>
      <Icon className={styles.legendToggle} onClick={toggleToHideLegend}>
        <MenuIcon />
      </Icon>
      <div className={styles.item}>
        x:
        <div className={styles.itemIconContainer} style={{ width: "auto", lineHeight: "normal", zIndex: 2 }}>
          <Dropdown
            dataTest="plot-legend-x-axis-menu"
            value={xAxisVal}
            text={shortXAxisLabel(xAxisVal)}
            btnStyle={{ backgroundColor: "transparent", padding: 3 }}
            onChange={(newXAxisVal) => saveConfig({ xAxisVal: newXAxisVal })}
            noPortal>
            <span value="timestamp">timestamp</span>
            <span value="index">index</span>
            <span value="currentCustom">msg path (current)</span>
            <span value="custom">msg path (accumulated)</span>
          </Dropdown>
        </div>
        <div
          className={cx({
            [styles.itemInput]: true,
            [styles.itemInputDisabled]: !xAxisPath?.enabled,
          })}>
          {xAxisVal === "custom" || xAxisVal === "currentCustom" ? (
            <MessagePathInput
              path={xAxisPath?.value || "/"}
              onChange={(newXAxisPath) =>
                saveConfig({ xAxisPath: { value: newXAxisPath, enabled: xAxisPath ? xAxisPath.enabled : true } })
              }
              validTypes={plotableRosTypes}
              placeholder="Enter a topic name or a number"
              disableAutocomplete={xAxisPath && isReferenceLinePlotPathType(xAxisPath)}
              autoSize
            />
          ) : null}
        </div>
      </div>
      {paths.map((path: PlotPath, index: number) => {
        const isReferenceLinePlotPath = isReferenceLinePlotPathType(path);
        let timestampMethod;
        // Only allow chosing the timestamp method if it is applicable (not a reference line) and there is at least
        // one character typed.
        if (!isReferenceLinePlotPath && path.value.length > 0) {
          timestampMethod = path.timestampMethod;
        }
        const hasMismatchedDataLength = pathsWithMismatchedDataLengths.includes(path.value);

        return (
          <React.Fragment key={index}>
            <div className={styles.item}>
              y:
              <div
                className={styles.itemIconContainer}
                style={{ zIndex: 1 }}
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
                <MessagePathInput
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
                {hasMismatchedDataLength && (
                  <Icon
                    style={{ color: colors.RED }}
                    clickable={false}
                    small
                    tooltipProps={{ placement: "top" }}
                    tooltip="Mismatch in the number of elements in x-axis and y-axis messages">
                    <AlertCircleIcon />
                  </Icon>
                )}
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
