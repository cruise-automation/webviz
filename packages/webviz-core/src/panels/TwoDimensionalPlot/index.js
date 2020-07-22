// @flow
//
//  Copyright (c) 2019-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.
import { flatten, pick, round, uniq } from "lodash";
import React, { useState, useMemo, useCallback, useRef, useEffect } from "react";
import Dimensions from "react-container-dimensions";
import DocumentEvents from "react-document-events";
import ReactDOM from "react-dom";
import { hot } from "react-hot-loader/root";
import styled from "styled-components";

import helpContent from "./index.help.md";
import { PanelToolbarLabel, PanelToolbarInput } from "webviz-core/shared/panelToolbarStyles";
import Button from "webviz-core/src/components/Button";
import EmptyState from "webviz-core/src/components/EmptyState";
import Flex from "webviz-core/src/components/Flex";
import { Item } from "webviz-core/src/components/Menu";
import MessagePathInput from "webviz-core/src/components/MessagePathSyntax/MessagePathInput";
import { useLatestMessageDataItem } from "webviz-core/src/components/MessagePathSyntax/useLatestMessageDataItem";
import Panel from "webviz-core/src/components/Panel";
import PanelToolbar from "webviz-core/src/components/PanelToolbar";
import ChartComponent from "webviz-core/src/components/ReactChartjs";
import tooltipStyles from "webviz-core/src/components/Tooltip.module.scss";
import { useDeepChangeDetector } from "webviz-core/src/util/hooks";
import { colors } from "webviz-core/src/util/sharedStyleConstants";

const SResetZoom = styled.div`
  position: absolute;
  bottom: 15px;
  right: 10px;
`;

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
  "lineTension",
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
  lineTension?: number,
  data: { x: number, y: number }[],
};

// NOTE: Keep this type (and its dependencies) in sync with the corresponding
// Node Playground types in 'userUtils'.
type PlotMessage = {
  lines: Line[],
  points: Line[],
  polygons: Line[],
  title?: string,
  yAxisLabel?: string,
  xAxisLabel?: string,
  gridColor?: string,
};

type MenuContentProps = {
  minXVal?: string,
  maxXVal?: string,
  minYVal?: string,
  maxYVal?: string,
  saveConfig: ($Shape<Config>) => void,
};
function MenuContent({ minXVal, maxXVal, minYVal, maxYVal, saveConfig }: MenuContentProps) {
  return (
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
  );
}

