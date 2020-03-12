// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.
import { flatten, max, min, minBy } from "lodash";
import React, { memo, useEffect, useCallback, useState, useRef } from "react";
import ChartComponent from "react-chartjs-2";
import DocumentEvents from "react-document-events";
import ReactDOM from "react-dom";
import type { Time } from "rosbag";
import styled from "styled-components";

import NewTimeBasedChart from "./NewTimeBasedChart";
import TimeBasedChartTooltip from "./TimeBasedChartTooltip";
import Button from "webviz-core/src/components/Button";
import createSyncingComponent from "webviz-core/src/components/createSyncingComponent";
import { useExperimentalFeature } from "webviz-core/src/components/ExperimentalFeatures";
import type { MessageHistoryItem } from "webviz-core/src/components/MessageHistoryDEPRECATED";
import { type ScaleOptions } from "webviz-core/src/components/ReactChartjs";
import TimeBasedChartLegend from "webviz-core/src/components/TimeBasedChart/TimeBasedChartLegend";
import Tooltip from "webviz-core/src/components/Tooltip";
import Y_AXIS_ID from "webviz-core/src/panels/Plot/PlotChart";
import mixins from "webviz-core/src/styles/mixins.module.scss";

type Bounds = {| minX: ?number, maxX: ?number |};
const SyncTimeAxis = createSyncingComponent<Bounds, Bounds>("SyncTimeAxis", (dataItems: Bounds[]) => ({
  minX: min(dataItems.map(({ minX }) => (minX == null ? undefined : minX))),
  maxX: max(dataItems.map(({ maxX }) => (maxX == null ? undefined : maxX))),
}));

export type TimeBasedChartTooltipData = {|
  x: number,
  y: number | string,
  datasetKey?: string,
  datasetIndex?: number,
  item: MessageHistoryItem,
  path: string,
  value: number | boolean | string,
  constantName?: ?string,
  startTime: Time,
|};

export type DataPoint = {|
  x: number,
  y: number | string,
  tooltip?: TimeBasedChartTooltipData,
  label?: string,
  labelColor?: string,
|};

const SRoot = styled.div`
  position: relative;
`;

const SResetZoom = styled.div`
  position: absolute;
  bottom: 33px;
  right: 10px;
`;

const SBar = styled.div`
  position: absolute;
  top: 0;
  bottom: 0;
  width: 2px;
  margin-left: -1px;
  background: yellow;
  pointer-events: none;
  opacity: 0.7;
  display: none;
  // "display" and "left" are set by JS, but outside of React.
`;

const SLegend = styled.div`
  display: flex;
  width: 10%;
  min-width: 90px;
  overflow-y: auto;
  flex-direction: column;
  align-items: flex-start;
  justify-content: start;
  padding: 30px 0px 10px 0px;
`;

const MemoizedTooltips = memo<{}>(function Tooltips() {
  return (
    <React.Fragment>
      <Tooltip contents={<div>Hold v to only scroll vertically</div>} delay={0}>
        <div style={{ position: "absolute", left: 0, top: 0, width: 30, bottom: 0 }} />
      </Tooltip>
      <Tooltip placement="top" contents={<div>Hold h to only scroll horizontally</div>} delay={0}>
        <div style={{ position: "absolute", left: 0, right: 0, height: 30, bottom: 0 }} />
      </Tooltip>
    </React.Fragment>
  );
});

type Props = {|
  type: "scatter" | "multicolorLine",
  width: number,
  height: number,
  zoom: boolean,
  data: any,
  tooltips?: TimeBasedChartTooltipData[],
  xAxes?: any,
  yAxes: any,
  plugins?: any,
  annotations?: any[],
  // Unused but here for compatibility with the NewTimeBasedChart.
  drawLegend?: boolean,
  isSynced?: boolean,
  canToggleLines?: boolean,
  toggleLine?: (datasetId: string | typeof undefined, lineToHide: string) => void,
  linesToHide?: { [string]: boolean },
  datasetId?: string,
  onClick?: (SyntheticMouseEvent<HTMLCanvasElement>) => void,
  saveCurrentYs?: (minY: number, maxY: number) => void,
  xAxisVal?: "timestamp" | "index" | "custom",
  useFixedYAxisWidth?: boolean,
  scaleOptions?: ScaleOptions,
|};

