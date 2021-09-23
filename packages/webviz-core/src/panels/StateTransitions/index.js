// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { uniq } from "lodash";
import React, { useCallback } from "react";
import { hot } from "react-hot-loader/root";
import stringHash from "string-hash";
import styled, { css } from "styled-components";
import tinycolor from "tinycolor2";

import helpContent from "./index.help.md";
import Button from "webviz-core/src/components/Button";
import Dimensions from "webviz-core/src/components/Dimensions";
import MessageHistoryDEPRECATED, { type MessageHistoryData } from "webviz-core/src/components/MessageHistoryDEPRECATED";
import MessagePathInput from "webviz-core/src/components/MessagePathSyntax/MessagePathInput";
import Panel from "webviz-core/src/components/Panel";
import PanelToolbar from "webviz-core/src/components/PanelToolbar";
import TimeBasedChart from "webviz-core/src/components/TimeBasedChart";
import {
  getTooltipItemForMessageHistoryItem,
  type TimeBasedChartTooltipData,
  type DataPoint,
} from "webviz-core/src/components/TimeBasedChart/utils";
import { getGlobalHooks } from "webviz-core/src/loadWebviz";
import mixins from "webviz-core/src/styles/mixins.module.scss";
import type { PanelConfig } from "webviz-core/src/types/panels";
import { positiveModulo } from "webviz-core/src/util";
import { darkColor, lineColors } from "webviz-core/src/util/plotColors";
import { colors } from "webviz-core/src/util/sharedStyleConstants";
import type { TimestampMethod } from "webviz-core/src/util/time";
import { subtractTimes, toSec } from "webviz-core/src/util/time";
import { grey } from "webviz-core/src/util/toolsColorScheme";

export const transitionableRosTypes = [
  "bool",
  "int8",
  "uint8",
  "int16",
  "uint16",
  "int32",
  "uint32",
  "int64",
  "uint64",
  "string",
  "json",
];

const fontFamily = "'Inter UI', -apple-system, sans-serif";
const fontSize = 10;
const fontWeight = "bold";

const SRoot = styled.div`
  display: flex;
  flex-grow: 1;
  z-index: 0; // create new stacking context
  overflow: hidden;
`;

const SAddButton = styled.div`
  position: absolute;
  top: 30px;
  right: 5px;
  opacity: ${({ show }) => (show ? 1 : 0)};
  transition: opacity 0.1s ease-in-out;
  z-index: 1;
`;

const SChartContainerOuter = styled.div`
  width: 100%;
  flex-grow: 1;
  overflow-x: hidden;
  overflow-y: auto;
`;

const SChartContainerInner = styled.div`
  position: relative;
  margin-top: 10px;
`;

const inputColor = tinycolor(colors.DARK3)
  .setAlpha(0.7)
  .toHexString();
const inputColorBright = tinycolor(colors.DARK3)
  .lighten(8)
  .toHexString();
const inputLeft = 20;
const SInputContainer = styled.div`
  display: flex;
  position: absolute;
  padding-left: ${inputLeft}px;
  margin-top: -2px;
  height: 20px;
  padding-right: 4px;
  max-width: calc(100% - ${inputLeft}px);
  min-width: min(100%, 150px); // Don't let it get too small.
  overflow: hidden;
  line-height: 20px;

  &:hover {
    background: ${inputColor};
  }

  // Move over the first input on hover for the toolbar.
  ${({ shrink }) =>
    shrink &&
    css`
      max-width: calc(100% - 150px);
    `}
`;

const SInputDelete = styled.div`
  display: none;
  position: absolute;
  left: ${inputLeft}px;
  transform: translateX(-100%);
  user-select: none;
  height: 20px;
  line-height: 20px;
  padding: 0 6px;
  background: ${inputColor};
  cursor: pointer;

  &:hover {
    background ${inputColorBright};
  }

  ${SInputContainer}:hover & {
    display: block;
  }
`;

