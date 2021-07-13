// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.
import { max, min, flatten } from "lodash";
import React, { memo, useEffect, useCallback, useState, useRef, useMemo } from "react";
import DocumentEvents from "react-document-events";
import ReactDOM from "react-dom";
import styled from "styled-components";
import uuid from "uuid";

import TimeBasedChartTooltip from "./TimeBasedChartTooltip";
import {
  useSyncedTimeAxis,
  stepSize,
  type TimeBasedChartTooltipData,
  type DataSet,
  scalePerPixel,
  filterDatasets,
  useForceRerenderOnVisibilityChange,
} from "./utils";
import Button from "webviz-core/src/components/Button";
import GLChart from "webviz-core/src/components/GLChart";
import HoverBar, { getChartTopAndHeight, SBar } from "webviz-core/src/components/HoverBar";
import { useClearHoverValue, useSetHoverValue } from "webviz-core/src/components/HoverBar/context";
import KeyListener from "webviz-core/src/components/KeyListener";
import ReactChartjs, {
  type HoveredElement,
  type ChartCallbacks,
  type ScaleOptions,
  DEFAULT_PROPS,
} from "webviz-core/src/components/ReactChartjs";
import {
  getChartValue,
  inBounds,
  getChartPx,
  type ScaleBounds,
} from "webviz-core/src/components/ReactChartjs/zoomAndPanHelpers";
import TimeBasedChartLegend from "webviz-core/src/components/TimeBasedChart/TimeBasedChartLegend";
import Tooltip from "webviz-core/src/components/Tooltip";
import mixins from "webviz-core/src/styles/mixins.module.scss";
import { useDeepChangeDetector, useDeepMemo, useForceUpdate } from "webviz-core/src/util/hooks";

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

