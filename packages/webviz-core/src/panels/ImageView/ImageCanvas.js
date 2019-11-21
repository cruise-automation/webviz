// @flow
//
//  Copyright (c) 2018-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import MagnifyIcon from "@mdi/svg/svg/magnify.svg";
import cx from "classnames";
import panzoom from "panzoom";
import React from "react";
import KeyListener from "react-key-listener";
import OutsideClickHandler from "react-outside-click-handler";
import ReactResizeDetector from "react-resize-detector";
import shallowequal from "shallowequal";
import styled from "styled-components";

import CameraModel from "./CameraModel";
import {
  decodeYUV,
  decodeRGB8,
  decodeBGR8,
  decodeFloat1c,
  decodeBayerRGGB8,
  decodeBayerBGGR8,
  decodeBayerGBRG8,
  decodeBayerGRBG8,
  decodeMono8,
  decodeMono16,
} from "./decodings";
import styles from "./ImageCanvas.module.scss";
import type { ImageViewPanelHooks, Config, SaveConfig } from "./index";
import { checkOutOfBounds } from "./util";
import ContextMenu from "webviz-core/src/components/ContextMenu";
import Menu, { Item } from "webviz-core/src/components/Menu";
import { getGlobalHooks } from "webviz-core/src/loadWebviz";
import type { Message } from "webviz-core/src/players/types";
import colors from "webviz-core/src/styles/colors.module.scss";
import type { ImageMarker, Color, Point } from "webviz-core/src/types/Messages";
import { downloadFiles } from "webviz-core/src/util";
import debouncePromise from "webviz-core/src/util/debouncePromise";
import reportError from "webviz-core/src/util/reportError";

type Props = {|
  topic: string,
  image: ?Message,
  markerData: ?{|
    markers: Message[],
    originalWidth: ?number, // null means no scaling is needed (use the image's size)
    originalHeight: ?number, // null means no scaling is needed (use the image's size)
    cameraModel: ?CameraModel, // null means no transformation is needed
  |},
  panelHooks?: ImageViewPanelHooks,
  config: Config,
  saveConfig: SaveConfig,
|};

type State = {|
  error: ?Error,
  openZoomChart: boolean,
|};

function toRGBA(color: Color) {
  const { r, g, b, a } = color;
  return `rgba(${r}, ${g}, ${b}, ${a || 1})`;
}

function maybeUnrectifyPoint(cameraModel: ?CameraModel, point: Point): { x: number, y: number } {
  if (cameraModel) {
    return cameraModel.unrectifyPoint(point);
  }
  return point;
}

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
export default class ImageCanvas extends React.Component<Props, State> {
  _canvasRef = React.createRef<HTMLCanvasElement>();
  _divRef = React.createRef<HTMLElement>();

  state = {
    error: undefined,
    openZoomChart: false,
  };

  panZoomCanvas: any = null;
  bitmapDimensions: { width: number, height: number } = { width: 0, height: 0 };

  decodeMessageToBitmap = async (msg: any): Promise<?ImageBitmap> => {
    let image: ImageData | Image | Blob | void;
    const { data: rawData, is_bigendian } = msg.message;
    if (rawData instanceof Uint8Array) {
      // Binary message processing
      if (msg.datatype === "sensor_msgs/Image") {
        const { width, height, encoding } = msg.message;
        image = new ImageData(width, height);
        // prettier-ignore
        switch (encoding) {
          case "yuv422": decodeYUV(rawData, width, height, image.data); break;
          case "rgb8": decodeRGB8(rawData, width, height, image.data); break;
          case "bgr8": decodeBGR8(rawData, width, height, image.data); break;
          case "32FC1": decodeFloat1c(rawData, width, height, is_bigendian, image.data); break;
          case "bayer_rggb8": decodeBayerRGGB8(rawData, width, height, image.data); break;
          case "bayer_bggr8": decodeBayerBGGR8(rawData, width, height, image.data); break;
          case "bayer_gbrg8": decodeBayerGBRG8(rawData, width, height, image.data); break;
          case "bayer_grbg8": decodeBayerGRBG8(rawData, width, height, image.data); break;
          case "mono8":
          case "8UC1":
              decodeMono8(rawData, width, height, image.data); break;
          case "mono16":
          case "16UC1":
              decodeMono16(rawData, width, height, is_bigendian, image.data); break;
          default:
            throw new Error(`Unsupported encoding ${encoding}`);
        }
      } else if (msg.datatype === "sensor_msgs/CompressedImage") {
        image = new Blob([rawData], { type: `image/${msg.message.format}` });
      }
    } else {
      image = new Image();
      image.src = `data:image/png;base64,${rawData}`;
      const imageElement = image; // for flow
      await new Promise((resolve, reject) => {
        imageElement.onload = resolve;
        imageElement.onerror = reject;
      });
    }

    if (image) {
      return self.createImageBitmap(image);
    }
  };

