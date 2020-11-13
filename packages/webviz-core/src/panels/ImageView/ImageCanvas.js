// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import MagnifyIcon from "@mdi/svg/svg/magnify.svg";
import cx from "classnames";
import isEqual from "lodash/isEqual";
import omit from "lodash/omit";
import panzoom from "panzoom";
import React from "react";
import OutsideClickHandler from "react-outside-click-handler";
import ReactResizeDetector from "react-resize-detector";
import shallowequal from "shallowequal";
import styled from "styled-components";
import uuid from "uuid";

import styles from "./ImageCanvas.module.scss";
import ImageCanvasWorker from "./ImageCanvas.worker";
import type { ImageViewPanelHooks, Config, SaveImagePanelConfig } from "./index";
import { renderImage } from "./renderImage";
import { checkOutOfBounds, type Dimensions } from "./util";
import ContextMenu from "webviz-core/src/components/ContextMenu";
import KeyListener from "webviz-core/src/components/KeyListener";
import Menu, { Item } from "webviz-core/src/components/Menu";
import type { Message, Topic } from "webviz-core/src/players/types";
import colors from "webviz-core/src/styles/colors.module.scss";
import type { CameraInfo } from "webviz-core/src/types/Messages";
import { downloadFiles } from "webviz-core/src/util";
import debouncePromise from "webviz-core/src/util/debouncePromise";
import type Rpc from "webviz-core/src/util/Rpc";
import sendNotification from "webviz-core/src/util/sendNotification";
import supportsOffscreenCanvas from "webviz-core/src/util/supportsOffscreenCanvas";
import WebWorkerManager from "webviz-core/src/util/WebWorkerManager";

type OnFinishRenderImage = () => void;
type Props = {|
  topic: ?Topic,
  image: ?Message,
  rawMarkerData: {|
    markers: Message[],
    scale: number,
    transformMarkers: boolean,
    cameraInfo: ?CameraInfo,
  |},
  panelHooks?: ImageViewPanelHooks,
  config: Config,
  saveConfig: SaveImagePanelConfig,
  onStartRenderImage: () => OnFinishRenderImage,
  useMainThreadRenderingForTesting?: boolean,
|};

type State = {|
  error: ?Error,
  openZoomChart: boolean,
|};

const SErrorMessage = styled.div`
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  position: absolute;
  align-items: center;
  justify-content: center;
  color: ${colors.red};
`;

const MAX_ZOOM_PERCENTAGE = 150;
const ZOOM_STEP = 5;

const webWorkerManager = new WebWorkerManager(ImageCanvasWorker, 1);

type CanvasRenderer =
  | {|
      type: "rpc",
      // This is nullable because we destroy the worker whenever we unmount and recreate it if we remount.
      worker: ?Rpc,
    |}
  | {|
      type: "mainThread",
    |};

export default class ImageCanvas extends React.Component<Props, State> {
  _canvasRef = React.createRef<HTMLCanvasElement>();
  _divRef = React.createRef<HTMLElement>();
  _id: string;
  _canvasRenderer: CanvasRenderer;
  state = {
    error: undefined,
    openZoomChart: false,
  };

  constructor(props: Props) {
    super(props);
    this._id = uuid.v4();
    // If we support offscreen canvas, use the ImageCanvasWorker because it improves performance by moving canvas
    // operations off of the main thread. Allow an override for testing / stories.
    this._canvasRenderer =
      !supportsOffscreenCanvas() || props.useMainThreadRenderingForTesting
        ? { type: "mainThread" }
        : { type: "rpc", worker: webWorkerManager.registerWorkerListener(this._id) };
  }

  // Returns the existing RPC worker, or initializes one if it doesn't exist yet.
  _getRpcWorker = (): Rpc => {
    const canvasRenderer = this._canvasRenderer;
    if (canvasRenderer.type === "rpc") {
      // Create the worker if it hasn't been initialized yet.
      const worker = canvasRenderer.worker || webWorkerManager.registerWorkerListener(this._id);
      if (!canvasRenderer.worker) {
        canvasRenderer.worker = worker;
      }
      return worker;
    }
    throw new Error("_getRpcWorker can only be called with canvasRenderer type rpc");
  };

  _setCanvasRef = (canvas: ?HTMLCanvasElement) => {
    if (canvas) {
      this.loadZoomFromConfig();
      if (this._canvasRenderer.type === "rpc") {
        const worker = this._getRpcWorker();
        // $FlowFixMe This is a function that is not yet in Flow.
        const transferableCanvas = canvas.transferControlToOffscreen();
        worker.send<void>("initialize", { id: this._id, canvas: transferableCanvas }, [transferableCanvas]);
      }
      this._canvasRef.current = canvas;
    }
  };

