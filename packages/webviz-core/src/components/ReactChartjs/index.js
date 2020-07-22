// @flow

/* eslint-disable header/header */

// This file is forked from https://github.com/jerairrest/react-chartjs-2/tree/111f3590a008b8211217e613b5531fb00c3a431b.
// We are upgrading this wrapper of Chart.js to handle rendering Chart.js within a worker.

// The follow license applies to this file only:

// The MIT License (MIT)

// Copyright (c) 2017 Jeremy Ayerst

// Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated
// documentation files (the "Software"), to deal in the Software without restriction, including without limitation the
// rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to
// permit persons to whom the Software is furnished to do so, subject to the following conditions:

// The above copyright notice and this permission notice shall be included in all copies or substantial portions of the
// Software.

// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE
// WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR
// COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

import Hammer from "hammerjs";
import React from "react";
import uuid from "uuid";

import { type ScaleOptions as ManagerScaleOptions } from "./ChartJSManager";
import MainThreadChartJSWorker from "./ChartJSWorker";
import ChartJSWorker from "./ChartJSWorker.worker";
import { type ScaleBounds, type ZoomOptions, type PanOptions, wheelZoomHandler } from "./zoomAndPanHelpers";
import { getFakeRpcs, type RpcLike } from "webviz-core/src/util/FakeRpc";
import supportsOffscreenCanvas from "webviz-core/src/util/supportsOffscreenCanvas";
import WebWorkerManager from "webviz-core/src/util/WebWorkerManager";

export type HoveredElement = any;
export type ScaleOptions = ManagerScaleOptions;
type OnEndChartUpdate = () => void;

type Props = {|
  id?: string,
  data: any,
  height: number,
  width: number,
  legend?: any,
  options: any,
  type: string,
  zoomOptions: ZoomOptions,
  panOptions: PanOptions,
  onScaleBoundsUpdate?: (ScaleBounds[]) => void,
  onPanZoom?: (ScaleBounds[]) => void,
  onClick?: (SyntheticMouseEvent<HTMLCanvasElement>, datalabel: ?any) => void,
  forceDisableWorkerRendering?: ?boolean,
  scaleOptions?: ?ScaleOptions,
  onChartUpdate?: () => OnEndChartUpdate,
|};

const devicePixelRatio = window.devicePixelRatio || 1;

const webWorkerManager = new WebWorkerManager(ChartJSWorker, 8);

class ChartComponent extends React.PureComponent<Props> {
  canvas: ?HTMLCanvasElement;
  _chartRpc: ?RpcLike;
  // $FlowFixMe
  _node: OffscreenCanvas;
  _id = uuid.v4();
  _scaleBoundsByScaleId = {};
  _usingWebWorker = false;
  _onEndChartUpdateCallbacks = {};

  constructor(props: Props) {
    super(props);
    this._getRpc();
  }

  static defaultProps = {
    legend: {
      display: true,
      position: "bottom",
    },
    type: "doughnut",
    height: 150,
    width: 300,
    options: {},
    zoomOptions: { mode: "xy", enabled: true, sensitivity: 3, speed: 0.1 },
    panOptions: { mode: "xy", enabled: true, speed: 20, threshold: 10 },
  };

  _getRpc = (): RpcLike => {
    if (this._chartRpc) {
      return this._chartRpc;
    }

    if (!this.props.forceDisableWorkerRendering && supportsOffscreenCanvas()) {
      // Only use a real chart worker if we support offscreenCanvas.
      this._chartRpc = webWorkerManager.registerWorkerListener(this._id);
      this._usingWebWorker = true;
    } else {
      // Otherwise use a fake RPC so that we don't have to maintain two separate APIs.
      const { mainThreadRpc, workerRpc } = getFakeRpcs();
      new MainThreadChartJSWorker(workerRpc);
      this._chartRpc = mainThreadRpc;
      this._usingWebWorker = false;
    }
    return this._chartRpc;
  };