  clearCanvas = () => {
    const canvas = this._canvasRef.current;
    if (!canvas) {
      return;
    }
    canvas.getContext("2d").clearRect(0, 0, canvas.width, canvas.height);
  };

  resizeCanvas = (width: number, height: number) => {
    const canvas = this._canvasRef.current;
    if (canvas && (canvas.width !== width || canvas.height !== height)) {
      canvas.width = width;
      canvas.height = height;
    }
  };

  keepInBounds = (div: HTMLElement) => {
    const { x, y, scale } = this.panZoomCanvas.getTransform();
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
        filterKey(e, dx, dy, dz) {
          // don't let panzoom handle keyboard event
          // because zoom in and out has the wrong offset change
          // left right up and down is different what we use in our daily life
          return true;
        },
      });
      this.panZoomCanvas.on("zoom", (e) => {
        const { scale } = this.panZoomCanvas.getTransform();
        const minPercent = this.fitPercent() * 0.8;
        if (scale < minPercent / 100) {
          this.goToTargetPercentage(minPercent);
        }
        this.keepInBounds(div);
      });
      this.panZoomCanvas.on("pan", (e) => this.keepInBounds(div));
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
      console.warn("Tried to center when there is no panZoomCanvas");
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

  paintBitmap = (bitmap: ?ImageBitmap) => {
    const { markerData } = this.props;
    const canvas = this._canvasRef.current;
    const div = this._divRef.current;

    if (!div || !canvas) {
      return;
    }
    if (!bitmap) {
      this.clearCanvas();
      return;
    }
    this.bitmapDimensions = { width: bitmap.width, height: bitmap.height };
    const ctx = canvas.getContext("2d");
    if (!markerData) {
      this.resizeCanvas(bitmap.width, bitmap.height);
      this.loadZoomFromConfig();
      ctx.transform(1, 0, 0, 1, 0, 0);
      ctx.drawImage(bitmap, 0, 0);
      return;
    }

    const { markers, cameraModel } = markerData;
    let { originalWidth, originalHeight } = markerData;
    if (originalWidth == null) {
      originalWidth = bitmap.width;
    }
    if (originalHeight == null) {
      originalHeight = bitmap.height;
    }

    this.bitmapDimensions = { width: originalWidth, height: originalHeight };
    this.resizeCanvas(originalWidth, originalHeight);
    this.loadZoomFromConfig();
    ctx.save();
    ctx.scale(originalWidth / bitmap.width, originalHeight / bitmap.height);
    ctx.drawImage(bitmap, 0, 0);
    ctx.restore();
    ctx.save();
    try {
      this.paintMarkers(ctx, markers, cameraModel);
    } catch (err) {
      console.warn("error painting markers:", err);
    } finally {
      ctx.restore();
    }
  };

  paintMarkers(ctx: CanvasRenderingContext2D, markers: Message[], cameraModel: ?CameraModel) {
    const imageViewHooks = this.props.panelHooks || getGlobalHooks().perPanelHooks().ImageView;

    for (const msg of markers) {
      ctx.save();
      if (imageViewHooks.imageMarkerArrayDatatypes.includes(msg.datatype)) {
        for (const marker of msg.message.markers) {
          this.paintMarker(ctx, marker, cameraModel);
        }
      } else if (imageViewHooks.imageMarkerDatatypes.includes(msg.datatype)) {
        this.paintMarker(ctx, msg.message, cameraModel);
      } else {
        console.warn("unrecognized image marker datatype", msg);
      }
      ctx.restore();
    }
  }

  paintMarker(ctx: CanvasRenderingContext2D, marker: ImageMarker, cameraModel: ?CameraModel) {
    switch (marker.type) {
      case 0: {
        // CIRCLE
        ctx.beginPath();
        const { x, y } = maybeUnrectifyPoint(cameraModel, marker.position);
        ctx.arc(x, y, marker.scale, 0, 2 * Math.PI);
        if (marker.thickness <= 0) {
          ctx.fillStyle = toRGBA(marker.outline_color);
          ctx.fill();
        } else {
          ctx.lineWidth = marker.thickness;
          ctx.strokeStyle = toRGBA(marker.outline_color);
          ctx.stroke();
        }
        break;
      }

      // LINE_LIST
      case 2:
        if (marker.points.length % 2 !== 0) {
          break;
        }
        ctx.strokeStyle = toRGBA(marker.outline_color);
        ctx.lineWidth = marker.thickness;
        for (let i = 0; i < marker.points.length; i += 2) {
          const { x: x1, y: y1 } = maybeUnrectifyPoint(cameraModel, marker.points[i]);
          const { x: x2, y: y2 } = maybeUnrectifyPoint(cameraModel, marker.points[i + 1]);
          ctx.beginPath();
          ctx.moveTo(x1, y1);
          ctx.lineTo(x2, y2);
          ctx.stroke();
        }
        break;

      // LINE_STRIP, POLYGON
      case 1:
      case 3: {
        if (marker.points.length === 0) {
          break;
        }
        ctx.beginPath();
        const { x, y } = maybeUnrectifyPoint(cameraModel, marker.points[0]);
        ctx.moveTo(x, y);
        for (let i = 1; i < marker.points.length; i++) {
          const { x, y } = maybeUnrectifyPoint(cameraModel, marker.points[i]);
          ctx.lineTo(x, y);
        }
        if (marker.type === 3) {
          ctx.closePath();
        }
        if (marker.thickness <= 0) {
          ctx.fillStyle = toRGBA(marker.outline_color);
          ctx.fill();
        } else {
          ctx.strokeStyle = toRGBA(marker.outline_color);
          ctx.lineWidth = marker.thickness;
          ctx.stroke();
        }
        break;
      }

      case 4: {
        // POINTS
        if (marker.points.length === 0) {
          break;
        }

        const size = marker.scale || 4;
        if (marker.outline_colors && marker.outline_colors.length === marker.points.length) {
          for (let i = 0; i < marker.points.length; i++) {
            const { x, y } = maybeUnrectifyPoint(cameraModel, marker.points[i]);
            ctx.fillStyle = toRGBA(marker.outline_colors[i]);
            ctx.beginPath();
            ctx.arc(x, y, size, 0, 2 * Math.PI);
            ctx.fill();
          }
        } else {
          ctx.beginPath();
          for (let i = 0; i < marker.points.length; i++) {
            const { x, y } = maybeUnrectifyPoint(cameraModel, marker.points[i]);
            ctx.arc(x, y, size, 0, 2 * Math.PI);
            ctx.closePath();
          }
          ctx.fillStyle = toRGBA(marker.fill_color);
          ctx.fill();
        }
        break;
      }

      case 5: {
        // TEXT (our own extension on visualization_msgs/Marker)
        const { x, y } = maybeUnrectifyPoint(cameraModel, marker.position);

        const fontSize = marker.scale * 12;
        const padding = 4 * marker.scale;
        ctx.font = `${fontSize}px sans-serif`;
        ctx.textBaseline = "bottom";
        if (marker.filled) {
          const metrics = ctx.measureText(marker.text.data);
          const height = fontSize * 1.2; // Chrome doesn't yet support height in TextMetrics
          ctx.fillStyle = toRGBA(marker.fill_color);
          ctx.fillRect(x, y - height, Math.ceil(metrics.width + 2 * padding), Math.ceil(height));
        }
        ctx.fillStyle = toRGBA(marker.outline_color);
        ctx.fillText(marker.text.data, x + padding, y);
        break;
      }

      default:
        console.warn("unrecognized image marker type", marker);
    }
  }

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
    document.removeEventListener("visibilitychange", this._onVisibilityChange);
  }

  componentDidUpdate(prevProps: Props) {
    const imageChanged = !shallowequal(prevProps, this.props, (a, b, key) => {
      if (key === "markerData") {
        return shallowequal(a, b, (a, b, key) => {
          if (key === "markers") {
            return shallowequal(a, b);
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
    if (!canvas || !image) {
      return;
    }

    // context: https://stackoverflow.com/questions/37135417/download-canvas-as-png-in-fabric-js-giving-network-error
    // read the canvas data as an image (png)
    canvas.toBlob((blob) => {
      // name the image the same name as the topic
      // note: the / characters in the file name will be replaced with _
      // by the browser
      // remove the leading / so the image name doesn't start with _
      const topicName = topic.slice(1);
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
    const { image } = this.props;
    if (!image) {
      this.clearCanvas();
      return;
    }

    try {
      const bitmap = await this.decodeMessageToBitmap(image);
      this.paintBitmap(bitmap);
      if (bitmap) {
        bitmap.close();
      }
      if (this.state.error) {
        this.setState({ error: undefined });
      }
    } catch (error) {
      console.warn(`failed to decode image on ${image.topic}:`, error);
      this.clearCanvas();
      this.setState({ error });
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
    if (this.panZoomCanvas) {
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
      reportError(
        `zoomPercentage for the image panel was ${zoomPercentage}, but must be between 0 and 150. It has been reset to 100.`,
        "",
        "user"
      );
      this.props.saveConfig({ zoomPercentage: 100 });
    }
    if (offset && offset.length !== 2) {
      reportError(
        `offset for the image panel was ${JSON.stringify(
          offset
        )}, but should be an array of length 2. It has been reset to [0, 0].`,
        "",
        "user"
      );
      this.props.saveConfig({ offset: [0, 0] });
    }
    return (
      <ReactResizeDetector handleWidth handleHeight onResize={this.applyPanZoom}>
        <div className={styles.root} ref={this._divRef}>
          <KeyListener keyDownHandlers={this.keyDownHandlers} />
          <div>
            {this.state.error && <SErrorMessage>Error: {this.state.error.message}</SErrorMessage>}
            <canvas onContextMenu={this.onCanvasRightClick} ref={this._canvasRef} className={styles.canvas} />
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
