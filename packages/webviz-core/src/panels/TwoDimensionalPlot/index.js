// @flow
//
//  Copyright (c) 2019-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.
import { flatten, pick, round } from "lodash";
import React, { useMemo, useCallback } from "react";
import ChartComponent from "react-chartjs-2";
import Dimensions from "react-container-dimensions";
import { hot } from "react-hot-loader/root";
import styled from "styled-components";

import helpContent from "./index.help.md";
import { PanelToolbarLabel, PanelToolbarInput } from "webviz-core/shared/panelToolbarStyles";
import EmptyState from "webviz-core/src/components/EmptyState";
import Flex from "webviz-core/src/components/Flex";
import { Item } from "webviz-core/src/components/Menu";
import MessageHistory, { type MessageHistoryData } from "webviz-core/src/components/MessageHistory";
import MessageHistoryInput from "webviz-core/src/components/MessageHistory/MessageHistoryInput";
import Panel from "webviz-core/src/components/Panel";
import PanelToolbar from "webviz-core/src/components/PanelToolbar";
import { colors } from "webviz-core/src/util/colors";

const SContainer = styled.div`
  display: flex;
  flex: 1 1 auto;
  flex-direction: column;
  height: 100%;
`;

const SRoot = styled.div`
  display: flex;
  flex: 1 1 auto;
  width: 100%;
  overflow: hidden;
`;

// TODO: Autocomplete should only show paths that actually match the format this panel supports
const VALID_TYPES = ["message"];
const keysToPick = [
  "order",
  "label",
  "backgroundColor",
  "borderColor",
  "borderDash",
  "borderWidth",
  "pointBackgroundColor",
  "pointBorderColor",
  "pointBorderWidth",
  "pointRadius",
  "pointStyle",
  "data",
];

const isValidMinMaxVal = (val?: string) => {
  return val == null || val === "" || !isNaN(parseFloat(val));
};

