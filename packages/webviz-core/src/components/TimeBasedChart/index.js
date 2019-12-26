// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.
import { last, max, min, minBy } from "lodash";
import * as React from "react";
import ChartComponent from "react-chartjs-2";
import DocumentEvents from "react-document-events";
import ReactDOM from "react-dom";
import type { Time } from "rosbag";
import styled from "styled-components";

import TimeBasedChartTooltip from "./TimeBasedChartTooltip";
import Button from "webviz-core/src/components/Button";
import createSyncingComponent from "webviz-core/src/components/createSyncingComponent";
import type { MessageHistoryItem } from "webviz-core/src/components/MessageHistory";
import TimeBasedChartLegend from "webviz-core/src/components/TimeBasedChart/TimeBasedChartLegend";
import Tooltip from "webviz-core/src/components/Tooltip";
import Y_AXIS_ID from "webviz-core/src/panels/Plot/PlotChart";
import mixins from "webviz-core/src/styles/mixins.module.scss";

type Bounds = {| minX: ?number, maxX: ?number |};
const SyncTimeAxis = createSyncingComponent<Bounds, Bounds>("SyncTimeAxis", (dataItems: Bounds[]) => ({
  minX: min(dataItems.map(({ minX }) => (minX == null ? undefined : minX))),
  maxX: max(dataItems.map(({ maxX }) => (maxX == null ? undefined : maxX))),
}));

const X_AXIS_ID = "x-axis-1";