  componentDidMount() {
    const { type, data, options, scaleOptions, width, height } = this.props;
    // $FlowFixMe
    if (!this.canvas.transferControlToOffscreen) {
      // TODO add fallback.
      throw new Error("ReactChartJS currently only works with browsers with offscreen canvas support");
    }

    this._setupPanAndPinchHandlers();

    let node = this.canvas;
    if (!this.props.forceDisableWorkerRendering && supportsOffscreenCanvas()) {
      // $FlowFixMe
      node = this.canvas.transferControlToOffscreen();
    }
    this._node = node;
    this._getRpc()
      .send(
        "initialize",
        {
          node,
          id: this._id,
          type,
          data,
          options,
          scaleOptions,
          devicePixelRatio,
          width,
          height,
        },
        [node]
      )
      .then((scaleBoundsUpdate) => this._onUpdateScaleBounds(scaleBoundsUpdate));
  }

  componentDidUpdate() {
    const { data, options, scaleOptions, width, height, onChartUpdate } = this.props;
    let chartUpdateId;
    if (onChartUpdate) {
      const onEndChartUpdate = onChartUpdate();
      chartUpdateId = uuid.v4();
      this._onEndChartUpdateCallbacks[chartUpdateId] = onEndChartUpdate;
    }
    this._getRpc()
      .send("update", {
        id: this._id,
        data,
        options,
        scaleOptions,
        width,
        height,
      })
      .then((scaleBoundsUpdate) => {
        this._onUpdateScaleBounds(scaleBoundsUpdate);
      })
      .finally(() => {
        if (this._onEndChartUpdateCallbacks[chartUpdateId]) {
          this._onEndChartUpdateCallbacks[chartUpdateId]();
          delete this._onEndChartUpdateCallbacks[chartUpdateId];
        }
      });
  }

  componentWillUnmount() {
    // If this component will unmount, resolve any pending update callbacks.
    // $FlowFixMe
    Object.values(this._onEndChartUpdateCallbacks).forEach((callback) => callback());
    this._onEndChartUpdateCallbacks = {};

    if (this._chartRpc) {
      this._chartRpc.send("destroy", { id: this._id });
      this._chartRpc = null;

      if (this._usingWebWorker) {
        webWorkerManager.unregisterWorkerListener(this._id);
      }
    }
  }

  _ref = (element: ?HTMLCanvasElement) => {
    this.canvas = element;
  };

  getElementAtXAxis = async (event: SyntheticMouseEvent<any> | MouseEvent): Promise<?HoveredElement> => {
    if (!this.canvas) {
      return Promise.resolve(undefined);
    }

    const boundingRect = this.canvas.getBoundingClientRect();
    if (
      event.clientX < boundingRect.left ||
      event.clientX > boundingRect.right ||
      event.clientY < boundingRect.top ||
      event.clientY > boundingRect.bottom
    ) {
      return Promise.resolve(undefined);
    }

    const newEvent = {
      native: true,
      x: event.clientX - boundingRect.left,
      y: event.clientY - boundingRect.top,
    };
    return this._getRpc().send("getElementAtXAxis", { id: this._id, event: newEvent });
  };

  // Pan/zoom section

  resetZoom = async () => {
    const scaleBoundsUpdate = await this._getRpc().send("resetZoom", { id: this._id });
    this._onUpdateScaleBounds(scaleBoundsUpdate);
  };

  _panning = false;
  _currentDeltaX = null;
  _currentDeltaY = null;
  _currentPinchScaling = 1;