const yAxes = [
  {
    ticks: {
      fontFamily: mixins.monospaceFont,
      fontSize: 10,
      fontColor: "#eee",
      maxRotation: 0,
    },
    type: "category",
    offset: true,
  },
];

const plugins = {
  datalabels: {
    anchor: "center",
    align: -45,
    offset: 6,
    clip: true,
    font: {
      family: fontFamily,
      size: fontSize,
      weight: fontWeight,
    },
  },
  multicolorLineYOffset: 6,
};

const scaleOptions = {
  // Hide all y-axis ticks since each bar on the y-axis is just a separate path.
  yAxisTicks: "hide",
};

export type StateTransitionPath = { value: string, timestampMethod: TimestampMethod };
export type StateTransitionConfig = { paths: StateTransitionPath[] };

export function openSiblingStateTransitionsPanel(
  openSiblingPanel: (string, cb: (PanelConfig) => PanelConfig) => void,
  topicName: string
) {
  openSiblingPanel("StateTransitions", (config: StateTransitionConfig) => {
    return ({
      ...config,
      paths: uniq(config.paths.concat([{ value: topicName, enabled: true, timestampMethod: "receiveTime" }])),
    }: StateTransitionConfig);
  });
}

type Props = {
  config: StateTransitionConfig,
  saveConfig: ($Shape<StateTransitionConfig>) => void,
  isHovered: boolean,
};

