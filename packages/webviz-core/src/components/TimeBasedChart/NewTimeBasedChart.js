// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.
import { max, min, flatten } from "lodash";
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
import { useMessagePipeline } from "webviz-core/src/components/MessagePipeline";
import ChartComponent, { type HoveredElement, type ScaleOptions } from "webviz-core/src/components/ReactChartjs";
import TimeBasedChartLegend from "webviz-core/src/components/TimeBasedChart/TimeBasedChartLegend";
import Tooltip from "webviz-core/src/components/Tooltip";
import mixins from "webviz-core/src/styles/mixins.module.scss";

// This is the new version of the TimeBasedChart, designed to work with our own fork of react-chartjs-2 that supports
// web workers.

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
  annotations?: any[],
  drawLegend?: boolean,
  isSynced?: boolean,
  canToggleLines?: boolean,
  toggleLine?: (datasetId: string | typeof undefined, lineToHide: string) => void,
  linesToHide?: { [string]: boolean },
  datasetId?: string,
  onClick?: (SyntheticMouseEvent<HTMLCanvasElement>, datalabel: ?any) => void,
  saveCurrentYs?: (minY: number, maxY: number) => void,
  xAxisVal?: "timestamp" | "index" | "custom",
  // TODO: remove this prop when replacing the old TimeBasedChart with this one.
  useFixedYAxisWidth?: boolean,
  plugins?: any,
  scaleOptions?: ?ScaleOptions,
|};

// Create a chart with any y-axis but with an x-axis that shows time since the
// start of the bag, and which is kept in sync with other instances of this
// component. Uses chart.js internally, with a zoom/pan plugin, and with our
// standard tooltips.
export default memo<Props>(function TimeBasedChart(props: Props) {
  const chartComponent = useRef<?ChartComponent>(null);
  const tooltip = useRef<?HTMLDivElement>(null);
  const hasUnmounted = useRef<boolean>(false);
  const bar = useRef<?HTMLDivElement>(null);

  const [hasUserPanOrZoomed, setHasUserPannedOrZoomed] = useState(false);
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

  const pauseFrame = useMessagePipeline(useCallback((messagePipeline) => messagePipeline.pauseFrame, []));

  const onChartUpdate = useCallback(
    () => {
      const resumeFrame = pauseFrame("TimeBasedChart");
      return () => {
        resumeFrame();
      };
    },
    [pauseFrame]
  );

  const { saveCurrentYs, yAxes } = props;
  const yAxisScaleId = yAxes[0]?.id;
  const onScaleBoundsUpdate = useCallback(
    (scales) => {
      const firstYScale = scales.find(({ id }) => id === yAxisScaleId);
      if (firstYScale && saveCurrentYs && typeof firstYScale.min === "number" && typeof firstYScale.max === "number") {
        saveCurrentYs(firstYScale.min, firstYScale.max);
      }
    },
    [yAxisScaleId, saveCurrentYs]
  );

  const onPanZoom = useCallback(
    () => {
      if (!hasUserPanOrZoomed) {
        setHasUserPannedOrZoomed(true);
      }
    },
    [hasUserPanOrZoomed, setHasUserPannedOrZoomed]
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
      return () => {
        hasUnmounted.current = true;
        removeTooltip();
      };
    },
    [removeTooltip]
  );

  const tooltips = props.tooltips || [];
  // We use a custom tooltip so we can style it more nicely, and so that it can break
  // out of the bounds of the canvas, in case the panel is small.
  const updateTooltip = useCallback(
    (currentChartComponent: ChartComponent, canvas: HTMLCanvasElement, tooltipItem: ?HoveredElement) => {
      // This is an async callback, so it can fire after this component is unmounted. Make sure that we remove the
      // tooltip if this fires after unmount.
      if (!tooltipItem || hasUnmounted.current) {
        return removeTooltip();
      }

      // We have to iterate through all of the tooltips every time the user hovers over a point. However, the cost of
      // running this search is small (< 10ms even with many tooltips) compared to the cost of indexing tooltips by
      // coordinates and we care more about render time than tooltip responsiveness.
      const tooltipData = tooltips.find(
        (_tooltip) => _tooltip.x === tooltipItem.data.x && String(_tooltip.y) === String(tooltipItem.data.y)
      );
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
    [removeTooltip, tooltips]
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

      const isTargetingCanvas = event.target === canvas;
      if (!isTargetingCanvas) {
        removeTooltip();
        return;
      }

      if (tooltips && tooltips.length) {
        const tooltipElement = await currentChartComponent.getElementAtXAxis(event);
        updateTooltip(currentChartComponent, canvas, tooltipElement);
      } else {
        removeTooltip();
      }
    },
    [updateTooltip, removeTooltip, tooltips]
  );

  const getChartjsOptions = (minX: ?number, maxX: ?number) => {
    const { xAxes } = props;
    const plugins = props.plugins || {};
    const annotations = props.annotations || [];
    if (plugins.datalabels) {
      delete plugins.datalabels.formatter;
      if (typeof plugins.datalabels.color === "function") {
        delete plugins.datalabels.color;
      }
      delete plugins.datalabels.listeners;
    }

    // We create these objects every time so that they can be modified.
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
          ? xAxes.map((xAxis) => {
              const axis = {
                ...defaultXAxis,
                ...xAxis,
                ticks: {
                  ...defaultXTicksSettings,
                  ...xAxis.ticks,
                },
              };
              delete axis.ticks.callback;
              return axis;
            })
          : [defaultXAxis],
        yAxes: yAxes.map((yAxis) => {
          const ticks = {
            ...defaultYTicksSettings,
            ...yAxis.ticks,
          };
          delete ticks.callback;
          // If the user is manually panning or zooming, don't constrain the y-axis
          if (hasUserPanOrZoomed) {
            delete ticks.min;
            delete ticks.max;
          }

          return {
            ...yAxis,
            ticks,
          };
        }),
      },
      plugins,
      annotation: { annotations },
    };
    if (!hasUserPanOrZoomed) {
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
    onClick,
    linesToHide = {},
    scaleOptions,
  } = props;
  const xAxisVal = props.xAxisVal || "timestamp";
  const xVals = flatten(data.datasets.map(({ data: pts }) => (pts.length > 1 ? pts.map(({ x }) => x) : undefined)));
  const [minX, maxX] = [min(xVals), max(xVals)];

  const chartProps = {
    type,
    width,
    height,
    key: `${width}x${height}`,
    ref: chartComponent,
    data: { ...data, datasets: data.datasets.filter((dataset) => !linesToHide[dataset.label]) },
    onScaleBoundsUpdate,
    onPanZoom,
    onClick,
    zoomOptions: {
      ...ChartComponent.defaultProps.zoomOptions,
      enabled: props.zoom,
      mode: zoomMode,
    },
    scaleOptions,
    onChartUpdate,
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

          {hasUserPanOrZoomed && (
            <SResetZoom>
              <Button tooltip="(shortcut: double-click)" onClick={onResetZoom}>
                reset view
              </Button>
            </SResetZoom>
          )}

          {/* Handle tooltips while dragging by checking all document events. */}
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
