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
import React, { useState, useRef, useCallback, useEffect } from "react";
import uuid from "uuid";

import { useMessagePipeline } from "../MessagePipeline";
import type { ScaleOptions as ManagerScaleOptions } from "./ChartJSManager";
import ChartJSWorker from "./ChartJSWorker.worker";
import { type ScaleBounds, type ZoomOptions, type PanOptions, wheelZoomHandler } from "./zoomAndPanHelpers";
import { objectValues } from "webviz-core/src/util";
import { getFakeRpcs, type RpcLike } from "webviz-core/src/util/FakeRpc";
import { useDeepMemo, useShallowMemo } from "webviz-core/src/util/hooks";
import supportsOffscreenCanvas from "webviz-core/src/util/supportsOffscreenCanvas";
import WebWorkerManager from "webviz-core/src/util/WebWorkerManager";

const getMainThreadChartJSWorker = () => import(/* webpackChunkName: "main-thread-chartjs" */ "./ChartJSWorker");

export type HoveredElement = any;
export type ScaleOptions = ManagerScaleOptions;

export type ChartCallbacks = $ReadOnly<{|
  canvasRef: $ReadOnly<{ current: ?HTMLCanvasElement }>,
  getElementAtXAxis: (event: SyntheticMouseEvent<any> | MouseEvent) => Promise<?HoveredElement>,
  resetZoom: () => Promise<void>,
|}>;

export type Props = {|
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
  callbacksRef: { current: ?ChartCallbacks },
|};

const devicePixelRatio = window.devicePixelRatio || 1;

const webWorkerManager = new WebWorkerManager(ChartJSWorker, 4);