const SCurrentTimeBar = styled.div`
  position: absolute;
  top: 6px;
  bottom: 0;
  width: 1px;
  background: #aaa;
  will-change: transform;
  pointer-events: none;
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

type FollowPlaybackState = $ReadOnly<{|
  xOffsetMin: number, // -1 means the left edge of the plot is one second before the current time.
  xOffsetMax: number, // 1 means the right edge of the plot is one second after the current time.
|}>;

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
  renderPath?: "webgl" | "chartjs",
|};

// Create a chart with any y-axis but with an x-axis that shows time since the
// start of the bag, and which is kept in sync with other instances of this
// component. Uses chart.js internally, with a zoom/pan plugin, and with our
// standard tooltips.
export default memo<Props>(function TimeBasedChart(props: Props) {
  const { data, defaultView, currentTime, linesToHide, isSynced } = props;
  const chartCallbacks = React.useRef<?ChartCallbacks>(null);
  const tooltip = useRef<?HTMLDivElement>(null);
  const hasUnmounted = useRef<boolean>(false);

  const [hasUserPannedOrZoomed, setHasUserPannedOrZoomed] = useState<boolean>(false);
  const hasUserPannedOrZoomedRef = useRef(hasUserPannedOrZoomed);
  hasUserPannedOrZoomedRef.current = hasUserPannedOrZoomed;
  const [followPlaybackState, setFollowPlaybackState] = useState<?FollowPlaybackState>(null);

  useForceRerenderOnVisibilityChange();

  const { saveCurrentView, yAxes } = props;
  const forceUpdate = useForceUpdate();
  const scaleBounds = useRef<?$ReadOnlyArray<ScaleBounds>>();
  const hoverBar = useRef<?HTMLElement>();
  const onScaleBoundsUpdate = useCallback((scales) => {
    const previousScaleBounds = scaleBounds.current;
    scaleBounds.current = scales;
    if (!previousScaleBounds) {
      // Ensure that we force a re-render the first time we set the scaleBounds.
      forceUpdate();
    }
    const firstYScale = scales.find(({ axes }) => axes === "yAxes");
    const firstXScale = scales.find(({ axes }) => axes === "xAxes");
    const width = firstXScale && firstXScale.max - firstXScale.min;
    if (firstYScale && saveCurrentView && typeof firstYScale.min === "number" && typeof firstYScale.max === "number") {
      saveCurrentView(firstYScale.min, firstYScale.max, width);
    }
  }, [forceUpdate, saveCurrentView]);

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
  }, [onClick]);

  // Keep a ref to props.currentTime so onPanZoom can have stable identity
  const currentTimeRef = useRef<?number>();
  currentTimeRef.current = currentTime;
  const onPanZoom = useCallback((newScaleBounds: ScaleBounds[]) => {
    if (!hasUserPannedOrZoomedRef.current) {
      setHasUserPannedOrZoomed(true);
    }
    // Preloaded plots follow playback at a fixed zoom and x-offset unless the user is in the
    // initial "zoom to fit" state. Subsequent zooms/pans adjust the offsets.
    const bounds = newScaleBounds.find(({ axes }) => axes === "xAxes");
    if (bounds != null && bounds.min != null && bounds.max != null && currentTimeRef.current != null) {
      const currentTimeFromRef = currentTimeRef.current;
      setFollowPlaybackState({
        xOffsetMin: bounds.min - currentTimeFromRef,
        xOffsetMax: bounds.max - currentTimeFromRef,
      });
    }
    lastPanTime.current = new Date();
  }, []);

  const onResetZoom = useCallback(() => {
    if (chartCallbacks.current) {
      chartCallbacks.current.resetZoom();
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
  const keyDownHandlers = useMemo(
    () => ({
      v: () => setHasVerticalExclusiveZoom(true),
      b: () => setHasBothAxesZoom(true),
    }),
    [setHasVerticalExclusiveZoom, setHasBothAxesZoom]
  );
  const keyUphandlers = useMemo(
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
  const updateTooltip = useCallback((canvas: HTMLCanvasElement, tooltipItem: ?HoveredElement) => {
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
  const clearHoverValue = useClearHoverValue();
  const setHoverValue = useSetHoverValue();
  const clearGlobalHoverTime = useCallback(() => {
    clearHoverValue(hoverComponentId);
  }, [clearHoverValue, hoverComponentId]);
  const setGlobalHoverTime = useCallback((value) => {
    setHoverValue({ componentId: hoverComponentId, value, type: xAxisIsPlaybackTime ? "PLAYBACK_SECONDS" : "OTHER" });
  }, [hoverComponentId, setHoverValue, xAxisIsPlaybackTime]);

  const onMouseMove = useCallback(async (event: MouseEvent) => {
    const canvas = chartCallbacks.current && chartCallbacks.current.canvasRef.current;
    if (!canvas) {
      removeTooltip();
      clearGlobalHoverTime();
      return;
    }
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

    if (tooltips && tooltips.length && chartCallbacks.current) {
      const tooltipElement = await chartCallbacks.current.getElementAtXAxis(event);
      updateTooltip(canvas, tooltipElement);
    } else {
      removeTooltip();
    }
  }, [updateTooltip, removeTooltip, tooltips, clearGlobalHoverTime, setGlobalHoverTime, scaleBounds]);

  // Normally we set the x axis step-size and display automatically, but we need consistency when
  // scrolling with playback because the vertical lines can flicker, and x axis labels can have an
  // inconsistent number of digits.
  const xBounds = useDeepMemo(scaleBounds.current && scaleBounds.current.find(({ axes }) => axes === "xAxes"));
  const yBounds = useDeepMemo(scaleBounds.current && scaleBounds.current.find(({ axes }) => axes === "yAxes"));

  const xScaleOptions = useMemo(() => followPlaybackState && xBounds && stepSize(xBounds), [
    followPlaybackState,
    xBounds,
  ]);

  const filteredData = useMemo(
    () => ({
      ...data,
      datasets: filterDatasets(data.datasets, linesToHide || {}, scalePerPixel(xBounds), scalePerPixel(yBounds)),
    }),
    [data, linesToHide, xBounds, yBounds]
  );

  let minX, maxX;
  const xVals = flatten(data.datasets.map(({ data: pts }) => (pts.length > 1 ? pts.map(({ x }) => x) : undefined)));
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

  // only sync when using x-axis timestamp and actually plotting data.
  const hasData = filteredData.datasets.some((dataset) => dataset.data.length);
  const usingSyncedBounds = !!isSynced && currentTime == null && xAxisIsPlaybackTime && hasData;
  const syncedBounds = useSyncedTimeAxis({ minX, maxX }, usingSyncedBounds);
  const syncedMinX = syncedBounds.minX != null ? min([minX, syncedBounds.minX]) : minX;
  const syncedMaxX = syncedBounds.maxX != null ? max([maxX, syncedBounds.maxX]) : maxX;

  const bounds = usingSyncedBounds ? { minX: syncedMinX, maxX: syncedMaxX } : { minX, maxX };

  const enableFollowingPlayback =
    followPlaybackState &&
    (lastPanTime.current == null || new Date() - lastPanTime.current > FOLLOW_PLAYBACK_PAN_THRESHOLD_MS);
  const followPlaybackCurrentTime = enableFollowingPlayback ? currentTime : undefined;
  const chartJsOptions = useMemo(() => {
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
      if (enableFollowingPlayback) {
        // $FlowFixMe
        options.scales.xAxes[0].ticks.min = followPlaybackCurrentTime + followPlaybackState.xOffsetMin;
        // $FlowFixMe
        options.scales.xAxes[0].ticks.max = followPlaybackCurrentTime + followPlaybackState.xOffsetMax;
      }
    } else if (!hasUserPannedOrZoomed) {
      // $FlowFixMe
      options.scales.xAxes[0].ticks.min = bounds.minX;
      // $FlowFixMe
      options.scales.xAxes[0].ticks.max = bounds.maxX;
    }
    return options;
  }, [
    bounds.maxX,
    bounds.minX,
    enableFollowingPlayback,
    followPlaybackCurrentTime,
    followPlaybackState,
    hasUserPannedOrZoomed,
    props.annotations,
    props.plugins,
    props.xAxes,
    xScaleOptions,
    yAxes,
  ]);

  const { datasetId, type, width, height, drawLegend, canToggleLines, toggleLine } = props;
  const scaleOptions = useMemo(
    () => (xScaleOptions != null ? { ...props.scaleOptions, xAxisTicks: "follow" } : props.scaleOptions),
    [props.scaleOptions, xScaleOptions]
  );

  const zoomOptions = useMemo(
    () => ({
      ...DEFAULT_PROPS.zoomOptions,
      enabled: props.zoom,
      mode: zoomMode,
    }),
    [props.zoom, zoomMode]
  );

  const currentTimePx: ?number = currentTime != null ? getChartPx(xBounds, currentTime) : undefined;
  const chartTopAndHeight = getChartTopAndHeight(scaleBounds.current);

  const ChartComponent = props.renderPath === "webgl" ? GLChart : ReactChartjs;

  return (
    <div style={{ display: "flex", width: "100%" }}>
      <div style={{ display: "flex", width }}>
        <SRoot onDoubleClick={onResetZoom}>
          <HoverBar componentId={hoverComponentId} isTimestampScale={xAxisIsPlaybackTime} scaleBounds={scaleBounds}>
            <SBar xAxisIsPlaybackTime={xAxisIsPlaybackTime} ref={hoverBar} />
          </HoverBar>
          {currentTimePx != null && chartTopAndHeight != null && (
            <SCurrentTimeBar
              style={{
                transform: `translateX(${currentTimePx}px)`,
                top: `${chartTopAndHeight.topPx}px`,
                height: `${chartTopAndHeight.heightPx}px`,
              }}
            />
          )}
          <ChartComponent
            type={type}
            width={width}
            height={height}
            key={`${width}x${height}`}
            data={filteredData}
            onScaleBoundsUpdate={onScaleBoundsUpdate}
            onPanZoom={onPanZoom}
            onClick={onClickAddingValues}
            zoomOptions={zoomOptions}
            scaleOptions={scaleOptions}
            options={chartJsOptions}
            panOptions={DEFAULT_PROPS.panOptions}
            callbacksRef={chartCallbacks}
          />

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
