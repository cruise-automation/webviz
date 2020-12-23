// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.
import { max, min, flatten, sortedUniqBy, uniqBy } from "lodash";
import React, { memo, useEffect, useCallback, useState, useRef } from "react";
import DocumentEvents from "react-document-events";
import ReactDOM from "react-dom";
import { useDispatch } from "react-redux";
import type { Time } from "rosbag";
import styled from "styled-components";
import uuid from "uuid";

import HoverBar from "./HoverBar";
import TimeBasedChartTooltip from "./TimeBasedChartTooltip";
import { clearHoverValue, setHoverValue } from "webviz-core/src/actions/hoverValue";
import Button from "webviz-core/src/components/Button";
import createSyncingComponent from "webviz-core/src/components/createSyncingComponent";
import KeyListener from "webviz-core/src/components/KeyListener";
import type { MessageHistoryItem } from "webviz-core/src/components/MessageHistoryDEPRECATED";
import type { MessagePathDataItem } from "webviz-core/src/components/MessagePathSyntax/useCachedGetMessagePathDataItems";
import { useMessagePipeline } from "webviz-core/src/components/MessagePipeline";
import ChartComponent, { type HoveredElement, type ScaleOptions } from "webviz-core/src/components/ReactChartjs";
import { getChartValue, inBounds, type ScaleBounds } from "webviz-core/src/components/ReactChartjs/zoomAndPanHelpers";
import TimeBasedChartLegend from "webviz-core/src/components/TimeBasedChart/TimeBasedChartLegend";
import Tooltip from "webviz-core/src/components/Tooltip";
import mixins from "webviz-core/src/styles/mixins.module.scss";
import { isBobject } from "webviz-core/src/util/binaryObjects";
import { useDeepChangeDetector } from "webviz-core/src/util/hooks";
import { defaultGetHeaderStamp } from "webviz-core/src/util/synchronizeMessages";
import { maybeGetBobjectHeaderStamp } from "webviz-core/src/util/time";

type Bounds = {| minX: ?number, maxX: ?number |};
const SyncTimeAxis = createSyncingComponent<Bounds, Bounds>("SyncTimeAxis", (dataItems: Bounds[]) => ({
  minX: min(dataItems.map(({ minX }) => (minX == null ? undefined : minX))),
  maxX: max(dataItems.map(({ maxX }) => (maxX == null ? undefined : maxX))),
}));

export type TooltipItem = {|
  queriedData: MessagePathDataItem[],
  receiveTime: Time,
  headerStamp: ?Time,
|};

export const getTooltipItemForMessageHistoryItem = (item: MessageHistoryItem): TooltipItem => {
  const { message } = item.message;
  const headerStamp = isBobject(message) ? maybeGetBobjectHeaderStamp(message) : defaultGetHeaderStamp(message);
  return { queriedData: item.queriedData, receiveTime: item.message.receiveTime, headerStamp };
};