type Path = { value: string };
type Config = { path: Path, minXVal?: string, maxXVal?: string, minYVal?: string, maxYVal?: string };
type Props = { config: Config, saveConfig: ($Shape<Config>) => void };
export type Line = {
  order: number,
  label: string,
  backgroundColor?: string,
  borderColor?: string,
  borderDash?: string,
  borderWidth?: number,
  pointBackgroundColor?: string,
  pointBorderColor?: string,
  pointBorderWidth?: number,
  pointRadius?: number,
  pointStyle?: string,
  data: { x: number, y: number }[],
};
type PlotMessage = {
  type: "webviz_msgs/2DPlotMsg",
  lines: Line[],
  points: Line[],
  polygons: Line[],
  title?: string,
  yAxisLabel?: string,
  xAxisLabel?: string,
};
function TwoDimensionalPlot(props: Props) {
  const {
    config: { path, minXVal, maxXVal, minYVal, maxYVal },
    saveConfig,
  } = props;

  const menuContent = useMemo(
    () => (
      <>
        <Item>
          <Flex>
            <Flex col style={{ maxWidth: 100, marginRight: 5 }}>
              <PanelToolbarLabel>Min X</PanelToolbarLabel>
              <PanelToolbarInput
                style={isValidMinMaxVal(minXVal) ? {} : { color: colors.REDL1 }}
                value={minXVal}
                onChange={({ target }) => saveConfig({ minXVal: target.value })}
                onClick={(e) => e.stopPropagation()}
                placeholder="auto"
              />
            </Flex>
            <Flex col style={{ maxWidth: 100 }}>
              <PanelToolbarLabel>Max X</PanelToolbarLabel>
              <PanelToolbarInput
                style={isValidMinMaxVal(maxXVal) ? {} : { color: colors.REDL1 }}
                value={maxXVal}
                onChange={({ target }) => saveConfig({ maxXVal: target.value })}
                onClick={(e) => e.stopPropagation()}
                placeholder="auto"
              />
            </Flex>
          </Flex>
        </Item>
        <Item>
          <Flex>
            <Flex col style={{ maxWidth: 100, marginRight: 5 }}>
              <PanelToolbarLabel>Min Y</PanelToolbarLabel>
              <PanelToolbarInput
                style={isValidMinMaxVal(minYVal) ? {} : { color: colors.REDL1 }}
                value={minYVal}
                onChange={({ target }) => saveConfig({ minYVal: target.value })}
                onClick={(e) => e.stopPropagation()}
                placeholder="auto"
              />
            </Flex>
            <Flex col style={{ maxWidth: 100 }}>
              <PanelToolbarLabel>Max Y</PanelToolbarLabel>
              <PanelToolbarInput
                style={isValidMinMaxVal(maxYVal) ? {} : { color: colors.REDL1 }}
                value={maxYVal}
                onChange={({ target }) => saveConfig({ maxYVal: target.value })}
                onClick={(e) => e.stopPropagation()}
                placeholder="auto"
              />
            </Flex>
          </Flex>
        </Item>
      </>
    ),
    [maxXVal, maxYVal, minXVal, minYVal, saveConfig]
  );

  const getBufferedMinMax = useCallback((allVals: number[]) => {
    const minVal = Math.min(...allVals);
    const maxVal = Math.max(...allVals);
    const diff = maxVal - minVal;
    return {
      min: !diff ? minVal - 1 : minVal - diff * 0.05,
      max: !diff ? maxVal + 1 : maxVal + diff * 0.05,
    };
  }, []);

  return (
    <MessageHistory paths={[path.value]} historySize={1}>
      {({ itemsByPath }: MessageHistoryData) => {
        const msgs = itemsByPath[path.value];
        const message: PlotMessage = (msgs &&
          msgs[0] &&
          msgs[0].queriedData &&
          msgs[0].queriedData[0] &&
          msgs[0].queriedData[0].value: any);
        const currentData = message && message.type === "webviz_msgs/2DPlotMsg" ? message : null;
        const { title, yAxisLabel, xAxisLabel, lines = [], points = [], polygons = [] } = currentData || {};
        const datasets = currentData
          ? [
              ...lines.map((line, idx) => ({ ...pick(line, keysToPick), showLine: true, fill: false })),
              ...points.map((point, idx) => pick(point, keysToPick)),
              ...polygons.map((polygon, idx) => ({
                ...pick(polygon, keysToPick),
                data: polygon.data[0] ? polygon.data.concat([polygon.data[0]]) : polygon.data,
                fill: true,
                pointRadius: 0,
                showLine: true,
                lineTension: 0,
              })),
            ].sort((a, b) => (b.order || 0) - (a.order || 0))
          : [];
        const allXs = flatten(datasets.map((dataset) => (dataset.data ? dataset.data.map(({ x }) => x) : [])));
        const allYs = flatten(datasets.map((dataset) => (dataset.data ? dataset.data.map(({ y }) => y) : [])));
        return (
          <SContainer>
            <PanelToolbar helpContent={helpContent} menuContent={menuContent}>
              <MessageHistoryInput
                path={path.value}
                onChange={(newValue) => saveConfig({ path: { value: newValue } })}
                inputStyle={{ height: "100%" }}
                validTypes={VALID_TYPES}
                placeholder='Select topic messages with a "type" of "webviz_msgs/2DPlotMsg"'
                autoSize
              />
            </PanelToolbar>
            {!msgs || msgs.length === 0 ? (
              <EmptyState>No 2D Plot messages found</EmptyState>
            ) : (
              <SRoot>
                <Dimensions>
                  {({ width, height }) => (
                    <ChartComponent
                      type="scatter"
                      width={width}
                      height={height}
                      key={`${width}x${height}`}
                      options={{
                        title: { display: !!title, text: title },
                        scales: {
                          yAxes: [
                            {
                              scaleLabel: { display: !!yAxisLabel, labelString: yAxisLabel },
                              ticks: {
                                min: parseFloat(minYVal) ? parseFloat(minYVal) : getBufferedMinMax(allYs).min,
                                max: parseFloat(maxYVal) ? parseFloat(maxYVal) : getBufferedMinMax(allYs).max,
                              },
                            },
                          ],
                          xAxes: [
                            {
                              scaleLabel: { display: !!xAxisLabel, labelString: xAxisLabel },
                              ticks: {
                                min: parseFloat(minXVal) ? parseFloat(minXVal) : getBufferedMinMax(allXs).min,
                                max: parseFloat(maxXVal) ? parseFloat(maxXVal) : getBufferedMinMax(allXs).max,
                              },
                            },
                          ],
                        },
                        color: colors.GRAY,
                        animation: { duration: 0 },
                        legend: { display: false },
                        pan: { enabled: false },
                        zoom: { enabled: false },
                        tooltips: {
                          callbacks: {
                            label(tooltipItem, data) {
                              let label = data.datasets[tooltipItem.datasetIndex].label || "";
                              if (label) {
                                label += ": ";
                              }
                              label += `(${round(tooltipItem.xLabel, 5)}, ${round(tooltipItem.yLabel, 5)})`;
                              return label;
                            },
                          },
                        },
                      }}
                      data={{ datasets }}
                    />
                  )}
                </Dimensions>
              </SRoot>
            )}
          </SContainer>
        );
      }}
    </MessageHistory>
  );
}

TwoDimensionalPlot.panelType = "TwoDimensionalPlot";
TwoDimensionalPlot.defaultConfig = { path: { value: "" } };

export default hot(Panel<Config>(TwoDimensionalPlot));