type Chart = any;

// Create a chart with any y-axis but with an x-axis that shows time since the
// start of the bag, and which is kept in sync with other instances of this
// component. Uses chart.js internally, with a zoom/pan plugin, and with our
// standard tooltips.
const WrappedTimeBasedChart = memo<Props>(function TimeBasedChart(props: Props) {
  const chart = useRef<?ChartComponent>(null);
  const tooltip = useRef<?HTMLDivElement>(null);
  const bar = useRef<?HTMLDivElement>(null);
  const tooltipModel = useRef<?{ dataPoints?: any[] }>(null);
  const mousePosition = useRef<?{| x: number, y: number |}>(null);

  const [showResetZoom, setShowResetZoom] = useState(false);
  const [, forceUpdate] = useState();

  const onVisibilityChange = useCallback(
    () => {
      if (document.visibilityState === "visible") {
        // HACK: There is a Chrome bug that causes 2d canvas elements to get cleared when the page
        // becomes hidden on certain hardware:
        // https://bugs.chromium.org/p/chromium/issues/detail?id=588434
        // https://bugs.chromium.org/p/chromium/issues/detail?id=591374
        // We can hack around this by forcing a re-render when the page becomes visible again.
        // There may be other canvases that this affects, but these seemed like the most important.
        // Ideally we can find a global workaround but we're not sure there is one — can't just
        // twiddle the width/height attribute of the canvas as suggested in one of the comments on
        // a chrome bug; it seems like you really have to redraw the frame from scratch.
        forceUpdate();
      }
    },
    [forceUpdate]
  );
  useEffect(
    () => {
      document.addEventListener("visibilitychange", onVisibilityChange);
      return () => {
        document.removeEventListener("visibilitychange", onVisibilityChange);
      };
    },
    [onVisibilityChange]
  );

  const onPlotChartUpdate = useCallback(
    (axis: any) => {
      if (props.saveCurrentYs) {
        const scaleId = props.yAxes ? props.yAxes[0].id : Y_AXIS_ID;
        props.saveCurrentYs(axis.chart.scales[scaleId].min, axis.chart.scales[scaleId].max);
      }
    },
    [props]
  );

  const onPanZoomUpdate = (chartWrapper: { chart: Chart }) => {
    const chartInstance = chartWrapper.chart;
    const Y_scaleId = props.yAxes[0].id;
    const minY = chartInstance.scales[Y_scaleId].min;
    const maxY = chartInstance.scales[Y_scaleId].max;

    if (props.saveCurrentYs) {
      props.saveCurrentYs(minY, maxY);
    }
    if (!showResetZoom) {
      setShowResetZoom(true);
    }
  };

  const onResetZoom = useCallback(
    () => {
      if (chart.current) {
        chart.current.chartInstance.resetZoom();
        setShowResetZoom(false);
      }
    },
    [setShowResetZoom]
  );

  const onGetTick = (value: number, index: number, values: number[]): string => {
    if (index === 0 || index === values.length - 1) {
      // First and last labels sometimes get super long rounding errors when zooming.
      // This fixes that.
      return "";
    }
    return `${value}`;
  };

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
  // Always clean up tooltips when unmounting.
  useEffect(
    () => {
      return () => removeTooltip();
    },
    [removeTooltip]
  );

  // We use a custom tooltip so we can style it more nicely, and so that it can break
  // out of the bounds of the canvas, in case the panel is small.
  const updateTooltip = useCallback(
    () => {
      if (
        !mousePosition.current ||
        !tooltipModel.current ||
        !tooltipModel.current.dataPoints ||
        tooltipModel.current.dataPoints.length === 0
      ) {
        return removeTooltip();
      }

      const { y } = mousePosition.current;
      const tooltipItem = minBy(tooltipModel.current.dataPoints, (point) => Math.abs(point.y - y));

      if (
        !chart.current ||
        !chart.current.chartInstance.data.datasets[tooltipItem.datasetIndex] ||
        !chart.current.chartInstance.data.datasets[tooltipItem.datasetIndex].data[tooltipItem.index]
      ) {
        return removeTooltip();
      }
      const { chartInstance } = chart.current;

      if (!tooltip.current) {
        tooltip.current = document.createElement("div");
        chartInstance.canvas.parentNode.appendChild(tooltip.current);
      }
      if (tooltip.current) {
        ReactDOM.render(
          <TimeBasedChartTooltip
            tooltip={chartInstance.data.datasets[tooltipItem.datasetIndex].data[tooltipItem.index].tooltip}>
            <div style={{ position: "absolute", left: tooltipItem.x, top: tooltipItem.y }} />
          </TimeBasedChartTooltip>,
          tooltip.current
        );
      }
    },
    [removeTooltip]
  );

  const onMouseMove = useCallback(
    (event: MouseEvent) => {
      if (!chart.current) {
        mousePosition.current = null;
        updateTooltip();
        if (bar.current && bar.current.style) {
          bar.current.style.display = "none";
        }
        return;
      }
      const { chartInstance } = chart.current;
      const canvasRect = chartInstance.canvas.getBoundingClientRect();
      if (
        event.pageX < canvasRect.left ||
        event.pageX > canvasRect.right ||
        event.pageY < canvasRect.top ||
        event.pageY > canvasRect.bottom
      ) {
        mousePosition.current = null;
        updateTooltip();
        if (bar.current && bar.current.style) {
          bar.current.style.display = "none";
        }
        return;
      }
      mousePosition.current = {
        x: event.pageX - canvasRect.left,
        y: event.pageY - canvasRect.top,
      };
      if (bar.current && bar.current.style) {
        bar.current.style.display = "block";
        bar.current.style.left = `${mousePosition.current.x}px`;
      }
      updateTooltip();
    },
    [updateTooltip]
  );

  const getChartjsOptions = (minX: ?number, maxX: ?number) => {
    const { plugins, xAxes, yAxes, useFixedYAxisWidth, onClick } = props;
    const annotations = props.annotations || [];
    const defaultXTicksSettings = {
      fontFamily: mixins.monospaceFont,
      fontSize: 10,
      fontColor: "#eee",
      maxRotation: 0,
    };
    const defaultYTicksSettings = {
      fontFamily: mixins.monospaceFont,
      fontSize: 10,
      fontColor: "#eee",
      padding: 0,
    };
    const defaultXAxis = {
      ticks: defaultXTicksSettings,
      gridLines: { color: "rgba(255, 255, 255, 0.2)", zeroLineColor: "rgba(255, 255, 255, 0.2)" },
      afterUpdate: onPlotChartUpdate,
    };
    // We create a new `options` object every time, but caching this wouldn't help anyway, since
    // react-chartjs-2 creates a new object on every render anyway. :'(
    // See https://github.com/jerairrest/react-chartjs-2/blob/b4047724002bca37486f1b13e618d2bb57162430/src/index.js#L176
    const options = {
      maintainAspectRatio: false,
      animation: { duration: 0 },
      responsiveAnimationDuration: 0,
      legend: { display: false },
      // Disable splines, they seem to cause weird rendering artifacts:
      elements: { line: { tension: 0 } },
      hover: {
        intersect: false,
        mode: "x",
      },
      tooltips: {
        intersect: false,
        mode: "x",
        custom: (tooltipModelParam: { dataPoints?: any[] }) => {
          tooltipModel.current = tooltipModelParam;
          updateTooltip();
        },
        enabled: false, // Disable native tooltips since we use custom ones.
      },
      scales: {
        xAxes: xAxes
          ? xAxes.map((xAxis) => ({
              ...defaultXAxis,
              ...xAxis,
              ticks: {
                ...defaultXTicksSettings,
                ...xAxis.ticks,
                callback: (...args) => (xAxis.ticks.callback ? xAxis.ticks.callback(...args) : onGetTick(...args)),
              },
            }))
          : [defaultXAxis],
        yAxes: yAxes.map((yAxis) => {
          const ticks = {
            ...defaultYTicksSettings,
            ...yAxis.ticks,
            callback: (...args) => (yAxis.ticks.callback ? yAxis.ticks.callback(...args) : onGetTick(...args)),
          };
          // If the user is manually panning or zooming, don't constrain the y-axis
          if (showResetZoom) {
            delete ticks.min;
            delete ticks.max;
          }

          return {
            ...yAxis,
            afterUpdate: onPlotChartUpdate,
            afterFit: (scaleInstance) => {
              // Sets y-axis labels to a fixed width, so that vertically-aligned charts can be directly compared.
              // This width is large enough to easily see legend values up to 6 characters wide (ex: 100000 or -12.638).
              if (useFixedYAxisWidth) {
                scaleInstance.width = 48;
              }
            },
            ticks,
          };
        }),
      },
      onClick,
      pan: {
        enabled: true,
        onPan: onPanZoomUpdate,
      },
      zoom: {
        enabled: props.zoom,
        onZoom: onPanZoomUpdate,
      },
      plugins: plugins || {},
      annotation: { annotations },
    };
    if (!showResetZoom) {
      // $FlowFixMe
      options.scales.xAxes[0].ticks.min = minX;
      // $FlowFixMe
      options.scales.xAxes[0].ticks.max = maxX;
    }
    return options;
  };

  const {
    datasetId,
    type,
    width,
    height,
    drawLegend,
    canToggleLines,
    toggleLine,
    data,
    isSynced,
    linesToHide = {},
  } = props;
  const xAxisVal = props.xAxisVal || "timestamp";
  const xVals = flatten(data.datasets.map(({ data: pts }) => (pts.length > 1 ? pts.map(({ x }) => x) : undefined)));
  const [minX, maxX] = [min(xVals), max(xVals)];

  const chartProps = {
    type,
    width,
    height,
    key: `${width}x${height}`, // https://github.com/jerairrest/react-chartjs-2/issues/60#issuecomment-406376731
    ref: chart,
    data: { ...data, datasets: data.datasets.filter((dataset) => !linesToHide[dataset.label]) },
  };

  return (
    <div style={{ display: "flex", width: "100%" }}>
      <div style={{ display: "flex", width }}>
        <SRoot onDoubleClick={onResetZoom}>
          <SBar ref={bar} />

          {isSynced && xAxisVal === "timestamp" ? (
            <SyncTimeAxis data={{ minX, maxX }}>
              {(syncedMinMax) => {
                const syncedMinX = syncedMinMax.minX != null ? min([minX, syncedMinMax.minX]) : minX;
                const syncedMaxX = syncedMinMax.maxX != null ? max([maxX, syncedMinMax.maxX]) : maxX;
                return <ChartComponent {...chartProps} options={getChartjsOptions(syncedMinX, syncedMaxX)} />;
              }}
            </SyncTimeAxis>
          ) : (
            <ChartComponent {...chartProps} options={getChartjsOptions(minX, maxX)} />
          )}

          {showResetZoom && (
            <SResetZoom>
              <Button tooltip="(shortcut: double-click)" onClick={onResetZoom}>
                reset view
              </Button>
            </SResetZoom>
          )}

          {/* Chart.js seems to not handle tooltips while dragging super well, and this fixes that. */}
          <DocumentEvents capture onMouseDown={onMouseMove} onMouseUp={onMouseMove} onMouseMove={onMouseMove} />
        </SRoot>
      </div>
      {props.zoom && <MemoizedTooltips />}
      {drawLegend && (
        <SLegend>
          <TimeBasedChartLegend
            datasetId={datasetId}
            canToggleLines={canToggleLines}
            datasets={data.datasets}
            linesToHide={linesToHide}
            toggleLine={toggleLine || (() => {})}
          />
        </SLegend>
      )}
    </div>
  );
});

export const OldTimeBasedChart = WrappedTimeBasedChart;

// Add a wrapper that allows switching between TimeBasedChart implementations.
export default function TimeBasedChartWrapper(props: Props) {
  const shouldUseWebWorkerPlots = useExperimentalFeature("plotWebWorker");
  if (shouldUseWebWorkerPlots) {
    return <NewTimeBasedChart {...props} />;
  }
  return <WrappedTimeBasedChart {...props} />;
}
