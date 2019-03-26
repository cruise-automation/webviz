// @flow
//
//  Copyright (c) 2018-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import _ from "lodash";
import * as React from "react";
import Dimensions from "react-container-dimensions";
import stringHash from "string-hash";
import styled from "styled-components";
import textWidth from "text-width";
import tinycolor from "tinycolor2";

import helpContent from "./index.help.md";
import labelVisibilityMap from "./labelVisibilityMap";
import Button from "webviz-core/src/components/Button";
import MessageHistory, {
  type MessageHistoryData,
  type MessageHistoryItem,
  type MessageHistoryTimestampMethod,
  getTimestampForMessage,
} from "webviz-core/src/components/MessageHistory";
import Panel from "webviz-core/src/components/Panel";
import PanelToolbar from "webviz-core/src/components/PanelToolbar";
import TimeBasedChart, { type TimeBasedChartTooltipData } from "webviz-core/src/components/TimeBasedChart";
import { getGlobalHooks } from "webviz-core/src/loadWebviz";
import colors from "webviz-core/src/styles/colors.module.scss";
import mixins from "webviz-core/src/styles/mixins.module.scss";
import { darkColor, lineColors } from "webviz-core/src/util/plotColors";
import { subtractTimes, toSec } from "webviz-core/src/util/time";
import { grey } from "webviz-core/src/util/toolsColorScheme";

const transitionableRosTypes = [
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
];

const fontFamily = "'Inter UI', -apple-system, BlinkMacSystemFont, sans-serif";
const fontSize = 10;
const fontWeight = "bold";
function measureText(text: string): number {
  return textWidth(text, { family: fontFamily, size: fontSize, weight: fontWeight }) + 3;
}

const SRoot = styled.div`
  display: flex;
  flex-grow: 1;
  z-index: 0; // create new stacking context
  overflow: hidden;
`;

const SAddButton = styled.div`
  position: absolute;
  top: 0;
  right: 65px;
  opacity: 0;
  transition: opacity 0.1s ease-in-out;
  z-index: 1;

  ${SRoot}:hover & {
    opacity: 1;
  }
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

const inputColor = tinycolor(colors.toolbar)
  .setAlpha(0.7)
  .toHexString();
const inputColorBright = tinycolor(colors.toolbar)
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
  overflow: hidden;
  line-height: 20px;

  &:hover {
    background: ${inputColor};
  }
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
      callback: () => "",
    },
    type: "category",
    offset: true,
  },
];

const plugins = {
  datalabels: {
    align: 0,
    anchor: "center",
    rotation: 0,
    offset: -5,
    formatter: (value: any, context: any) => {
      return labelVisibilityMap(context, measureText)[context.datasetIndex][context.dataIndex]
        ? `${value.label}\n\n`
        : "";
    },
    color: (context: any) => context.dataset.data[context.dataIndex].labelColor,
    clip: true,
    font: {
      family: fontFamily,
      size: fontSize,
      weight: fontWeight,
    },
  },
  multicolorLineYOffset: 6,
};

export type StateTransitionPath = { value: string, timestampMethod: MessageHistoryTimestampMethod };
export type StateTransitionConfig = { paths: StateTransitionPath[] };

type Props = {
  config: StateTransitionConfig,
  saveConfig: ($Shape<StateTransitionConfig>) => void,
};

class StateTransitions extends React.PureComponent<Props> {
  static panelType = "StateTransitions";
  static defaultConfig = getGlobalHooks().perPanelHooks().StateTransitions.defaultConfig;

  _onInputChange = (value: string, index: ?number) => {
    if (index == null) {
      throw new Error("index not set");
    }
    const newPaths = this.props.config.paths.slice();
    newPaths[index] = { ...newPaths[index], value: value.trim() };
    this.props.saveConfig({ paths: newPaths });
  };

  _onInputTimestampMethodChange = (value: MessageHistoryTimestampMethod, index: ?number) => {
    if (index == null) {
      throw new Error("index not set");
    }
    const newPaths = this.props.config.paths.slice();
    newPaths[index] = { ...newPaths[index], timestampMethod: value };
    this.props.saveConfig({ paths: newPaths });
  };

  render() {
    const { paths } = this.props.config;
    const onlyTopicsHeight = paths.length * 55;
    const heightPerTopic = onlyTopicsHeight / paths.length;
    const xAxisHeight = 30;
    const height = onlyTopicsHeight + xAxisHeight;

    return (
      <SRoot>
        <PanelToolbar floating helpContent={helpContent} />
        <SAddButton>
          <Button
            onClick={() =>
              this.props.saveConfig({
                paths: [...this.props.config.paths, { value: "", timestampMethod: "receiveTime" }],
              })
            }>
            add
          </Button>
        </SAddButton>
        <MessageHistory paths={paths.map(({ value }) => value)}>
          {({ itemsByPath, startTime }: MessageHistoryData) => {
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
                  const item: MessageHistoryItem = itemsByPath[path][index];
                  if (item.queriedData.length !== 1) {
                    continue;
                  }

                  const timestamp = getTimestampForMessage(item.message, timestampMethod);
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
                  const color = baseColors[valueForColor % Object.values(baseColors).length];
                  dataItem.pointBackgroundColor.push(darkColor(color));
                  dataItem.colors.push(color);
                  dataItem.datalabels.display.push(previousValue === undefined || previousValue !== value);
                  dataItem.data.push({
                    x: toSec(subtractTimes(timestamp, startTime)),
                    y: pathIndex.toString(),
                    tooltip: ({
                      item,
                      path,
                      value,
                      constantName,
                      startTime,
                    }: TimeBasedChartTooltipData),
                    // $FlowFixMe
                    label: constantName ? `${constantName} (${value})` : value,
                    labelColor: color,
                  });
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
                        yAxes={yAxes}
                        plugins={plugins}
                      />

                      {paths.map(({ value: path, timestampMethod }, index) => (
                        <SInputContainer key={index} style={{ top: index * heightPerTopic }}>
                          <SInputDelete
                            onClick={() => {
                              const newPaths = this.props.config.paths.slice();
                              newPaths.splice(index, 1);
                              this.props.saveConfig({ paths: newPaths });
                            }}>
                            ✕
                          </SInputDelete>
                          <MessageHistory.Input
                            path={path}
                            onChange={this._onInputChange}
                            index={index}
                            autoSize
                            validTypes={transitionableRosTypes}
                            noMultiSlices
                            timestampMethod={timestampMethod}
                            onTimestampMethodChange={this._onInputTimestampMethodChange}
                          />
                        </SInputContainer>
                      ))}
                    </SChartContainerInner>
                  )}
                </Dimensions>
              </SChartContainerOuter>
            );
          }}
        </MessageHistory>
      </SRoot>
    );
  }
}

export default Panel<StateTransitionConfig>(StateTransitions);
