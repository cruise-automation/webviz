// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.
import { last, max, min } from "lodash";
import React, { memo, useEffect, useCallback, useState, useRef } from "react";
import DocumentEvents from "react-document-events";
import ReactDOM from "react-dom";
import KeyListener from "react-key-listener";
import type { Time } from "rosbag";
import styled from "styled-components";

import TimeBasedChartTooltip from "./TimeBasedChartTooltip";
import Button from "webviz-core/src/components/Button";
import createSyncingComponent from "webviz-core/src/components/createSyncingComponent";
import type { MessageHistoryItem } from "webviz-core/src/components/MessageHistoryDEPRECATED";
import ChartComponent, { type HoveredElement } from "webviz-core/src/components/ReactChartjs/ChartComponent";
import TimeBasedChartLegend from "webviz-core/src/components/TimeBasedChart/TimeBasedChartLegend";
import Tooltip from "webviz-core/src/components/Tooltip";
import mixins from "webviz-core/src/styles/mixins.module.scss";
import { useChangeDetector, usePreviousValue } from "webviz-core/src/util/hooks";

// This is the new version of the TimeBasedChart, designed to work with our own fork of react-chartjs-2 that supports
// web workers.
// DO NOT USE IN PRODUCTION YET. There are still missing features such as support for annotations.

type Bounds = {| minX: ?number, maxX: ?number |};
const SyncTimeAxis = createSyncingComponent<Bounds, Bounds>("SyncTimeAxis", (dataItems: Bounds[]) => ({
  minX: min(dataItems.map(({ minX }) => (minX == null ? undefined : minX))),
  maxX: max(dataItems.map(({ maxX }) => (maxX == null ? undefined : maxX))),
}));

export type TimeBasedChartTooltipData = {|
  x?: number,
  y?: number,
  item: MessageHistoryItem,
  path: string,
  value: number | boolean | string,
  constantName: ?string,
  startTime: Time,
|};

export type TooltipDataByYByX = { [string]: { [string]: TimeBasedChartTooltipData } };

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
  tooltipDataByYByX?: TooltipDataByYByX,
  xAxes?: any,
  yAxes: any,
  annotations?: any[],
  drawLegend?: boolean,
  isSynced?: boolean,
  canToggleLines?: boolean,
  toggleLine?: (datasetId: string | typeof undefined, lineToHide: string) => void,
  linesToHide?: { [string]: boolean },
  datasetId?: string,
  onClick?: (MouseEvent) => void,
  saveCurrentYs?: (minY: number, maxY: number) => void,
  xAxisVal?: "timestamp" | "index",
  useFixedYAxisWidth?: boolean,
  // for backwards compatibility, TODO remove when replacing TimeBasedChart with this one
  plugins?: any,
|};