function TwoDimensionalPlot(props: Props) {
  const {
    config: { path, minXVal, maxXVal, minYVal, maxYVal },
    saveConfig,
  } = props;
  const [hasUserPannedOrZoomed, setHasUserPannedOrZoomed] = useState<boolean>(false);
  const tooltip = useRef<?HTMLDivElement>(null);
  const chartComponent = useRef<?ChartComponent>(null);

  const message: PlotMessage = (useLatestMessageDataItem(path.value)?.queriedData[0]?.value: any);
  const { title, yAxisLabel, xAxisLabel, gridColor, lines = [], points = [], polygons = [] } = message || {};
  const datasets = useMemo(
    () =>
      message
        ? [
            ...lines.map((line) => ({ ...pick(line, keysToPick), showLine: true, fill: false })),
            ...points.map((point) => pick(point, keysToPick)),
            ...polygons.map((polygon) => ({
              ...pick(polygon, keysToPick),
              data: polygon.data[0] ? polygon.data.concat([polygon.data[0]]) : polygon.data,
              fill: true,
              pointRadius: 0,
              showLine: true,
              lineTension: 0,
            })),
          ].sort((a, b) => (b.order || 0) - (a.order || 0))
        : [],
    [lines, message, points, polygons]
  );

  const { allXs, allYs } = useMemo(
    () => ({
      allXs: flatten(datasets.map((dataset) => (dataset.data ? dataset.data.map(({ x }) => x) : []))),
      allYs: flatten(datasets.map((dataset) => (dataset.data ? dataset.data.map(({ y }) => y) : []))),
    }),
    [datasets]
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

  const options = useMemo(
    () => ({
      title: { display: !!title, text: title },
      scales: {
        yAxes: [
          {
            gridLines: { color: gridColor },
            scaleLabel: { display: !!yAxisLabel, labelString: yAxisLabel },
            ticks: hasUserPannedOrZoomed
              ? {}
              : {
                  min: parseFloat(minYVal) ? parseFloat(minYVal) : getBufferedMinMax(allYs).min,
                  max: parseFloat(maxYVal) ? parseFloat(maxYVal) : getBufferedMinMax(allYs).max,
                },
          },
        ],
        xAxes: [
          {
            gridLines: { color: gridColor },
            scaleLabel: { display: !!xAxisLabel, labelString: xAxisLabel },
            ticks: hasUserPannedOrZoomed
              ? {}
              : {
                  min: parseFloat(minXVal) ? parseFloat(minXVal) : getBufferedMinMax(allXs).min,
                  max: parseFloat(maxXVal) ? parseFloat(maxXVal) : getBufferedMinMax(allXs).max,
                },
          },
        ],
      },
      color: colors.GRAY,
      animation: { duration: 0 },
      legend: { display: false },
      pan: { enabled: true },
      zoom: { enabled: true },
      plugins: {},
    }),
    [
      allXs,
      allYs,
      getBufferedMinMax,
      gridColor,
      hasUserPannedOrZoomed,
      maxXVal,
      maxYVal,
      minXVal,
      minYVal,
      title,
      xAxisLabel,
      yAxisLabel,
    ]
  );

  const menuContent = useMemo(
    () => (
      <MenuContent minXVal={minXVal} maxXVal={maxXVal} minYVal={minYVal} maxYVal={maxYVal} saveConfig={saveConfig} />
    ),
    [maxXVal, maxYVal, minXVal, minYVal, saveConfig]
  );

  const removeTooltip = useCallback(() => {
    if (tooltip.current) {
      ReactDOM.unmountComponentAtNode(tooltip.current);
    }
    if (tooltip.current && tooltip.current.parentNode) {
      // Satisfy flow.
      tooltip.current.parentNode.removeChild(tooltip.current);
      tooltip.current = null;
    }
  }, []);

  const onMouseMove = useCallback(
    async (event: MouseEvent) => {
      const currentChartComponent = chartComponent.current;
      if (!currentChartComponent || !currentChartComponent.canvas) {
        removeTooltip();
        return;
      }
      const { canvas } = currentChartComponent;
      const canvasRect = canvas.getBoundingClientRect();
      const isTargetingCanvas = event.target === canvas;
      if (
        event.pageX < canvasRect.left ||
        event.pageX > canvasRect.right ||
        event.pageY < canvasRect.top ||
        event.pageY > canvasRect.bottom ||
        !isTargetingCanvas
      ) {
        removeTooltip();
        return;
      }

      const tooltipElement = await currentChartComponent.getElementAtXAxis(event);
      if (!tooltipElement) {
        removeTooltip();
        return;
      }
      let tooltipDatapoint, tooltipLabel;
      for (const { data: dataPoints, label } of datasets) {
        const datapoint = dataPoints.find(
          (_datapoint) =>
            _datapoint.x === tooltipElement.data.x && String(_datapoint.y) === String(tooltipElement.data.y)
        );
        if (datapoint) {
          tooltipDatapoint = datapoint;
          tooltipLabel = label;
          break;
        }
      }
      if (!tooltipDatapoint) {
        removeTooltip();
        return;
      }

      if (!tooltip.current) {
        tooltip.current = document.createElement("div");
        if (canvas.parentNode) {
          canvas.parentNode.appendChild(tooltip.current);
        }
      }

      const currentTooltip = tooltip.current;
      if (currentTooltip) {
        let label = tooltipLabel ? `${tooltipLabel}: ` : "";
        label += `(${round(tooltipDatapoint.x, 5)}, ${round(tooltipDatapoint.y, 5)})`;
        ReactDOM.render(
          <div
            className={tooltipStyles.tooltip}
            style={{ position: "absolute", left: tooltipElement.view.x, top: tooltipElement.view.y }}>
            {label}
          </div>,
          currentTooltip
        );
      }
    },
    [datasets, removeTooltip]
  );

  const onResetZoom = useCallback(
    () => {
      if (chartComponent.current) {
        chartComponent.current.resetZoom();
        setHasUserPannedOrZoomed(false);
      }
    },
    [setHasUserPannedOrZoomed]
  );

  const onPanZoom = useCallback(
    () => {
      if (!hasUserPannedOrZoomed) {
        setHasUserPannedOrZoomed(true);
      }
    },
    [hasUserPannedOrZoomed]
  );

  if (useDeepChangeDetector([pick(props.config, ["minXVal", "maxXVal", "minYVal", "maxYVal"])], false)) {
    // Reset the view to the default when the default changes.
    if (hasUserPannedOrZoomed) {
      setHasUserPannedOrZoomed(false);
    }
  }

  // Always clean up tooltips when unmounting.
  useEffect(() => removeTooltip, [removeTooltip]);
  const emptyMessage = !points.length && !lines.length && !polygons.length;

  if (uniq(datasets.map(({ label }) => label)).length !== datasets.length) {
    throw new Error("2D Plot datasets do not have unique labels");
  }

  return (
    <SContainer>
      <PanelToolbar helpContent={helpContent} menuContent={menuContent}>
        <MessagePathInput
          path={path.value}
          onChange={(newValue) => saveConfig({ path: { value: newValue } })}
          inputStyle={{ height: "100%" }}
          validTypes={VALID_TYPES}
          placeholder="Select topic messages with 2D Plot data to visualize"
          autoSize
        />
      </PanelToolbar>
      {!message ? (
        <EmptyState>Waiting for next message</EmptyState>
      ) : emptyMessage ? (
        <EmptyState>No 2D Plot data (lines, points, polygons) to visualize</EmptyState>
      ) : (
        <SRoot onDoubleClick={onResetZoom}>
          <Dimensions>
            {({ width, height }) => (
              <>
                <ChartComponent
                  ref={chartComponent}
                  type="scatter"
                  width={width}
                  height={height}
                  key={`${width}x${height}`}
                  options={options}
                  onPanZoom={onPanZoom}
                  data={{ datasets }}
                />
                {hasUserPannedOrZoomed && (
                  <SResetZoom>
                    <Button tooltip="(shortcut: double-click)" onClick={onResetZoom}>
                      reset view
                    </Button>
                  </SResetZoom>
                )}
              </>
            )}
          </Dimensions>
          <DocumentEvents capture onMouseDown={onMouseMove} onMouseUp={onMouseMove} onMouseMove={onMouseMove} />
        </SRoot>
      )}
    </SContainer>
  );
}

TwoDimensionalPlot.panelType = "TwoDimensionalPlot";
TwoDimensionalPlot.defaultConfig = { path: { value: "" } };

export default hot(Panel<Config>(TwoDimensionalPlot));