  _setupPanAndPinchHandlers() {
    const { threshold } = this.props.panOptions;
    const hammerManager = new Hammer.Manager(this.canvas);
    hammerManager.add(new Hammer.Pinch());
    hammerManager.add(new Hammer.Pan({ threshold }));

    const hammerPanHandler = async (event: any) => {
      if (!this.props.panOptions.enabled) {
        return;
      }
      if (this._currentDeltaX != null && this._currentDeltaY != null) {
        const deltaX = event.deltaX - this._currentDeltaX;
        const deltaY = event.deltaY - this._currentDeltaY;
        this._currentDeltaX = event.deltaX;
        this._currentDeltaY = event.deltaY;
        const scaleBoundsUpdate = await this._getRpc().send("doPan", {
          id: this._id,
          panOptions: this.props.panOptions,
          deltaX,
          deltaY,
        });
        this._onPanZoom(scaleBoundsUpdate);
        this._onUpdateScaleBounds(scaleBoundsUpdate);
      }
    };

    hammerManager.on("panstart", (event) => {
      this._panning = true;
      this._currentDeltaX = 0;
      this._currentDeltaY = 0;
      hammerPanHandler(event);
    });
    hammerManager.on("panmove", hammerPanHandler);
    hammerManager.on("panend", () => {
      this._currentDeltaX = null;
      this._currentDeltaY = null;
      this._getRpc().send("resetPanDelta", this._id);
      setTimeout(() => {
        this._panning = false;
      }, 500);
    });

    // TODO: pinch gestures only kind of work right now - the built-in browser pinch zoom takes over if pinch is too
    // aggressive. Figure out why this is happening and fix it. This is almost identical to the original plugin that
    // does not have this problem.
    const handlePinch = async (e) => {
      if (!this.props.panOptions.enabled) {
        return;
      }
      const diff = (1 / this._currentPinchScaling) * e.scale;
      const rect = e.target.getBoundingClientRect();
      const offsetX = e.center.x - rect.left;
      const offsetY = e.center.y - rect.top;
      const center = {
        x: offsetX,
        y: offsetY,
      };

      // fingers position difference
      const x = Math.abs(e.pointers[0].clientX - e.pointers[1].clientX);
      const y = Math.abs(e.pointers[0].clientY - e.pointers[1].clientY);

      // diagonal fingers will change both (xy) axes
      const p = x / y;
      let xy;
      if (p > 0.3 && p < 1.7) {
        xy = "xy";
      } else if (x > y) {
        xy = "x"; // x axis
      } else {
        xy = "y"; // y axis
      }

      // Keep track of overall scale
      this._currentPinchScaling = e.scale;

      const scaleBoundsUpdate = await this._getRpc().send("doZoom", {
        id: this._id,
        zoomOptions: this.props.zoomOptions,
        percentZoomX: diff,
        percentZoomY: diff,
        focalPoint: center,
        whichAxesParam: xy,
      });
      this._onPanZoom(scaleBoundsUpdate);
      this._onUpdateScaleBounds(scaleBoundsUpdate);
    };

    hammerManager.on("pinchstart", () => {
      this._currentPinchScaling = 1; // reset tracker
    });
    hammerManager.on("pinch", handlePinch);
    hammerManager.on("pinchend", (e) => {
      handlePinch(e);
      this._currentPinchScaling = 1; // reset
      this._getRpc().send("resetZoomDelta", { id: this._id });
    });
  }

  _onWheel = async (event: SyntheticWheelEvent<HTMLCanvasElement>) => {
    if (!this.props.zoomOptions.enabled) {
      return;
    }
    const { percentZoomX, percentZoomY, focalPoint } = wheelZoomHandler(event, this.props.zoomOptions);
    const scaleBoundsUpdate = await this._getRpc().send("doZoom", {
      id: this._id,
      zoomOptions: this.props.zoomOptions,
      percentZoomX,
      percentZoomY,
      focalPoint,
      whichAxesParam: "xy",
    });
    this._onUpdateScaleBounds(scaleBoundsUpdate);
    this._onPanZoom(scaleBoundsUpdate);
  };

  _onPanZoom = (scaleBoundsUpdate: ScaleBounds[]) => {
    if (this.props.onPanZoom) {
      this.props.onPanZoom(scaleBoundsUpdate);
    }
  };

  _onUpdateScaleBounds = (scaleBoundsUpdate: ScaleBounds[]) => {
    if (this.props.onScaleBoundsUpdate && scaleBoundsUpdate) {
      this.props.onScaleBoundsUpdate(scaleBoundsUpdate);
    }
  };

  _onClick = async (event: SyntheticMouseEvent<HTMLCanvasElement>) => {
    const { onClick } = this.props;
    if (!this._panning && onClick && this.canvas) {
      const rect = event.currentTarget.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      const newEvent = { x, y };
      // Since our next call is asynchronous, we have to persist the event so that React doesn't clear it.
      event.persist();
      const datalabel = await this._getRpc().send("getDatalabelAtEvent", { id: this._id, event: newEvent });
      onClick(event, datalabel);
    }
  };

  render() {
    const { height, width, id } = this.props;

    return (
      <canvas
        ref={this._ref}
        height={height / devicePixelRatio}
        width={width / devicePixelRatio}
        id={id}
        onWheel={this._onWheel}
        onClick={this._onClick}
        style={{ width, height }}
      />
    );
  }
}

export default ChartComponent;