export const DEFAULT_PROPS = {
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

export default function ChartComponent({
  forceDisableWorkerRendering,
  type,
  data,
  options,
  scaleOptions,
  height = DEFAULT_PROPS.height,
  width = DEFAULT_PROPS.width,
  onScaleBoundsUpdate,
  onPanZoom,
  panOptions = DEFAULT_PROPS.panOptions,
  zoomOptions = DEFAULT_PROPS.zoomOptions,
  onClick: onClickHandler,
  callbacksRef,
}: Props) {
  const [id] = useState<string>(uuid);

  const usingWebWorker = useRef<boolean>(false);
  const chartRpc = useRef<?RpcLike>();
  const canvasRef = useRef<?HTMLCanvasElement>(null);
  const initialized = useRef(false);
  const panning = useRef(false);
  const currentDeltaX = useRef();
  const currentDeltaY = useRef();
  const currentPinchScaling = useRef(1);
  const nodeRef = useRef();

  const getRpc = useCallback(async (): Promise<RpcLike> => {
    if (chartRpc.current) {
      return chartRpc.current;
    }

    if (!forceDisableWorkerRendering && supportsOffscreenCanvas()) {
      // Only use a real chart worker if we support offscreenCanvas.
      const rpc = webWorkerManager.registerWorkerListener(id);
      chartRpc.current = rpc;
      usingWebWorker.current = true;
      return rpc;
    }

    // Otherwise use a fake RPC so that we don't have to maintain two separate APIs.
    const { mainThreadRpc, workerRpc } = getFakeRpcs();
    const { default: MainThreadChartJSWorker } = await getMainThreadChartJSWorker();
    new MainThreadChartJSWorker(workerRpc);
    chartRpc.current = mainThreadRpc;
    usingWebWorker.current = false;
    return mainThreadRpc;
  }, [forceDisableWorkerRendering, id]);

  const sendToRpc = useCallback(async (
    event: string,
    dataToSend: any,
    transferrables?: any[]
  ): Promise<ScaleBounds[]> => {
    const rpc = await getRpc();
    return rpc.send(event, dataToSend, transferrables);
  }, [getRpc]);

  const handleScaleBoundsUpdate = useCallback((scaleBoundsUpdate) => {
    if (onScaleBoundsUpdate && scaleBoundsUpdate) {
      onScaleBoundsUpdate(scaleBoundsUpdate);
    }
  }, [onScaleBoundsUpdate]);

  const handlePanZoom = useCallback((scaleBoundsUpdate) => {
    if (onPanZoom && scaleBoundsUpdate) {
      onPanZoom(scaleBoundsUpdate);
    }
  }, [onPanZoom]);

  const onWheel = useCallback(async (event: SyntheticWheelEvent<HTMLCanvasElement>) => {
    if (!zoomOptions.enabled) {
      return;
    }
    const { percentZoomX, percentZoomY, focalPoint } = wheelZoomHandler(event, zoomOptions);
    const scaleBoundsUpdate = await sendToRpc("doZoom", {
      id,
      zoomOptions,
      percentZoomX,
      percentZoomY,
      focalPoint,
      whichAxesParam: "xy",
    });

    handleScaleBoundsUpdate(scaleBoundsUpdate);
    handlePanZoom(scaleBoundsUpdate);
  }, [zoomOptions, sendToRpc, id, handleScaleBoundsUpdate, handlePanZoom]);

  const onClick = useCallback(async (event: SyntheticMouseEvent<HTMLCanvasElement>) => {
    if (!panning.current && onClickHandler && canvasRef.current) {
      const rect = event.currentTarget.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      const newEvent = { x, y };
      // Since our next call is asynchronous, we have to persist the event so that React doesn't clear it.
      event.persist();
      const datalabel = await sendToRpc("getDatalabelAtEvent", { id, event: newEvent });
      onClickHandler(event, datalabel);
    }
  }, [id, onClickHandler, sendToRpc]);

  const getElementAtXAxis = useCallback(async (
    event: SyntheticMouseEvent<any> | MouseEvent
  ): Promise<?HoveredElement> => {
    if (!canvasRef.current) {
      return Promise.resolve(undefined);
    }

    const boundingRect = canvasRef.current.getBoundingClientRect();
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
    return sendToRpc("getElementAtXAxis", { id, event: newEvent });
  }, [id, sendToRpc]);

  // Pan/zoom section

  const resetZoom = useCallback(async () => {
    const scaleBoundsUpdate = await sendToRpc("resetZoom", { id });
    handleScaleBoundsUpdate(scaleBoundsUpdate);
  }, [handleScaleBoundsUpdate, id, sendToRpc]);

  callbacksRef.current = useShallowMemo({
    canvasRef,
    getElementAtXAxis,
    resetZoom,
  });

  const setupPanAndPinchHandlers = useCallback(() => {
    const { threshold } = panOptions;
    const hammerManager = new Hammer.Manager(canvasRef.current);
    hammerManager.add(new Hammer.Pinch());
    hammerManager.add(new Hammer.Pan({ threshold }));

    const hammerPanHandler = async (event: any) => {
      if (!panOptions.enabled) {
        return;
      }
      if (currentDeltaX.current != null && currentDeltaY.current != null) {
        const deltaX = event.deltaX - currentDeltaX.current;
        const deltaY = event.deltaY - currentDeltaY.current;
        currentDeltaX.current = event.deltaX;
        currentDeltaY.current = event.deltaY;
        const scaleBoundsUpdate = await sendToRpc("doPan", {
          id,
          panOptions,
          deltaX,
          deltaY,
        });
        handlePanZoom(scaleBoundsUpdate);
        handleScaleBoundsUpdate(scaleBoundsUpdate);
      }
    };

    hammerManager.on("panstart", (event) => {
      panning.current = true;
      currentDeltaX.current = 0;
      currentDeltaY.current = 0;
      hammerPanHandler(event);
    });
    hammerManager.on("panmove", hammerPanHandler);
    hammerManager.on("panend", () => {
      currentDeltaX.current = null;
      currentDeltaY.current = null;
      sendToRpc("resetPanDelta", id);
      setTimeout(() => {
        panning.current = false;
      }, 500);
    });

    // TODO: pinch gestures only kind of work right now - the built-in browser pinch zoom takes over if pinch is too
    // aggressive. Figure out why this is happening and fix it. This is almost identical to the original plugin that
    // does not have this problem.
    const handlePinch = async (e) => {
      if (!panOptions.enabled) {
        return;
      }
      const diff = (1 / currentPinchScaling.current) * e.scale;
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
      currentPinchScaling.current = e.scale;

      const scaleBoundsUpdate = await sendToRpc("doZoom", {
        id,
        zoomOptions,
        percentZoomX: diff,
        percentZoomY: diff,
        focalPoint: center,
        whichAxesParam: xy,
      });
      handlePanZoom(scaleBoundsUpdate);
      handleScaleBoundsUpdate(scaleBoundsUpdate);
    };

    hammerManager.on("pinchstart", () => {
      currentPinchScaling.current = 1; // reset tracker
    });
    hammerManager.on("pinch", handlePinch);
    hammerManager.on("pinchend", (e) => {
      handlePinch(e);
      currentPinchScaling.current = 1; // reset
      sendToRpc("resetZoomDelta", { id });
    });
  }, [handlePanZoom, handleScaleBoundsUpdate, id, panOptions, sendToRpc, zoomOptions]);

  // Initialization
  useEffect(() => {
    if (initialized.current) {
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    setupPanAndPinchHandlers();

    let node = canvas;
    if (!forceDisableWorkerRendering && supportsOffscreenCanvas()) {
      // $FlowFixMe
      node = canvas.transferControlToOffscreen();
    }
    initialized.current = true;
    nodeRef.current = node;
    sendToRpc(
      "initialize",
      {
        node,
        id,
        type,
        data,
        options,
        scaleOptions,
        devicePixelRatio,
        width,
        height,
      },
      [node]
    ).then(handleScaleBoundsUpdate);
  }, [
    data,
    forceDisableWorkerRendering,
    handleScaleBoundsUpdate,
    height,
    id,
    onScaleBoundsUpdate,
    options,
    scaleOptions,
    sendToRpc,
    setupPanAndPinchHandlers,
    type,
    width,
  ]);

  const memoizedData = useDeepMemo(data);
  const memoizedOptions = useDeepMemo(options);
  const memoizedScaleOptions = useDeepMemo(scaleOptions);

  const { pauseFrame } = useMessagePipeline(
    useCallback((messagePipeline) => ({ pauseFrame: messagePipeline.pauseFrame }), [])
  );

  // Keep track of playback callbacks in order to resume them in case this
  // component is unmounted during the update step in workers.
  const resumeFrameRefs = useRef({});

  useEffect(() => {
    (async () => {
      if (!initialized.current) {
        return;
      }

      const chartUpdateId = uuid.v4();
      resumeFrameRefs.current[chartUpdateId] = pauseFrame("ReactChartjs");

      const scales = await sendToRpc("update", {
        id,
        data: memoizedData,
        options: memoizedOptions,
        scaleOptions: memoizedScaleOptions,
      });

      // Prevent forwarding scales if the component was unmounted during the update call.
      if (initialized.current) {
        handleScaleBoundsUpdate(scales);
      }

      // Resume frame playback
      const resumeFrame = resumeFrameRefs.current[chartUpdateId];
      resumeFrame();
      delete resumeFrameRefs.current[chartUpdateId];
    })();
  }, [handleScaleBoundsUpdate, id, memoizedData, memoizedOptions, memoizedScaleOptions, pauseFrame, sendToRpc]);

  useEffect(() => {
    const resumeFrameCallbacks = resumeFrameRefs.current;
    return () => {
      // If this component will unmount, resolve any pending playback callback.
      objectValues(resumeFrameCallbacks).forEach((callback) => callback());
      if (chartRpc.current) {
        chartRpc.current.send("destroy", { id });
        chartRpc.current = null;
        if (usingWebWorker.current) {
          webWorkerManager.unregisterWorkerListener(id);
        }
      }
      initialized.current = false;
    };
  }, [id]);

  return (
    <canvas
      ref={canvasRef}
      height={height / devicePixelRatio}
      width={width / devicePixelRatio}
      id={id}
      onWheel={onWheel}
      onClick={onClick}
      style={{ width, height }}
    />
  );
}
