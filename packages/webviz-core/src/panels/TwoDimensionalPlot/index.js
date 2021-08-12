// @flow
//
//  Copyright (c) 2019-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.
import { flatten, pick, round, uniq } from "lodash";
import * as React from "react";
import DocumentEvents from "react-document-events";
import ReactDOM from "react-dom";
import { hot } from "react-hot-loader/root";
import styled from "styled-components";

import helpContent from "./index.help.md";
import { PanelToolbarLabel, PanelToolbarInput } from "webviz-core/shared/panelToolbarStyles";
import Button from "webviz-core/src/components/Button";
import Dimensions from "webviz-core/src/components/Dimensions";
import EmptyState from "webviz-core/src/components/EmptyState";
import { useExperimentalFeature } from "webviz-core/src/components/ExperimentalFeatures";
import Flex from "webviz-core/src/components/Flex";
import GLChart from "webviz-core/src/components/GLChart";
import { SBar } from "webviz-core/src/components/HoverBar";
import KeyListener from "webviz-core/src/components/KeyListener";
import { Item } from "webviz-core/src/components/Menu";
import MessagePathInput from "webviz-core/src/components/MessagePathSyntax/MessagePathInput";
import { useLatestMessageDataItem } from "webviz-core/src/components/MessagePathSyntax/useLatestMessageDataItem";
import Panel from "webviz-core/src/components/Panel";
import PanelToolbar from "webviz-core/src/components/PanelToolbar";
import ReactChartjs, {
  type HoveredElement,
  type ChartCallbacks,
  DEFAULT_PROPS,
} from "webviz-core/src/components/ReactChartjs";
import { type ScaleBounds } from "webviz-core/src/components/ReactChartjs/zoomAndPanHelpers";
import Tooltip from "webviz-core/src/components/Tooltip";
import { cast } from "webviz-core/src/players/types";
import { deepParse, isBobject } from "webviz-core/src/util/binaryObjects";
import { useDeepChangeDetector, useShallowMemo } from "webviz-core/src/util/hooks";
import { colors, ROBOTO_MONO } from "webviz-core/src/util/sharedStyleConstants";

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
  position: relative;
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

const messagePathInputStyle = { height: "100%" };

const isValidMinMaxVal = (val?: string) => {
  return val == null || val === "" || !isNaN(parseFloat(val));
};

type Path = { value: string };
type Config = {
  path: Path,
  minXVal?: string,
  maxXVal?: string,
  minYVal?: string,
  maxYVal?: string,
  pointRadiusOverride?: string,
};
type Props = { config: Config, saveConfig: ($Shape<Config>) => void };
export type Line = {
  order?: number,
  label: string,
  backgroundColor?: string,
  borderColor?: string,
  borderDash?: number[],
  borderWidth?: number,
  pointBackgroundColor?: string,
  pointBorderColor?: string,
  pointBorderWidth?: number,
  pointRadius?: string,
  pointStyle?:
    | "circle"
    | "cross"
    | "crossRot"
    | "dash"
    | "line"
    | "rect"
    | "rectRounded"
    | "rectRot"
    | "star"
    | "triangle",
  lineTension?: number,
  data: { x: number, y: number }[],
};

const SWrapper = styled.div`
  top: 0;
  bottom: 0;
  position: absolute;
  pointer-events: none;
  will-change: transform;
  // "visibility" and "transform" are set by JS, but outside of React.
  visibility: hidden;
`;

type Position = { x: number, y: number };

type HoverBarProps = {
  children?: React.Node,
  mousePosition: ?Position,
};

function hideBar(wrapper) {
  if (wrapper.style.visibility !== "hidden") {
    wrapper.style.visibility = "hidden";
  }
}

function showBar(wrapper, position: number) {
  wrapper.style.visibility = "visible";
  wrapper.style.transform = `translateX(${position}px)`;
}