  panZoomCanvas: any = null;
  bitmapDimensions: Dimensions = { width: 0, height: 0 };

  keepInBounds = (div: HTMLElement) => {
    const { x, y, scale } = this.panZoomCanvas.getTransform();
    if (isNaN(x) || isNaN(y)) {
      sendNotification("Tried to keep canvas in bounds but encountered invalid transform values", "", "app", "warn");
      return;
    }
    // When zoom is 1, the percentage is fitPercentage
    // (fitPercent * scale) / 100) is the zoomScale for now
    const updatedPercentage = scale * 100;
    const rect = div.getBoundingClientRect();
    const { width, height } = rect;
    const offset = checkOutOfBounds(
      x,
      y,
      width,
      height,
      // calculate the true width and height of image right now
      (this.bitmapDimensions.width * updatedPercentage) / 100,
      (this.bitmapDimensions.height * updatedPercentage) / 100
    );
    this.props.saveConfig({ mode: "other", offset, zoomPercentage: updatedPercentage });
    if (offset[0] !== x || offset[1] !== y) {
      this.panZoomCanvas.moveTo(offset[0], offset[1]);
    }
  };

  createPanZoom = () => {
    const canvas = this._canvasRef.current;
    const div = this._divRef.current;
    if (canvas && div) {
      this.panZoomCanvas = panzoom(canvas, {
        maxZoom: 1.5,
        minZoom: 0,
        zoomSpeed: 0.05,
        smoothScroll: false,
        filterKey(_e, _dx, _dy, _dz) {
          // don't let panzoom handle keyboard event
          // because zoom in and out has the wrong offset change
          // left right up and down is different what we use in our daily life
          return true;
        },
      });
      this.panZoomCanvas.on("zoom", (_e) => {
        const { scale } = this.panZoomCanvas.getTransform();
        const minPercent = this.fitPercent() * 0.8;
        if (scale < minPercent / 100) {
          this.goToTargetPercentage(minPercent);
        }
        this.keepInBounds(div);
      });
      this.panZoomCanvas.on("pan", (_e) => this.keepInBounds(div));
    }
  };

  getImageViewport = () => {
    const div = this._divRef.current;

    if (!div) {
      throw new Error("Don't have div to get width and height");
    }
    return { imageViewportWidth: div.offsetWidth, imageViewportHeight: div.offsetHeight };
  };

  moveToCenter = () => {
    if (!this.panZoomCanvas) {
      sendNotification("Tried to center when there is no panZoomCanvas", "", "app", "error");
      return;
    }
    const { width, height } = this.bitmapDimensions;
    const { imageViewportWidth, imageViewportHeight } = this.getImageViewport();
    this.panZoomCanvas.moveTo(
      (imageViewportWidth - (width * imageViewportHeight) / height) / 2,
      (imageViewportHeight - (height * imageViewportWidth) / width) / 2
    );
  };

  fitPercent = () => {
    const { width, height } = this.bitmapDimensions;
    const { imageViewportWidth, imageViewportHeight } = this.getImageViewport();
    return Math.min(imageViewportWidth / width, imageViewportHeight / height) * 100;
  };

  fillPercent = () => {
    const { width, height } = this.bitmapDimensions;
    const { imageViewportWidth, imageViewportHeight } = this.getImageViewport();
    return Math.max(imageViewportWidth / width, imageViewportHeight / height) * 100;
  };

  loadZoomFromConfig = () => {
    if (this.panZoomCanvas) {
      return;
    }
    this.createPanZoom();
    this.applyPanZoom();
  };

  componentDidMount() {
    this.renderCurrentImage();
    document.addEventListener("visibilitychange", this._onVisibilityChange);
  }

  _onVisibilityChange = () => {
    // HACK: There is a Chrome bug that causes 2d canvas elements to get cleared when the page
    // becomes hidden on certain hardware:
    // https://bugs.chromium.org/p/chromium/issues/detail?id=588434
    // https://bugs.chromium.org/p/chromium/issues/detail?id=591374
    // We can hack around this by forcing a re-render when the page becomes visible again.
    // Ideally we can find a global workaround but we're not sure there is one — can't just
    // twiddle the width/height attribute of the canvas as suggested in one of the comments on
    // a chrome bug; it seems like you really have to redraw the frame from scratch.
    if (document.visibilityState === "visible") {
      this.renderCurrentImage();
    }
  };

  componentWillUnmount() {
    const canvasRenderer = this._canvasRenderer;
    if (canvasRenderer.type === "rpc") {
      // Unset the PRC worker so that we can destroy the worker if it's no longer necessary.
      webWorkerManager.unregisterWorkerListener(this._id);
      canvasRenderer.worker = null;
    }
    document.removeEventListener("visibilitychange", this._onVisibilityChange);
  }