const StateTransitions = (props: Props) => {
  const { config, saveConfig, isHovered } = props;
  const { paths } = config;
  const onlyTopicsHeight = paths.length * 55;
  const heightPerTopic = onlyTopicsHeight / paths.length;
  const xAxisHeight = 30;
  const height = Math.max(80, onlyTopicsHeight + xAxisHeight);

  const onInputChange = useCallback((value: string, index: ?number) => {
    if (index == null) {
      throw new Error("index not set");
    }
    const newPaths = config.paths.slice();
    newPaths[index] = { ...newPaths[index], value: value.trim() };
    saveConfig({ paths: newPaths });
  }, [config.paths, saveConfig]);

  const onInputTimestampMethodChange = useCallback((value: TimestampMethod, index: ?number) => {
    if (index == null) {
      throw new Error("index not set");
    }
    const newPaths = config.paths.slice();
    newPaths[index] = { ...newPaths[index], timestampMethod: value };
    saveConfig({ paths: newPaths });
  }, [config.paths, saveConfig]);

  return (
    <SRoot>
      <PanelToolbar floating helpContent={helpContent} />
      <SAddButton show={isHovered}>
        <Button
          onClick={() =>
            saveConfig({
              paths: [...config.paths, { value: "", timestampMethod: "receiveTime" }],
            })
          }>
          add
        </Button>
      </SAddButton>
      <MessageHistoryDEPRECATED paths={paths.map(({ value }) => value)}>
        {({ itemsByPath, startTime }: MessageHistoryData) => {
          const tooltips = [];
          const data = {
            yLabels: paths.map((_path, pathIndex) => pathIndex.toString()),
            datasets: paths.map(({ value: path, timestampMethod }, pathIndex) => {
              const dataItem = {
                borderWidth: 10,
                colors: [undefined], // First should be undefined to make sure we don't color in the bar before the change.
                data: [],
                fill: false,
                label: pathIndex.toString(),
                key: pathIndex.toString(),
                pointBackgroundColor: [],
                pointBorderColor: "transparent",
                pointHoverRadius: 3,
                pointRadius: 1.25,
                pointStyle: "circle",
                showLine: true,
                datalabels: {
                  display: [],
                },
              };
              const baseColors = getGlobalHooks().perPanelHooks().StateTransitions.customStateTransitionColors[
                path
              ] || [grey, ...lineColors];
              let previousValue, previousTimestamp;
              for (let index = 0; index < itemsByPath[path].length; index++) {
                const item = getTooltipItemForMessageHistoryItem(itemsByPath[path][index]);
                if (item.queriedData.length !== 1) {
                  continue;
                }

                const timestamp = timestampMethod === "headerStamp" ? item.headerStamp : item.receiveTime;
                if (!timestamp) {
                  continue;
                }

                const { constantName, value } = item.queriedData[0];

                // Skip duplicates.
                if (
                  previousTimestamp &&
                  toSec(subtractTimes(previousTimestamp, timestamp)) === 0 &&
                  previousValue === value
                ) {
                  continue;
                }
                previousTimestamp = timestamp;

                // Skip anything that cannot be cast to a number or is a string.
                if (Number.isNaN(value) && typeof value !== "string") {
                  continue;
                }

                if (typeof value !== "number" && typeof value !== "boolean" && typeof value !== "string") {
                  continue;
                }

                const valueForColor = typeof value === "string" ? stringHash(value) : Math.round(Number(value));
                const color = baseColors[positiveModulo(valueForColor, Object.values(baseColors).length)];
                // We add all points, colors, tooltips, etc to the *beginning* of the list, not the end. When
                // datalabels overlap we usually care about the later ones (further right). By putting those points
                // first in the list, we prioritize datalabels there when the library does its autoclipping.
                dataItem.pointBackgroundColor.unshift(darkColor(color));
                dataItem.colors.unshift(color);
                const label = constantName ? `${constantName} (${String(value)})` : String(value);
                const x = toSec(subtractTimes(timestamp, startTime));
                const y = pathIndex;
                const tooltip: TimeBasedChartTooltipData = {
                  x,
                  y,
                  item,
                  path,
                  value,
                  constantName,
                  startTime,
                };
                tooltips.unshift(tooltip);
                const dataPoint: DataPoint = { x, y };
                const showDatalabel = previousValue === undefined || previousValue !== value;
                // Use "auto" here so that the datalabels library can clip datalabels if they overlap.
                dataItem.datalabels.display.unshift(showDatalabel ? "auto" : undefined);
                if (showDatalabel) {
                  dataPoint.label = label;
                  dataPoint.labelColor = color;
                }
                dataItem.data.unshift(dataPoint);
                previousValue = value;
              }
              return dataItem;
            }),
          };

          const marginRight = 20;

          return (
            <SChartContainerOuter>
              <Dimensions>
                {({ width }) => (
                  <SChartContainerInner style={{ width: width - marginRight, height }}>
                    <TimeBasedChart
                      zoom
                      isSynced
                      width={width - marginRight}
                      height={height}
                      data={data}
                      type="multicolorLine"
                      xAxisIsPlaybackTime
                      yAxes={yAxes}
                      plugins={plugins}
                      scaleOptions={scaleOptions}
                      tooltips={tooltips}
                    />

                    {paths.map(({ value: path, timestampMethod }, index) => (
                      <SInputContainer
                        key={index}
                        style={{ top: index * heightPerTopic }}
                        shrink={index === 0 && isHovered}>
                        <SInputDelete
                          onClick={() => {
                            const newPaths = config.paths.slice();
                            newPaths.splice(index, 1);
                            saveConfig({ paths: newPaths });
                          }}>
                          ✕
                        </SInputDelete>
                        <MessagePathInput
                          path={path}
                          onChange={onInputChange}
                          index={index}
                          autoSize
                          validTypes={transitionableRosTypes}
                          noMultiSlices
                          timestampMethod={timestampMethod}
                          onTimestampMethodChange={onInputTimestampMethodChange}
                        />
                      </SInputContainer>
                    ))}
                  </SChartContainerInner>
                )}
              </Dimensions>
            </SChartContainerOuter>
          );
        }}
      </MessageHistoryDEPRECATED>
    </SRoot>
  );
};

StateTransitions.panelType = "StateTransitions";
StateTransitions.defaultConfig = { paths: [] };

export default hot(Panel<StateTransitionConfig>(StateTransitions));