// TODO: It'd be a lot more performant to draw directly to the canvas here
// instead of using React state lifecycles to update the hover bar.
const HoverBar = React.memo<HoverBarProps>(({ children, mousePosition }: HoverBarProps) => {
  const wrapper = React.useRef<?HTMLDivElement>(null);
  // We avoid putting the visibility and transforms into react state to try to keep updates snappy.
  // Mouse interactions are frequent, and adding/removing the bar from the DOM would slow things
  // down a lot more than mutating the style props does.
  if (wrapper.current != null) {
    const { current } = wrapper;
    if (mousePosition != null) {
      showBar(current, mousePosition.x);
    } else {
      hideBar(current);
    }
  }

  return <SWrapper ref={wrapper}>{children}</SWrapper>;
});

type TooltipProps = {|
  datapoints: { datapoint: Position, label: string, backgroundColor?: string }[],
  xAxisLabel: ?string,
  tooltipElement: ?HoveredElement,
|};

const TwoDimensionalTooltip = ({ datapoints, xAxisLabel, tooltipElement }: TooltipProps) => {
  if (!tooltipElement) {
    return null;
  }

  const contents = (
    <div style={{ fontFamily: ROBOTO_MONO }}>
      <div style={{ color: colors.TEXT_MUTED, padding: "4px 0" }}>
        {xAxisLabel}: {round(tooltipElement.data.x, 5)}
      </div>
      {datapoints
        .sort((a, b) => b.datapoint.y - a.datapoint.y)
        .map(({ datapoint, label, backgroundColor }, i) => {
          return (
            <div key={i} style={{ padding: "4px 0", display: "flex", alignItems: "center" }}>
              <div
                style={{
                  width: "8px",
                  height: "8px",
                  backgroundColor: backgroundColor || colors.GRAY,
                  marginRight: "2px",
                }}
              />
              <div>
                {label}: {round(datapoint.y, 5)}
              </div>
            </div>
          );
        })}
    </div>
  );
  return (
    <Tooltip defaultShown placement="top" contents={contents}>
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          transform: `translate(${tooltipElement.view.x}px, ${tooltipElement.view.y}px)`,
        }}
      />
    </Tooltip>
  );
};

// NOTE: Keep this type (and its dependencies) in sync with the corresponding
// Node Playground types in 'userUtils'.
export type PlotMessage = {
  lines: Line[],
  points?: Line[],
  polygons?: Line[],
  title?: string,
  yAxisLabel?: string,
  xAxisLabel?: string,
  gridColor?: string,
};

type MenuContentProps = {
  config: Config,
  saveConfig: ($Shape<Config>) => void,
};
function MenuContent({ config, saveConfig }: MenuContentProps) {
  const { pointRadiusOverride, minXVal, maxXVal, minYVal, maxYVal } = config;
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
      <Item>
        <PanelToolbarLabel>Point Radius Override</PanelToolbarLabel>
        <PanelToolbarInput
          value={pointRadiusOverride}
          onChange={({ target }) => saveConfig({ pointRadiusOverride: target.value })}
          onClick={(e) => e.stopPropagation()}
          placeholder="auto"
        />
      </Item>
    </>
  );
}