  componentDidUpdate(prevProps: Props) {
    const imageChanged = !shallowequal(prevProps, this.props, (a, b, key) => {
      if (key === "rawMarkerData") {
        return shallowequal(a, b, (innerA, innerB, innerKey) => {
          if (innerKey === "markers") {
            return shallowequal(innerA, innerB);
          } else if (innerKey === "cameraInfo") {
            return isEqual(omit(innerA, "header"), omit(innerB, "header"));
          }
        });
      }
    });
    if (imageChanged) {
      this.renderCurrentImage();
    }
  }

  downloadImage = () => {
    const { topic, image } = this.props;
    const canvas = this._canvasRef.current;

    // satisfy flow
    if (!canvas || !image || !topic) {
      return;
    }

    // context: https://stackoverflow.com/questions/37135417/download-canvas-as-png-in-fabric-js-giving-network-error
    // read the canvas data as an image (png)
    canvas.toBlob((blob) => {
      // name the image the same name as the topic
      // note: the / characters in the file name will be replaced with _
      // by the browser
      // remove the leading / so the image name doesn't start with _
      const topicName = topic.name.slice(1);
      const stamp = image.message.header ? image.message.header.stamp : { sec: 0, nsec: 0 };
      const fileName = `${topicName}-${stamp.sec}-${stamp.nsec}`;
      downloadFiles([{ blob, fileName }]);
    });
  };

  onCanvasRightClick = (e: SyntheticMouseEvent<HTMLCanvasElement>) => {
    e.stopPropagation();
    e.preventDefault();
    return ContextMenu.show(
      e.clientX,
      e.clientY,
      <Menu>
        <Item onClick={this.downloadImage}>Download Image</Item>
      </Menu>
    );
  };

  clickMagnify = () => {
    this.setState((state) => ({ openZoomChart: !state.openZoomChart }));
  };
  onZoomFit = () => {
    const fitPercent = this.fitPercent();
    this.panZoomCanvas.zoomAbs(0, 0, fitPercent / 100);
    this.moveToCenter();
    this.props.saveConfig({ mode: "fit", zoomPercentage: fitPercent });
  };

  onZoomFill = () => {
    const fillPercent = this.fillPercent();
    this.panZoomCanvas.zoomAbs(0, 0, fillPercent / 100);
    this.moveToCenter();
    this.props.saveConfig({ mode: "fill", zoomPercentage: fillPercent });
  };

  goToTargetPercentage = (targetPercentage: number) => {
    const { imageViewportWidth, imageViewportHeight } = this.getImageViewport();
    this.panZoomCanvas.zoomAbs(imageViewportWidth / 2, imageViewportHeight / 2, targetPercentage / 100);
  };

  onZoomMinus = () => {
    const { zoomPercentage } = this.props.config;
    const targetPercentage = Math.max((zoomPercentage || 100) - ZOOM_STEP, this.fitPercent() * 0.8);
    this.goToTargetPercentage(targetPercentage);
  };

  onZoomPlus = () => {
    const { zoomPercentage } = this.props.config;
    const targetPercentage = Math.min((zoomPercentage || 100) + ZOOM_STEP, MAX_ZOOM_PERCENTAGE);
    this.goToTargetPercentage(targetPercentage);
  };

  renderCurrentImage = debouncePromise(async () => {
    const { image, topic, rawMarkerData, onStartRenderImage } = this.props;
    if (!topic) {
      return;
    }

    const onFinishImageRender = onStartRenderImage();
    try {
      let dimensions;
      const canvasRenderer = this._canvasRenderer;
      if (canvasRenderer.type === "rpc") {
        const worker = this._getRpcWorker();
        dimensions = await worker.send<?Dimensions>("renderImage", {
          id: this._id,
          imageMessage: image,
          imageMessageDatatype: topic.datatype,
          rawMarkerData,
        });
      } else {
        dimensions = await renderImage({
          canvas: this._canvasRef.current,
          imageMessage: image,
          imageMessageDatatype: topic.datatype,
          rawMarkerData,
        });
      }

      if (dimensions) {
        this.bitmapDimensions = dimensions;
        this.loadZoomFromConfig();
      }
      if (this.state.error) {
        this.setState({ error: undefined });
      }
    } catch (error) {
      console.error(error);
      sendNotification(`failed to decode image on ${image?.topic || ""}:`, "", "user", "error");
      this.setState({ error });
    } finally {
      onFinishImageRender();
    }
  });