export type TimeBasedChartTooltipData = {|
  item: MessageHistoryItem,
  path: string,
  value: number | boolean | string,
  constantName: ?string,
  startTime: Time,
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

const MemoizedTooltips = React.memo<{}>(function Tooltips() {
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
  xAxes?: any,
  yAxes: any,
  plugins?: any,
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
|};
type State = {|
  showResetZoom: boolean,
  shouldRedraw: boolean,
  annotations: any[],
  userSetMinX: number | null,
  userSetMaxX: number | null,
  userSetMinY: number | null,
  userSetMaxY: number | null,
  xAxisVal: "timestamp" | "index",
|};

// Create a chart with any y-axis but with an x-axis that shows time since the
// start of the bag, and which is kept in sync with other instances of this
// component. Uses chart.js internally, with a zoom/pan plugin, and with our
// standard tooltips.
export default class TimeBasedChart extends React.PureComponent<Props, State> {
  _chart: ?ChartComponent;
  _tooltip: ?HTMLDivElement;
  _bar: ?HTMLDivElement;
  _tooltipModel: ?{ dataPoints?: any[] };
  _mousePosition: ?{| x: number, y: number |};
  state = {
    showResetZoom: false,
    shouldRedraw: false,
    annotations: [],
    userSetMinX: null,
    userSetMaxX: null,
    userSetMinY: null,
    userSetMaxY: null,
    xAxisVal: "timestamp",
  };

  componentDidMount() {
    document.addEventListener("visibilitychange", this._onVisibilityChange);
  }

  static getDerivedStateFromProps(nextProps: Props, prevState: State): State {
    const { annotations, xAxisVal } = prevState;
    const nextAnnotations = nextProps.annotations || [];
    const nextXAxisVal = nextProps.xAxisVal || "timestamp";
    const currentFutureTime = annotations && annotations.length && annotations[0].value;
    const nextFutureTime = nextAnnotations && nextAnnotations.length && nextAnnotations[0].value;
    return {
      ...prevState,
      shouldRedraw: currentFutureTime !== nextFutureTime || xAxisVal !== nextXAxisVal,
      xAxisVal: nextXAxisVal,
      annotations: nextAnnotations,
    };
  }

  _onVisibilityChange = () => {
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
      this.forceUpdate();
    }
  };

  componentWillUnmount() {
    document.removeEventListener("visibilitychange", this._onVisibilityChange);
  }

  _onPlotChartUpdate = (axis: any) => {
    if (this.props.saveCurrentYs) {
      const scaleId = this.props.yAxes ? this.props.yAxes[0].id : Y_AXIS_ID;
      this.props.saveCurrentYs(axis.chart.scales[scaleId].min, axis.chart.scales[scaleId].max);
    }
  };

  _onPanZoomUpdate = (chartInstance: ChartComponent) => {
    const { xAxes, saveCurrentYs } = this.props;
    const Y_scaleId = this.props.yAxes[0].id;
    const X_scaleId = xAxes ? xAxes[0].id : X_AXIS_ID;
    const minX = chartInstance.chart.scales[X_scaleId].min;
    const maxX = chartInstance.chart.scales[X_scaleId].max;
    const minY = chartInstance.chart.scales[Y_scaleId].min;
    const maxY = chartInstance.chart.scales[Y_scaleId].max;

    if (saveCurrentYs) {
      saveCurrentYs(minY, maxY);
    }
    this.setState({
      showResetZoom: true,
      userSetMinX: minX,
      userSetMaxX: maxX,
      userSetMinY: minY,
      userSetMaxY: maxY,
    });
  };

  _onResetZoom = () => {
    if (this._chart) {
      this._chart.chartInstance.resetZoom();
      this.setState({
        showResetZoom: false,
        userSetMaxX: null,
        userSetMinX: null,
        userSetMaxY: null,
        userSetMinY: null,
      });
    }
  };

  _onGetTick = (value: number, index: number, values: number[]): string => {
    if (index === 0 || index === values.length - 1) {
      // First and last labels sometimes get super long rounding errors when zooming.
      // This fixes that.
      return "";
    }
    return `${value}`;
  };

  _removeTooltip = () => {
    if (this._tooltip) {
      ReactDOM.unmountComponentAtNode(this._tooltip);
    }
    if (this._tooltip && this._tooltip.parentNode) {
      // Satisfy flow.
      this._tooltip.parentNode.removeChild(this._tooltip);
      delete this._tooltip;
    }
  };

  // We use a custom tooltip so we can style it more nicely, and so that it can break
  // out of the bounds of the canvas, in case the panel is small.
  _updateTooltip = () => {
    if (
      !this._mousePosition ||
      !this._tooltipModel ||
      !this._tooltipModel.dataPoints ||
      this._tooltipModel.dataPoints.length === 0
    ) {
      return this._removeTooltip();
    }

    const { y } = this._mousePosition;
    const tooltipItem = minBy(this._tooltipModel.dataPoints, (point) => Math.abs(point.y - y));

    if (
      !this._chart ||
      !this._chart.chartInstance.data.datasets[tooltipItem.datasetIndex] ||
      !this._chart.chartInstance.data.datasets[tooltipItem.datasetIndex].data[tooltipItem.index]
    ) {
      return this._removeTooltip();
    }
    const { chartInstance } = this._chart;

    if (!this._tooltip) {
      this._tooltip = document.createElement("div");
      chartInstance.canvas.parentNode.appendChild(this._tooltip);
    }
    if (this._tooltip) {
      ReactDOM.render(
        <TimeBasedChartTooltip
          tooltip={chartInstance.data.datasets[tooltipItem.datasetIndex].data[tooltipItem.index].tooltip}>
          <div style={{ position: "absolute", left: tooltipItem.x, top: tooltipItem.y }} />
        </TimeBasedChartTooltip>,
        this._tooltip
      );
    }
  };

  _onMouseMove = (event: MouseEvent) => {
    if (!this._chart) {
      delete this._mousePosition;
      this._updateTooltip();
      if (this._bar && this._bar.style) {
        this._bar.style.display = "none";
      }
      return;
    }
    const { chartInstance } = this._chart;
    const canvasRect = chartInstance.canvas.getBoundingClientRect();
    if (
      event.pageX < canvasRect.left ||
      event.pageX > canvasRect.right ||
      event.pageY < canvasRect.top ||
      event.pageY > canvasRect.bottom
    ) {
      delete this._mousePosition;
      this._updateTooltip();
      if (this._bar && this._bar.style) {
        this._bar.style.display = "none";
      }
      return;
    }
    this._mousePosition = {
      x: event.pageX - canvasRect.left,
      y: event.pageY - canvasRect.top,
    };
    if (this._bar && this._bar.style) {
      this._bar.style.display = "block";
      this._bar.style.left = `${this._mousePosition.x}px`;
    }
    this._updateTooltip();
  };

  _chartjsOptions = (minX: ?number, maxX: ?number, userMinY: ?number, userMaxY: ?number) => {
    const { plugins, xAxes, yAxes, useFixedYAxisWidth } = this.props;
    const { annotations } = this.state;
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
      afterUpdate: this._onPlotChartUpdate,
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
        custom: (tooltipModel: { dataPoints?: any[] }) => {
          this._tooltipModel = tooltipModel;
          this._updateTooltip();
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
                callback: (...args) =>
                  xAxis.ticks.callback ? xAxis.ticks.callback(...args) : this._onGetTick(...args),
              },
            }))
          : [defaultXAxis],
        yAxes: yAxes.map((yAxis) => {
          const ticks = {
            ...defaultYTicksSettings,
            ...yAxis.ticks,
            callback: (...args) => (yAxis.ticks.callback ? yAxis.ticks.callback(...args) : this._onGetTick(...args)),
          };
          // If the user is manually panning or zooming, don't constrain the y-axis
          if (this.state.showResetZoom) {
            delete ticks.min;
            delete ticks.max;
          } else {
            if (userMinY != null) {
              ticks.min = userMinY;
            }
            if (userMaxY != null) {
              ticks.max = userMaxY;
            }
          }

          return {
            ...yAxis,
            afterUpdate: this._onPlotChartUpdate,
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
      onClick: this.props.onClick,
      pan: {
        enabled: true,
        onPan: (chartInstance: ChartComponent) => {
          this._onPanZoomUpdate(chartInstance);
        },
      },
      zoom: {
        enabled: this.props.zoom,
        onZoom: (chartInstance: ChartComponent) => {
          this._onPanZoomUpdate(chartInstance);
        },
      },
      plugins: plugins || {},
      annotation: { annotations },
    };
    if (!this.state.showResetZoom) {
      // $FlowFixMe
      options.scales.xAxes[0].ticks.min = minX;
      // $FlowFixMe
      options.scales.xAxes[0].ticks.max = maxX;
    }
    return options;
  };

  renderChart() {
    const { type, width, height, data, isSynced, linesToHide = {} } = this.props;
    const { userSetMinX, userSetMaxX, userSetMinY, userSetMaxY, xAxisVal } = this.state;
    const userSetMinOrZero = isNaN(userSetMinX) ? data.minIsZero : userSetMinX;
    const minX = userSetMinOrZero
      ? 0
      : min(data.datasets.map((dataset) => (dataset.data.length > 1 ? dataset.data[0].x : undefined)));
    const maxX =
      typeof userSetMaxX === "number"
        ? userSetMaxX
        : max(data.datasets.map((dataset) => (dataset.data.length > 1 ? last(dataset.data).x : undefined)));

    const chartProps = {
      redraw: this.state.shouldRedraw,
      type,
      width,
      height,
      key: `${width}x${height}`, // https://github.com/jerairrest/react-chartjs-2/issues/60#issuecomment-406376731
      ref: (ref) => {
        this._chart = ref;
      },
      data: { ...data, datasets: data.datasets.filter((dataset) => !linesToHide[dataset.label]) },
    };

    return isSynced && xAxisVal === "timestamp" ? (
      <SyncTimeAxis data={{ minX, maxX }}>
        {(syncedMinMax) => {
          const syncedMinX = syncedMinMax.minX != null ? Math.min(minX, syncedMinMax.minX) : minX;
          const syncedMaxX = syncedMinMax.maxX != null ? Math.max(maxX, syncedMinMax.maxX) : maxX;
          return (
            <ChartComponent
              {...chartProps}
              options={this._chartjsOptions(syncedMinX, syncedMaxX, userSetMinY, userSetMaxY)}
            />
          );
        }}
      </SyncTimeAxis>
    ) : (
      <ChartComponent {...chartProps} options={this._chartjsOptions(minX, maxX, userSetMinY, userSetMaxY)} />
    );
  }

  render() {
    const { width, drawLegend, canToggleLines, toggleLine, data, linesToHide = {} } = this.props;

    return (
      <div style={{ display: "flex", width: "100%" }}>
        <div style={{ display: "flex", width }}>
          <SRoot onDoubleClick={this._onResetZoom}>
            <SBar ref={(el) => (this._bar = el)} />
            {this.renderChart()}

            {this.state.showResetZoom && (
              <SResetZoom>
                <Button tooltip="(shortcut: double-click)" onClick={this._onResetZoom}>
                  reset view
                </Button>
              </SResetZoom>
            )}

            {/* Chart.js seems to not handle tooltips while dragging super well, and this fixes that. */}
            <DocumentEvents
              capture
              onMouseDown={this._onMouseMove}
              onMouseUp={this._onMouseMove}
              onMouseMove={this._onMouseMove}
            />
          </SRoot>
        </div>
        <MemoizedTooltips />
        {drawLegend && (
          <SLegend>
            <TimeBasedChartLegend
              datasetId={this.props.datasetId}
              canToggleLines={canToggleLines}
              datasets={data.datasets}
              linesToHide={linesToHide}
              toggleLine={toggleLine || (() => {})}
            />
          </SLegend>
        )}
      </div>
    );
  }
}