function TwoDimensionalPlot(props: Props) {
  const { config, saveConfig } = props;
  const { path, minXVal, maxXVal, minYVal, maxYVal, pointRadiusOverride } = config;
  const [hasUserPannedOrZoomed, setHasUserPannedOrZoomed] = React.useState<boolean>(false);
  const [hasVerticalExclusiveZoom, setHasVerticalExclusiveZoom] = React.useState<boolean>(false);
  const [hasBothAxesZoom, setHasBothAxesZoom] = React.useState<boolean>(false);
  const tooltip = React.useRef<?HTMLDivElement>(null);
  const chartCallbacks = React.useRef<?ChartCallbacks>(null);

  const [mousePosition, updateMousePosition] = React.useState<?{ x: number, y: number }>(null);

  const maybeBobject: mixed = useLatestMessageDataItem(path.value, "bobjects")?.queriedData[0]?.value;
  const message: ?PlotMessage = isBobject(maybeBobject) ? deepParse(maybeBobject) : cast<PlotMessage>(maybeBobject);
  const { title, yAxisLabel, xAxisLabel, gridColor, lines = [], points = [], polygons = [] } = message || {};
  const datasets = React.useMemo(
    () =>
      message
        ? [
            ...lines.map((line) => {
              const l = { ...pick(line, keysToPick), showLine: true, fill: false };
              if (pointRadiusOverride) {
                l.pointRadius = pointRadiusOverride;
              }

              return l;
            }),
            ...points.map((point) => {
              const pt = pick(point, keysToPick);
              if (pointRadiusOverride) {
                pt.pointRadius = pointRadiusOverride;
              }
              return pt;
            }),
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
    [lines, message, pointRadiusOverride, points, polygons]
  );

  const { allXs, allYs } = React.useMemo(
    () => ({
      allXs: flatten(datasets.map((dataset) => (dataset.data ? dataset.data.map(({ x }) => x) : []))),
      allYs: flatten(datasets.map((dataset) => (dataset.data ? dataset.data.map(({ y }) => y) : []))),
    }),
    [datasets]
  );

  const getBufferedMinMax = React.useCallback((allVals: number[]) => {
    const minVal = Math.min(...allVals);
    const maxVal = Math.max(...allVals);
    const diff = maxVal - minVal;
    return {
      min: !diff ? minVal - 1 : minVal - diff * 0.05,
      max: !diff ? maxVal + 1 : maxVal + diff * 0.05,
    };
  }, []);

  const options = React.useMemo(
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

  const menuContent = React.useMemo(() => <MenuContent config={config} saveConfig={saveConfig} />, [
    config,
    saveConfig,
  ]);

  const removeTooltip = React.useCallback(() => {
    if (tooltip.current) {
      ReactDOM.unmountComponentAtNode(tooltip.current);
    }
    if (tooltip.current && tooltip.current.parentNode) {
      // Satisfy flow.
      tooltip.current.parentNode.removeChild(tooltip.current);
      tooltip.current = null;
    }
  }, []);

  const scaleBounds = React.useRef<?$ReadOnlyArray<ScaleBounds>>();
  const hoverBar = React.useRef<?HTMLElement>();

  const onScaleBoundsUpdate = React.useCallback((scales) => {
    scaleBounds.current = scales;
    const firstYScale = scales.find(({ axes }) => axes === "yAxes");
    if (firstYScale != null && hoverBar.current != null) {
      const { current } = hoverBar;
      const topPx = Math.min(firstYScale.minAlongAxis, firstYScale.maxAlongAxis);
      const bottomPx = Math.max(firstYScale.minAlongAxis, firstYScale.maxAlongAxis);
      current.style.top = `${topPx}px`;
      current.style.height = `${bottomPx - topPx}px`;
    }
  }, [scaleBounds]);

  const onMouseMove = React.useCallback(async (event: MouseEvent) => {
    const canvas = chartCallbacks.current && chartCallbacks.current.canvasRef.current;
    if (!canvas) {
      removeTooltip();
      return;
    }
    const canvasRect = canvas.getBoundingClientRect();
    const isTargetingCanvas = event.target === canvas;
    const xMousePosition = event.pageX - canvasRect.left;
    const yMousePosition = event.pageY - canvasRect.top;

    if (
      event.pageX < canvasRect.left ||
      event.pageX > canvasRect.right ||
      event.pageY < canvasRect.top ||
      event.pageY > canvasRect.bottom ||
      !isTargetingCanvas
    ) {
      removeTooltip();
      updateMousePosition(null);
      return;
    }

    const newMousePosition = { x: xMousePosition, y: yMousePosition };
    updateMousePosition(newMousePosition);

    // $FlowFixMe flow doesn't like function calls in optional chains
    const tooltipElement = await chartCallbacks.current?.getElementAtXAxis(event);
    if (!tooltipElement) {
      removeTooltip();
      return;
    }
    const tooltipDatapoints = [];
    for (const { data: dataPoints, label, backgroundColor } of datasets) {
      const datapoint = dataPoints.find((_datapoint) => _datapoint.x === tooltipElement.data.x);
      if (datapoint) {
        tooltipDatapoints.push({
          datapoint,
          label,
          backgroundColor,
        });
      }
    }
    if (!tooltipDatapoints.length) {
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
      ReactDOM.render(
        <TwoDimensionalTooltip
          tooltipElement={tooltipElement}
          datapoints={tooltipDatapoints}
          xAxisLabel={xAxisLabel}
        />,
        currentTooltip
      );
    }
  }, [datasets, removeTooltip, xAxisLabel]);

  const onResetZoom = React.useCallback(() => {
    if (chartCallbacks.current) {
      chartCallbacks.current.resetZoom();
      setHasUserPannedOrZoomed(false);
    }
  }, [setHasUserPannedOrZoomed]);

  const onPanZoom = React.useCallback(() => {
    if (!hasUserPannedOrZoomed) {
      setHasUserPannedOrZoomed(true);
    }
  }, [hasUserPannedOrZoomed]);
  if (useDeepChangeDetector([pick(props.config, ["minXVal", "maxXVal", "minYVal", "maxYVal"])], false)) {
    // Reset the view to the default when the default changes.
    if (hasUserPannedOrZoomed) {
      setHasUserPannedOrZoomed(false);
    }
  }

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

  // Always clean up tooltips when unmounting.
  React.useEffect(() => removeTooltip, [removeTooltip]);
  const emptyMessage = !points.length && !lines.length && !polygons.length;

  if (uniq(datasets.map(({ label }) => label)).length !== datasets.length) {
    throw new Error("2D Plot datasets do not have unique labels");
  }

  const zoomOptions = useShallowMemo({ ...DEFAULT_PROPS.zoomOptions, mode: zoomMode });

  const onChange = React.useCallback((newValue) => saveConfig({ path: { value: newValue } }), [saveConfig]);

  const ChartComponent = useExperimentalFeature("useGLChartIn2dPlot") ? GLChart : ReactChartjs;

  return (
    <SContainer>
      <PanelToolbar helpContent={helpContent} menuContent={menuContent}>
        <MessagePathInput
          path={path.value}
          onChange={onChange}
          inputStyle={messagePathInputStyle}
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
                <HoverBar mousePosition={mousePosition}>
                  <SBar xAxisIsPlaybackTime ref={hoverBar} />
                </HoverBar>
                <ChartComponent
                  type="scatter"
                  width={width}
                  height={height}
                  key={`${width}x${height}`}
                  options={options}
                  onPanZoom={onPanZoom}
                  onScaleBoundsUpdate={onScaleBoundsUpdate}
                  data={{ datasets }}
                  zoomOptions={zoomOptions}
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
              </>
            )}
          </Dimensions>
          <DocumentEvents capture onMouseDown={onMouseMove} onMouseUp={onMouseMove} onMouseMove={onMouseMove} />
          <KeyListener global keyDownHandlers={keyDownHandlers} keyUpHandlers={keyUphandlers} />
        </SRoot>
      )}
    </SContainer>
  );
}

TwoDimensionalPlot.panelType = "TwoDimensionalPlot";
TwoDimensionalPlot.defaultConfig = { path: { value: "" } };
TwoDimensionalPlot.shortcuts = [
  { description: "Reset", keys: ["double click"] },
  { description: "Pan", keys: ["drag"] },
  { description: "Zoom", keys: ["scroll horizontally"] },
  { description: "Zoom vertically", keys: ["v" + "scroll"] },
  { description: "Zoom both vertically and horizontally", keys: ["b" + "scroll"] },
  { description: "Zoom to percentage (10% - 100%)", keys: ["⌘", "1|2|...|9|0"] },
];
export default hot(Panel<Config>(TwoDimensionalPlot));