  renderZoomChart = () => {
    return this.state.openZoomChart ? (
      <div className={styles.zoomChart} data-zoom-menu>
        <div className={cx(styles.menuItem, styles.notInteractive)}>Use mousewheel or buttons to zoom</div>
        <div className={cx(styles.menuItem, styles.borderBottom)}>
          <button className={styles.round} onClick={this.onZoomMinus} data-panel-minus-zoom>
            -
          </button>
          <span>{`${(this.props.config.zoomPercentage || 100).toFixed(1)}%`}</span>
          <button className={styles.round} onClick={this.onZoomPlus} data-panel-add-zoom>
            +
          </button>
        </div>
        <Item className={styles.borderBottom} onClick={() => this.goToTargetPercentage(100)} dataTest={"hundred-zoom"}>
          Zoom to 100%
        </Item>
        <Item className={styles.borderBottom} onClick={this.onZoomFit} dataTest={"fit-zoom"}>
          Zoom to fit
        </Item>
        <Item onClick={this.onZoomFill} dataTest={"fill-zoom"}>
          Zoom to fill
        </Item>
      </div>
    ) : null;
  };

  applyPanZoom = () => {
    if (!this.panZoomCanvas) {
      return;
    }

    const { imageViewportHeight, imageViewportWidth } = this.getImageViewport();
    if (!imageViewportHeight || !imageViewportWidth) {
      // While dragging, the viewport may have zero height or width, which throws off the panZoomCanvas
      return;
    }

    const { mode, zoomPercentage, offset } = this.props.config;
    if (!mode || mode === "fit") {
      this.onZoomFit();
    } else if (mode === "fill") {
      this.onZoomFill();
    } else if (mode === "other") {
      // Go to prevPercentage
      this.goToTargetPercentage(zoomPercentage || 100);
      this.panZoomCanvas.moveTo(offset ? offset[0] : 0, offset ? offset[1] : 0);
    }
  };

  keyDownHandlers = {
    "=": () => {
      this.onZoomPlus();
    },
    "-": () => {
      this.onZoomMinus();
    },
    "1": (e: KeyboardEvent) => {
      if (e.metaKey) {
        this.goToTargetPercentage(10);
      }
    },
    "2": (e: KeyboardEvent) => {
      if (e.metaKey) {
        this.goToTargetPercentage(20);
      }
    },
    "3": (e: KeyboardEvent) => {
      if (e.metaKey) {
        this.goToTargetPercentage(30);
      }
    },
    "4": (e: KeyboardEvent) => {
      if (e.metaKey) {
        this.goToTargetPercentage(40);
      }
    },
    "5": (e: KeyboardEvent) => {
      if (e.metaKey) {
        this.goToTargetPercentage(50);
      }
    },
    "6": (e: KeyboardEvent) => {
      if (e.metaKey) {
        this.goToTargetPercentage(60);
      }
    },
    "7": (e: KeyboardEvent) => {
      if (e.metaKey) {
        this.goToTargetPercentage(70);
      }
    },
    "8": (e: KeyboardEvent) => {
      if (e.metaKey) {
        this.goToTargetPercentage(80);
      }
    },
    "9": (e: KeyboardEvent) => {
      if (e.metaKey) {
        this.goToTargetPercentage(90);
      }
    },
    "0": (e: KeyboardEvent) => {
      if (e.metaKey) {
        this.goToTargetPercentage(100);
      }
    },
  };

  render() {
    const { mode, zoomPercentage, offset } = this.props.config;
    if (zoomPercentage && (zoomPercentage > 150 || zoomPercentage < 0)) {
      sendNotification(
        `zoomPercentage for the image panel was ${zoomPercentage}, but must be between 0 and 150. It has been reset to 100.`,
        "",
        "user",
        "warn"
      );
      this.props.saveConfig({ zoomPercentage: 100 });
    }
    if (offset && offset.length !== 2) {
      sendNotification(
        `offset for the image panel was ${JSON.stringify(
          offset
        )}, but should be an array of length 2. It has been reset to [0, 0].`,
        "",
        "user",
        "warn"
      );
      this.props.saveConfig({ offset: [0, 0] });
    }
    return (
      <ReactResizeDetector handleWidth handleHeight onResize={this.applyPanZoom}>
        <div className={styles.root} ref={this._divRef}>
          <KeyListener keyDownHandlers={this.keyDownHandlers} />
          <div>
            {this.state.error && <SErrorMessage>Error: {this.state.error.message}</SErrorMessage>}
            <canvas onContextMenu={this.onCanvasRightClick} ref={this._setCanvasRef} className={styles.canvas} />
          </div>
          <OutsideClickHandler
            onOutsideClick={() => {
              this.setState({ openZoomChart: false });
            }}>
            {this.renderZoomChart()}
            <button className={styles.magnify} onClick={this.clickMagnify} data-magnify-icon>
              <MagnifyIcon />{" "}
              {mode === "other" ? <span>{zoomPercentage ? `${zoomPercentage.toFixed(1)}%` : "null"}</span> : null}
            </button>
          </OutsideClickHandler>
        </div>
      </ReactResizeDetector>
    );
  }
}
