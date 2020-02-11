// @flow

/* eslint-disable header/header */

// This file is forked from https://github.com/jerairrest/react-chartjs-2/tree/111f3590a008b8211217e613b5531fb00c3a431b.
// We are upgrading this wrapper of Chart.js to handle rendering Chart.js within a worker.
// This file is a work in progress.

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

import Chart from "chart.js";
import Hammer from "hammerjs";
import isEqual from "lodash/isEqual";
import isFunction from "lodash/isFunction";
import isPlainObject from "lodash/isPlainObject";
import PropTypes from "prop-types";
import React from "react";
import uuid from "uuid";

import { type ScaleBounds, type ZoomOptions, type PanOptions, wheelZoomHandler } from "./zoomAndPanHelpers";
import Rpc from "webviz-core/src/util/Rpc";
// $FlowFixMe Flow doesn't like workers.
import ChartJSWorker from "worker-loader!./ChartJSWorker";

export type HoveredElement = any;

type Props = {|
  id?: string,
  data: any,
  height?: number,
  width?: number,
  legend?: any,
  options?: any,
  redraw?: boolean,
  type: string,
  zoomOptions: ZoomOptions,
  panOptions: PanOptions,
  onScaleBoundsUpdate?: (ScaleBounds[]) => void,
  onPanZoom?: () => void,
|};

// Remove any functions from the object, so that it can be passed across worker boundaries.
// TODO: remove this once we're sure that every ChartComponent caller doesn't pass in functions. We're only doing this
// as a temporary step until we update callers.
function sanitizeObject(obj) {
  if (obj && isPlainObject(obj)) {
    for (const key of Object.keys(obj)) {
      if (isFunction(obj[key])) {
        delete obj[key];
      }
      sanitizeObject(obj[key]);
    }
  } else if (obj instanceof Array) {
    for (let index = obj.length - 1; index >= 0; index--) {
      const item = obj[index];
      if (isFunction(obj[index])) {
        obj.splice(index, 1);
      } else if (isPlainObject(item) || item instanceof Array) {
        sanitizeObject(item);
      }
    }
  }

  return obj;
}

class ChartComponent extends React.Component<Props> {
  canvas: ?HTMLCanvasElement;
  _worker: Rpc;
  // $FlowFixMe
  _node: OffscreenCanvas;
  _id = uuid.v4();
  _scaleBoundsByScaleId = {};

  constructor() {
    super();
    this._worker = new Rpc(new ChartJSWorker());
  }

  static getLabelAsKey = (d: any): string => d.label;

  static propTypes = {
    id: PropTypes.string,
    data: PropTypes.oneOfType([PropTypes.object, PropTypes.func]).isRequired,
    height: PropTypes.number,
    legend: PropTypes.object,
    options: PropTypes.object,
    redraw: PropTypes.bool,
    type(props: Props, propName: string, componentName: string) {
      if (!Chart.controllers[props[propName]]) {
        return new Error(`Invalid chart type \`${props[propName]}\` supplied to \`${componentName}\`.`);
      }
    },
    width: PropTypes.number,
    zoomOptions: PropTypes.object.isRequired,
    panOptions: PropTypes.object.isRequired,
    scaleBoundsByScaleId: PropTypes.func,
  };

  static defaultProps = {
    legend: {
      display: true,
      position: "bottom",
    },
    type: "doughnut",
    height: 150,
    width: 300,
    redraw: false,
    options: {},
    zoomOptions: { mode: "xy", enabled: true, sensitivity: 3, speed: 0.1 },
    panOptions: { mode: "xy", enabled: true, speed: 20, threshold: 10 },
  };

  componentDidMount() {
    const { type, data, options } = this.props;
    // $FlowFixMe
    if (!this.canvas.transferControlToOffscreen) {
      // TODO add fallback.
      throw new Error("ReactChartJS currently only works with browsers with offscreen canvas support");
    }

    this._setupPanAndPinchHandlers();

    // $FlowFixMe
    const node = this.canvas.transferControlToOffscreen();
    this._node = node;
    this._worker
      .send("initialize", { node, id: this._id, type, data, options: sanitizeObject(options) }, [node])
      .then((scaleBoundsUpdate) => this._onUpdateScaleBounds(scaleBoundsUpdate));
  }

  componentDidUpdate() {
    if (this.props.redraw) {
      const { type, data, options } = this.props;
      (async () => {
        await this._worker.send("destroy", { id: this._id });
        this._worker
          .send("initialize", {
            id: this._id,
            node: this._node,
            type,
            data: sanitizeObject(data),
            options: sanitizeObject(options),
          })
          .then((scaleBoundsUpdate) => this._onUpdateScaleBounds(scaleBoundsUpdate));
      })();
    } else {
      const { data, options } = this.props;
      this._worker
        .send("update", {
          id: this._id,
          data: sanitizeObject(data),
          options: sanitizeObject(options),
        })
        .then((scaleBoundsUpdate) => this._onUpdateScaleBounds(scaleBoundsUpdate));
    }
  }