// Create a chart with any y-axis but with an x-axis that shows time since the
// start of the bag, and which is kept in sync with other instances of this
// component. Uses chart.js internally, with a zoom/pan plugin, and with our
// standard tooltips.
export default memo<Props>(function TimeBasedChart(props: Props) {
  const chartComponent = useRef<?ChartComponent>(null);
  const tooltip = useRef<?HTMLDivElement>(null);
  const bar = useRef<?HTMLDivElement>(null);

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

  const xAxisVal = props.xAxisVal || "timestamp";
  const xAxisValHasChanged = useChangeDetector([xAxisVal], false);
  const annotations = props.annotations || [];
  const previousAnnotations = usePreviousValue(annotations);
  const previousFutureTime = previousAnnotations && previousAnnotations.length && previousAnnotations[0].value;
  const currentFutureTime = annotations && annotations.length && annotations[0].value;
  const shouldRedraw = previousFutureTime !== currentFutureTime || xAxisValHasChanged;

  const { saveCurrentYs, yAxes } = props;
  const onScaleBoundsUpdate = useCallback(
    (scales) => {
      const Y_scaleId = yAxes[0].id;
      const firstYScale = scales.find(({ id }) => id === Y_scaleId);
      if (firstYScale && saveCurrentYs && typeof firstYScale.min === "number" && typeof firstYScale.max === "number") {
        saveCurrentYs(firstYScale.min, firstYScale.max);
      }
    },
    [yAxes, saveCurrentYs]
  );

  const onPanZoom = useCallback(
    () => {
      if (!showResetZoom) {
        setShowResetZoom(true);
      }
    },
    [showResetZoom, setShowResetZoom]
  );

  const onResetZoom = useCallback(
    () => {
      if (chartComponent.current) {
        chartComponent.current.resetZoom();
        setShowResetZoom(false);
      }
    },
    [setShowResetZoom]
  );

  const [hasVerticalExclusiveZoom, setHasVerticalExclusiveZoom] = useState<boolean>(false);
  const [hasHorizontalExclusiveZoom, setHasHorizontalExclusiveZoom] = useState<boolean>(false);
  let zoomMode = "xy";
  if (hasVerticalExclusiveZoom && hasHorizontalExclusiveZoom) {
    zoomMode = "xy";
  } else if (hasVerticalExclusiveZoom) {
    zoomMode = "y";
  } else if (hasHorizontalExclusiveZoom) {
    zoomMode = "x";
  }
  const keyDownHandlers = React.useMemo(
    () => ({
      v: () => setHasVerticalExclusiveZoom(true),
      h: () => setHasHorizontalExclusiveZoom(true),
    }),
    [setHasVerticalExclusiveZoom, setHasHorizontalExclusiveZoom]
  );
  const keyUphandlers = React.useMemo(
    () => ({
      v: () => setHasVerticalExclusiveZoom(false),
      h: () => setHasHorizontalExclusiveZoom(false),
    }),
    [setHasVerticalExclusiveZoom, setHasHorizontalExclusiveZoom]
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

  const { tooltipDataByYByX } = props;
  // We use a custom tooltip so we can style it more nicely, and so that it can break
  // out of the bounds of the canvas, in case the panel is small.
  const updateTooltip = useCallback(
    (currentChartComponent: ChartComponent, canvas: HTMLCanvasElement, tooltipElements: HoveredElement[]) => {
      if (tooltipElements.length === 0) {
        return removeTooltip();
      }

      const tooltipItem = tooltipElements[0];
      const tooltipData = tooltipDataByYByX?.[tooltipItem.data.x]?.[tooltipItem.data.y];
      if (!tooltipData) {
        return removeTooltip();
      }

      if (!tooltip.current) {
        tooltip.current = document.createElement("div");
        if (canvas.parentNode) {
          canvas.parentNode.appendChild(tooltip.current);
        }
      }

      if (tooltip.current) {
        ReactDOM.render(
          <TimeBasedChartTooltip tooltip={tooltipData}>
            <div style={{ position: "absolute", left: tooltipItem.view.x, top: tooltipItem.view.y }} />
          </TimeBasedChartTooltip>,
          tooltip.current
        );
      }
    },
    [removeTooltip, tooltipDataByYByX]
  );

  const onMouseMove = useCallback(
    async (event: MouseEvent) => {
      const currentChartComponent = chartComponent.current;
      if (!currentChartComponent || !currentChartComponent.canvas) {
        removeTooltip();
        if (bar.current && bar.current.style) {
          bar.current.style.display = "none";
        }
        return;
      }
      const { canvas } = currentChartComponent;
      const canvasRect = canvas.getBoundingClientRect();
      if (
        event.pageX < canvasRect.left ||
        event.pageX > canvasRect.right ||
        event.pageY < canvasRect.top ||
        event.pageY > canvasRect.bottom
      ) {
        removeTooltip();
        if (bar.current && bar.current.style) {
          bar.current.style.display = "none";
        }
        return;
      }

      const xMousePosition = event.pageX - canvasRect.left;
      if (bar.current && bar.current.style) {
        bar.current.style.display = "block";
        bar.current.style.left = `${xMousePosition}px`;
      }

      if (tooltipDataByYByX) {
        const tooltipElements = await currentChartComponent.getElementAtEvent(event);
        updateTooltip(currentChartComponent, canvas, tooltipElements);
      } else {
        removeTooltip();
      }
    },
    [updateTooltip, removeTooltip, tooltipDataByYByX]
  );

  const getChartjsOptions = (minX: ?number, maxX: ?number) => {
    const { xAxes, useFixedYAxisWidth, onClick } = props;
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
      plugins: {},
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
  const minX = min(data.datasets.map((dataset) => (dataset.data.length > 1 ? dataset.data[0].x : undefined)));
  const maxX = max(data.datasets.map((dataset) => (dataset.data.length > 1 ? last(dataset.data).x : undefined)));

  // TODO Remove this once we can remove tooltips from datapoints when we replace the old TimeBasedChart with this one.
  const datasetsWithoutTooltips = data.datasets.map((dataset) => ({
    ...dataset,
    data: dataset.data.map((dataPoint) => ({ x: dataPoint.x, y: dataPoint.y })),
  }));
  const chartProps = {
    redraw: shouldRedraw,
    type,
    width,
    height,
    key: `${width}x${height}`, // https://github.com/jerairrest/react-chartjs-2/issues/60#issuecomment-406376731
    ref: chartComponent,
    data: { ...data, datasets: datasetsWithoutTooltips.filter((dataset) => !linesToHide[dataset.label]) },
    onScaleBoundsUpdate,
    onPanZoom,
    zoomOptions: {
      ...ChartComponent.defaultProps.zoomOptions,
      enabled: props.zoom,
      mode: zoomMode,
    },
  };

  return (
    <div style={{ display: "flex", width: "100%" }}>
      <div style={{ display: "flex", width }}>
        <SRoot onDoubleClick={onResetZoom}>
          <SBar ref={bar} />

          {isSynced && xAxisVal === "timestamp" ? (
            <SyncTimeAxis data={{ minX, maxX }}>
              {(syncedMinMax) => {
                const syncedMinX = syncedMinMax.minX != null ? Math.min(minX, syncedMinMax.minX) : minX;
                const syncedMaxX = syncedMinMax.maxX != null ? Math.max(maxX, syncedMinMax.maxX) : maxX;
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
          <KeyListener global keyDownHandlers={keyDownHandlers} keyUpHandlers={keyUphandlers} />
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