export type TimeBasedChartTooltipData = {|
  x: number,
  y: number | string,
  datasetKey?: string,
  item: TooltipItem,
  path: string,
  value: number | boolean | string,
  constantName?: ?string,
  startTime: Time,
  source?: ?number,
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

const SBar = styled.div.attrs(({ xAxisIsPlaybackTime }) => ({
  style: {
    background: xAxisIsPlaybackTime ? "#F7BE00 padding-box" : "#248EFF padding-box",
    // Non-timestamp plot hover bars have no triangles (indicating click-to-seek) at top/bottom.
    borderWidth: xAxisIsPlaybackTime ? "4px" : "0px 4px",
  },
}))`
  position: absolute;
  top: 0;
  bottom: 0;
  width: 9px;
  margin-left: -4px;
  display: block;
  border-style: solid;
  border-color: #f7be00 transparent;
`;

// Sometimes a click gets fired at the end of a pan. Probably subtle touchpad stuff. Ignore "clicks"
// that happen too soon after a pan.
const PAN_CLICK_SUPPRESS_THRESHOLD_MS = 100;
// Drag-pans and playback following sometimes fight. We suppress automatic following moves during
// drag pans to avoid it.
const FOLLOW_PLAYBACK_PAN_THRESHOLD_MS = 100;

const MemoizedTooltips = memo<{}>(function Tooltips() {
  return (
    <React.Fragment>
      <Tooltip contents={<div>Hold v to zoom vertically, or b to zoom both axes</div>} delay={0}>
        <div style={{ position: "absolute", left: 0, top: 0, width: 30, bottom: 0 }} />
      </Tooltip>
    </React.Fragment>
  );
});

const STEP_SIZES = [0.01, 0.02, 0.05, 0.1, 0.2, 0.5, 1, 2, 5, 10, 15, 30, 60];
const stepSize = ({ min: minValue, max: maxValue, minAlongAxis, maxAlongAxis }) => {
  // Pick the smallest step size that gives lines greater than 50px apart
  const secondsPer50Pixels = 50 * ((maxValue - minValue) / (maxAlongAxis - minAlongAxis));
  return STEP_SIZES.find((step) => step > secondsPer50Pixels) || 60;
};

type FollowPlaybackState = $ReadOnly<{|
  xOffsetMin: number, // -1 means the left edge of the plot is one second before the current time.
  xOffsetMax: number, // 1 means the right edge of the plot is one second after the current time.
|}>;

type Point = $ReadOnly<{ x: number, y: number | string }>;

type DataSet = $ReadOnly<{
  data: $ReadOnlyArray<Point>,
  label: string,
  borderDash?: $ReadOnlyArray<number>,
  color?: string,
  showLine?: boolean,
}>;

const scalePerPixel = (bounds: ?ScaleBounds): ?number =>
  bounds && Math.abs(bounds.max - bounds.min) / Math.abs(bounds.maxAlongAxis - bounds.minAlongAxis);
const screenCoord = (value, valuePerPixel) => (valuePerPixel == null ? value : Math.trunc(value / valuePerPixel));
const datumStringPixel = ({ x, y }: Point, xScale: ?number, yScale: ?number): string =>
  `${screenCoord(x, xScale)},${typeof y === "string" ? y : screenCoord(y, yScale)}`;

// Exported for tests
export const filterDatasets = (
  datasets: $ReadOnlyArray<DataSet>,
  linesToHide: { [string]: boolean },
  xScalePerPixel: ?number,
  yScalePerPixel: ?number
): DataSet[] =>
  datasets
    // Only draw enabled lines. Needed for correctness.
    .filter(({ label }) => !linesToHide[label])
    // Remove redundant points to make drawing the chart more efficient.
    .map((dataset) => {
      const data = dataset.showLine
        ? // For line charts, just remove adjacent points on top of each other so we can draw self-
          // intersecting (loopy) lines.
          sortedUniqBy(dataset.data.slice(), (datum) => datumStringPixel(datum, xScalePerPixel, yScalePerPixel))
        : // For scatter charts there's no point in drawing any overlapping points.
          uniqBy(dataset.data.slice(), (datum) => datumStringPixel(datum, xScalePerPixel, yScalePerPixel));
      return { ...dataset, data };
    });

// Calculation mode for the "reset view" view.
export type ChartDefaultView =
  | void // Zoom to fit
  | {| type: "fixed", minXValue: number, maxXValue: number |}
  | {| type: "following", width: number |};

type Props = {|
  type: "scatter" | "multicolorLine",
  width: number,
  height: number,
  zoom: boolean,
  data: {| datasets: $ReadOnlyArray<DataSet>, yLabels?: $ReadOnlyArray<string>, minIsZero?: boolean |},
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
  onClick?: ?(SyntheticMouseEvent<HTMLCanvasElement>, datalabel: ?any, values: { [axis: string]: number }) => void,
  saveCurrentView?: (minY: number, maxY: number, width: ?number) => void,
  // If the x axis represents playback time ("timestamp"), the hover cursor will be synced.
  // Note, this setting should not be used for other time values.
  xAxisIsPlaybackTime: boolean,
  plugins?: any,
  scaleOptions?: ?ScaleOptions,
  currentTime?: ?number,
  defaultView?: ChartDefaultView,
|};

// Create a chart with any y-axis but with an x-axis that shows time since the
// start of the bag, and which is kept in sync with other instances of this
// component. Uses chart.js internally, with a zoom/pan plugin, and with our
// standard tooltips.
export default memo<Props>(function TimeBasedChart(props: Props) {
  const chartComponent = useRef<?ChartComponent>(null);
  const tooltip = useRef<?HTMLDivElement>(null);
  const hasUnmounted = useRef<boolean>(false);

  const [hasUserPannedOrZoomed, setHasUserPannedOrZoomed] = useState<boolean>(false);
  const [followPlaybackState, setFollowPlaybackState] = useState<?FollowPlaybackState>(null);
  const [, forceUpdate] = useState();

  const onVisibilityChange = useCallback(() => {
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
  }, [forceUpdate]);
  useEffect(() => {
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [onVisibilityChange]);

  const pauseFrame = useMessagePipeline(useCallback((messagePipeline) => messagePipeline.pauseFrame, []));

  const onChartUpdate = useCallback(() => {
    const resumeFrame = pauseFrame("TimeBasedChart");
    return () => {
      resumeFrame();
    };
  }, [pauseFrame]);

  const { saveCurrentView, yAxes } = props;
  const scaleBounds = useRef<?$ReadOnlyArray<ScaleBounds>>();
  const hoverBar = useRef<?HTMLElement>();
  const onScaleBoundsUpdate = useCallback((scales) => {
    scaleBounds.current = scales;
    const firstYScale = scales.find(({ axes }) => axes === "yAxes");
    const firstXScale = scales.find(({ axes }) => axes === "xAxes");
    const width = firstXScale && firstXScale.max - firstXScale.min;
    if (firstYScale && saveCurrentView && typeof firstYScale.min === "number" && typeof firstYScale.max === "number") {
      saveCurrentView(firstYScale.min, firstYScale.max, width);
    }
    if (firstYScale != null && hoverBar.current != null) {
      const { current } = hoverBar;
      const topPx = Math.min(firstYScale.minAlongAxis, firstYScale.maxAlongAxis);
      const bottomPx = Math.max(firstYScale.minAlongAxis, firstYScale.maxAlongAxis);
      current.style.top = `${topPx}px`;
      current.style.height = `${bottomPx - topPx}px`;
    }
  }, [saveCurrentView, scaleBounds]);

  const { onClick } = props;
  const lastPanTime = useRef<?Date>();

  const onClickAddingValues = useCallback((ev: SyntheticMouseEvent<HTMLCanvasElement>, datalabel: ?any) => {
    if (!onClick) {
      return;
    }
    if (lastPanTime.current && new Date() - lastPanTime.current < PAN_CLICK_SUPPRESS_THRESHOLD_MS) {
      // Ignore clicks that happen too soon after a pan. Sometimes clicks get fired at the end of
      // drags on touchpads.
      return;
    }
    const values = {};
    (scaleBounds.current || []).forEach((bounds) => {
      const chartPx =
        bounds.axes === "xAxes"
          ? // $FlowFixMe: getBoundingClientRect, ClientRect.x
            ev.clientX - ev.target.getBoundingClientRect().x
          : // $FlowFixMe: getBoundingClientRect, ClientRect.y
            ev.clientY - ev.target.getBoundingClientRect().y;
      const value = getChartValue(bounds, chartPx);
      if (value == null) {
        return;
      }
      values[bounds.id] = value;
    });
    return onClick(ev, datalabel, values);
  }, [onClick, scaleBounds, lastPanTime]);

  // Keep a ref to props.currentTime so onPanZoom can have stable identity
  const currentTimeRef = useRef<?number>();
  currentTimeRef.current = props.currentTime;
  const onPanZoom = useCallback((newScaleBounds: ScaleBounds[]) => {
    if (!hasUserPannedOrZoomed) {
      setHasUserPannedOrZoomed(true);
    }
    // Preloaded plots follow playback at a fixed zoom and x-offset unless the user is in the
    // initial "zoom to fit" state. Subsequent zooms/pans adjust the offsets.
    const bounds = newScaleBounds.find(({ axes }) => axes === "xAxes");
    if (bounds != null && bounds.min != null && bounds.max != null && currentTimeRef.current != null) {
      const currentTime = currentTimeRef.current;
      setFollowPlaybackState({ xOffsetMin: bounds.min - currentTime, xOffsetMax: bounds.max - currentTime });
    }
    lastPanTime.current = new Date();
  }, [hasUserPannedOrZoomed]);

  const onResetZoom = useCallback(() => {
    if (chartComponent.current) {
      chartComponent.current.resetZoom();
      setHasUserPannedOrZoomed(false);
    }
    setFollowPlaybackState(null);
  }, [setHasUserPannedOrZoomed, setFollowPlaybackState]);

  if (useDeepChangeDetector([props.defaultView], false)) {
    // Reset the view to the default when the default changes.
    if (hasUserPannedOrZoomed) {
      setHasUserPannedOrZoomed(false);
    }
    if (followPlaybackState != null) {
      setFollowPlaybackState(null);
    }
  }

  const [hasVerticalExclusiveZoom, setHasVerticalExclusiveZoom] = useState<boolean>(false);
  const [hasBothAxesZoom, setHasBothAxesZoom] = useState<boolean>(false);
  let zoomMode = "x";
  if (hasVerticalExclusiveZoom) {
    zoomMode = "y";
  } else if (hasBothAxesZoom) {
    zoomMode = "xy";
  }
  const keyDownHandlers = React.useMemo(
    () => ({
      v: () => setHasVerticalExclusiveZoom(true),
      b: () => setHasBothAxesZoom(true),
    }),
    [setHasVerticalExclusiveZoom, setHasBothAxesZoom]
  );
  const keyUphandlers = React.useMemo(
    () => ({
      v: () => setHasVerticalExclusiveZoom(false),
      b: () => setHasBothAxesZoom(false),
    }),
    [setHasVerticalExclusiveZoom, setHasBothAxesZoom]
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
  useEffect(() => {
    return () => {
      hasUnmounted.current = true;
      removeTooltip();
    };
  }, [removeTooltip]);

  const tooltips = props.tooltips || [];
  // We use a custom tooltip so we can style it more nicely, and so that it can break
  // out of the bounds of the canvas, in case the panel is small.
  const updateTooltip = useCallback((
    currentChartComponent: ChartComponent,
    canvas: HTMLCanvasElement,
    tooltipItem: ?HoveredElement
  ) => {
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
          <div
            style={{
              position: "absolute",
              left: 0,
              top: 0,
              transform: `translate(${tooltipItem.view.x}px, ${tooltipItem.view.y}px)`,
            }}
          />
        </TimeBasedChartTooltip>,
        tooltip.current
      );
    }
  }, [removeTooltip, tooltips]);

  const [hoverComponentId] = useState(() => uuid.v4());
  const { xAxisIsPlaybackTime } = props;
  const dispatch = useDispatch();
  const clearGlobalHoverTime = useCallback(() => dispatch(clearHoverValue({ componentId: hoverComponentId })), [
    dispatch,
    hoverComponentId,
  ]);
  const setGlobalHoverTime = useCallback(
    (value) =>
      dispatch(
        setHoverValue({
          componentId: hoverComponentId,
          value,
          type: xAxisIsPlaybackTime ? "PLAYBACK_SECONDS" : "OTHER",
        })
      ),
    [dispatch, hoverComponentId, xAxisIsPlaybackTime]
  );

  const onMouseMove = useCallback(async (event: MouseEvent) => {
    const currentChartComponent = chartComponent.current;
    if (!currentChartComponent || !currentChartComponent.canvas) {
      removeTooltip();
      clearGlobalHoverTime();
      return;
    }
    const { canvas } = currentChartComponent;
    const canvasRect = canvas.getBoundingClientRect();
    const xBounds = scaleBounds.current && scaleBounds.current.find(({ axes }) => axes === "xAxes");
    const yBounds = scaleBounds.current && scaleBounds.current.find(({ axes }) => axes === "yAxes");
    const xMousePosition = event.pageX - canvasRect.left;
    const yMousePosition = event.pageY - canvasRect.top;
    const isTargetingCanvas = event.target === canvas;
    if (!inBounds(xMousePosition, xBounds) || !inBounds(yMousePosition, yBounds) || !isTargetingCanvas) {
      removeTooltip();
      clearGlobalHoverTime();
      return;
    }

    const value = getChartValue(xBounds, xMousePosition);
    if (value != null) {
      setGlobalHoverTime(value);
    } else {
      clearGlobalHoverTime();
    }

    if (tooltips && tooltips.length) {
      const tooltipElement = await currentChartComponent.getElementAtXAxis(event);
      updateTooltip(currentChartComponent, canvas, tooltipElement);
    } else {
      removeTooltip();
    }
  }, [updateTooltip, removeTooltip, tooltips, clearGlobalHoverTime, setGlobalHoverTime, scaleBounds]);

  // Normally we set the x axis step-size and display automatically, but we need consistency when
  // scrolling with playback because the vertical lines can flicker, and x axis labels can have an
  // inconsistent number of digits.
  const xBounds = scaleBounds.current && scaleBounds.current.find(({ axes }) => axes === "xAxes");
  const yBounds = scaleBounds.current && scaleBounds.current.find(({ axes }) => axes === "yAxes");

  const xScaleOptions = followPlaybackState && xBounds && stepSize(xBounds);

  const getChartjsOptions = (minX: ?number, maxX: ?number) => {
    const { currentTime } = props;
    const plugins = props.plugins || {};
    const annotations = [...(props.annotations || [])];

    // We create these objects every time so that they can be modified.
    const defaultXTicksSettings = {
      fontFamily: mixins.monospaceFont,
      fontSize: 10,
      fontColor: "#eee",
      maxRotation: 0,
      stepSize: xScaleOptions,
    };
    const defaultYTicksSettings = {
      fontFamily: mixins.monospaceFont,
      fontSize: 10,
      fontColor: "#eee",
      padding: 0,
    };
    const defaultXAxis = {
      id: "X_AXIS_ID",
      ticks: defaultXTicksSettings,
      gridLines: { color: "rgba(255, 255, 255, 0.2)", zeroLineColor: "rgba(255, 255, 255, 0.2)" },
    };
    const xAxes = props.xAxes
      ? props.xAxes.map((xAxis) => ({
          ...defaultXAxis,
          ...xAxis,
          ticks: {
            ...defaultXTicksSettings,
            ...xAxis.ticks,
          },
        }))
      : [defaultXAxis];
    if (currentTime != null) {
      annotations.push({
        type: "line",
        drawTime: "beforeDatasetsDraw",
        scaleID: xAxes[0].id,
        borderColor: "#aaa",
        borderWidth: 1,
        mode: "vertical",
        value: currentTime,
      });
    }

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
        xAxes,
        yAxes: yAxes.map((yAxis) => {
          const ticks = {
            ...defaultYTicksSettings,
            ...yAxis.ticks,
          };
          // If the user is manually panning or zooming, don't constrain the y-axis
          if (hasUserPannedOrZoomed) {
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
    if (followPlaybackState != null) {
      // Follow playback, but don't force it if the user has recently panned or zoomed -- playback
      // will fight with the user's action.
      if (
        currentTime != null &&
        (lastPanTime.current == null || new Date() - lastPanTime.current > FOLLOW_PLAYBACK_PAN_THRESHOLD_MS)
      ) {
        // $FlowFixMe
        options.scales.xAxes[0].ticks.min = currentTime + followPlaybackState.xOffsetMin;
        // $FlowFixMe
        options.scales.xAxes[0].ticks.max = currentTime + followPlaybackState.xOffsetMax;
      }
    } else if (!hasUserPannedOrZoomed) {
      // $FlowFixMe
      options.scales.xAxes[0].ticks.min = minX;
      // $FlowFixMe
      options.scales.xAxes[0].ticks.max = maxX;
    }
    return options;
  };

  const {
    currentTime,
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
    defaultView,
  } = props;
  const xVals = flatten(data.datasets.map(({ data: pts }) => (pts.length > 1 ? pts.map(({ x }) => x) : undefined)));
  let minX, maxX;
  if (defaultView == null || (defaultView.type === "following" && currentTime == null)) {
    // Zoom to fit if the view is "following" but there's no playback cursor. Unlikely.
    minX = min(xVals);
    maxX = max(xVals);
  } else if (defaultView.type === "fixed") {
    minX = defaultView.minXValue;
    maxX = defaultView.maxXValue;
  } else {
    // Following with non-null currentTime.
    if (currentTime == null) {
      throw new Error("Flow doesn't know that currentTime != null");
    }
    minX = currentTime - defaultView.width / 2;
    maxX = currentTime + defaultView.width / 2;
  }

  const scaleOptions = xScaleOptions != null ? { ...props.scaleOptions, xAxisTicks: "follow" } : props.scaleOptions;

  const chartProps = {
    type,
    width,
    height,
    key: `${width}x${height}`,
    ref: chartComponent,
    data: {
      ...data,
      datasets: filterDatasets(data.datasets, linesToHide, scalePerPixel(xBounds), scalePerPixel(yBounds)),
    },
    onScaleBoundsUpdate,
    onPanZoom,
    onClick: onClickAddingValues,
    zoomOptions: {
      ...ChartComponent.defaultProps.zoomOptions,
      enabled: props.zoom,
      mode: zoomMode,
    },
    scaleOptions,
    onChartUpdate,
  };

  const hasData = chartProps.data.datasets.some((dataset) => dataset.data.length);

  return (
    <div style={{ display: "flex", width: "100%" }}>
      <div style={{ display: "flex", width }}>
        <SRoot onDoubleClick={onResetZoom}>
          <HoverBar componentId={hoverComponentId} isTimestampScale={xAxisIsPlaybackTime} scaleBounds={scaleBounds}>
            <SBar xAxisIsPlaybackTime={xAxisIsPlaybackTime} ref={hoverBar} />
          </HoverBar>

          {/* only sync when using x-axis timestamp and actually plotting data. */}
          {isSynced && currentTime == null && xAxisIsPlaybackTime && hasData ? (
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

          {hasUserPannedOrZoomed && (
            <SResetZoom>
              <Button tooltip="(shortcut: double-click)" onClick={onResetZoom}>
                reset view
              </Button>
            </SResetZoom>
          )}

          {/* Handle tooltips while dragging by checking all document events. */}
          <DocumentEvents
            capture
            onMouseDown={onMouseMove}
            onMouseUp={onMouseMove}
            onMouseMove={onMouseMove}
            onMouseLeave={onMouseMove}
          />
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