  shouldComponentUpdate(nextProps: Props) {
    const { data, type, options, legend, height, width } = this.props;

    if (nextProps.redraw === true) {
      return true;
    }

    if (height !== nextProps.height || width !== nextProps.width) {
      return true;
    }

    if (type !== nextProps.type) {
      return true;
    }

    if (!isEqual(legend, nextProps.legend)) {
      return true;
    }

    if (!isEqual(options, nextProps.options)) {
      return true;
    }

    if (!isEqual(data, nextProps.data)) {
      return true;
    }

    return false;
  }

  componentWillUnmount() {
    this._worker.send("destroy", { id: this._id });
  }

  _ref = (element: ?HTMLCanvasElement) => {
    this.canvas = element;
  };

  getElementAtEvent = async (event: SyntheticMouseEvent<any> | MouseEvent): Promise<HoveredElement[]> => {
    if (!this.canvas) {
      return Promise.resolve([]);
    }

    const boundingRect = this.canvas.getBoundingClientRect();
    if (
      event.clientX < boundingRect.left ||
      event.clientX > boundingRect.right ||
      event.clientY < boundingRect.top ||
      event.clientY > boundingRect.bottom
    ) {
      return Promise.resolve([]);
    }

    const newEvent = {
      native: true,
      x: event.clientX - boundingRect.left,
      y: event.clientY - boundingRect.top,
    };
    return this._worker.send("getElementAtEvent", { id: this._id, event: newEvent });
  };

  // Pan/zoom section

  resetZoom = async () => {
    const scaleBoundsUpdate = await this._worker.send("resetZoom", { id: this._id });
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
      if (this._currentDeltaX != null && this._currentDeltaY != null) {
        const deltaX = event.deltaX - this._currentDeltaX;
        const deltaY = event.deltaY - this._currentDeltaY;
        this._currentDeltaX = event.deltaX;
        this._currentDeltaY = event.deltaY;
        const scaleBoundsUpdate = await this._worker.send("doPan", {
          id: this._id,
          panOptions: this.props.panOptions,
          deltaX,
          deltaY,
        });
        this._onPanZoom();
        this._onUpdateScaleBounds(scaleBoundsUpdate);
      }
    };

    hammerManager.on("panstart", (event) => {
      this._currentDeltaX = 0;
      this._currentDeltaY = 0;
      hammerPanHandler(event);
    });
    hammerManager.on("panmove", hammerPanHandler);
    hammerManager.on("panend", () => {
      this._currentDeltaX = null;
      this._currentDeltaY = null;
      this._worker.send("resetPanDelta", this._id);
      setTimeout(() => {
        this._panning = false;
      }, 500);
    });

    // TODO: pinch gestures only kind of work right now - the built-in browser pinch zoom takes over if pinch is too
    // aggressive. Figure out why this is happening and fix it. This is almost identical to the original plugin that
    // does not have this problem.
    const handlePinch = async (e) => {
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

      const scaleBoundsUpdate = await this._worker.send("doZoom", {
        id: this._id,
        zoomOptions: this.props.zoomOptions,
        percentZoomX: diff,
        percentZoomY: diff,
        focalPoint: center,
        whichAxesParam: xy,
      });
      this._onPanZoom();
      this._onUpdateScaleBounds(scaleBoundsUpdate);
    };

    hammerManager.on("pinchstart", () => {
      this._currentPinchScaling = 1; // reset tracker
    });
    hammerManager.on("pinch", handlePinch);
    hammerManager.on("pinchend", (e) => {
      handlePinch(e);
      this._currentPinchScaling = 1; // reset
      this._worker.send("resetZoomDelta", { id: this._id });
    });
  }

  _onWheel = async (event: SyntheticWheelEvent<HTMLCanvasElement>) => {
    const { percentZoomX, percentZoomY, focalPoint } = wheelZoomHandler(event, this.props.zoomOptions);
    const scaleBoundsUpdate = await this._worker.send("doZoom", {
      id: this._id,
      zoomOptions: this.props.zoomOptions,
      percentZoomX,
      percentZoomY,
      focalPoint,
      whichAxesParam: "xy",
    });
    this._onPanZoom();
    this._onUpdateScaleBounds(scaleBoundsUpdate);
  };

  _onPanZoom = () => {
    if (this.props.onPanZoom) {
      this.props.onPanZoom();
    }
  };

  _onUpdateScaleBounds = (scaleBoundsUpdate: ScaleBounds[]) => {
    if (this.props.onScaleBoundsUpdate && scaleBoundsUpdate) {
      this.props.onScaleBoundsUpdate(scaleBoundsUpdate);
    }
  };

  render() {
    const { height, width, id } = this.props;

    return <canvas ref={this._ref} height={height} width={width} id={id} onWheel={this._onWheel} />;
  }
}

export default ChartComponent;

export const defaults = Chart.defaults;
export { Chart };
