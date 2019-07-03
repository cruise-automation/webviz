// @flow
//
//  Copyright (c) 2018-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { isEqual, omit } from "lodash";
import React from "react";

import CameraModel from "./CameraModel";
import { decodeYUV, decodeBGR, decodeFloat1c, decodeRGGB, decodeMono8, decodeMono16 } from "./decodings";
import styles from "./ImageCanvas.module.scss";
import { type ImageViewPanelHooks } from "./index";
import ContextMenu from "webviz-core/src/components/ContextMenu";
import Menu, { Item } from "webviz-core/src/components/Menu";
import { getGlobalHooks } from "webviz-core/src/loadWebviz";
import type { ImageMarker, CameraInfo, Color } from "webviz-core/src/types/Messages";
import type { Message } from "webviz-core/src/types/players";

type Props = {
  topic: string,
  image: ?Message,
  cameraInfo: ?CameraInfo,
  markers: Message[],
  panelHooks?: ImageViewPanelHooks,
  transformMarkers: boolean,
};

type State = {
  cameraModel: ?CameraModel,
  prevCameraInfo: ?CameraInfo,
  prevTransformMarkers: boolean,
};

function toRGBA(color: Color) {
  const { r, g, b, a } = color;
  return `rgba(${r}, ${g}, ${b}, ${a || 1})`;
}

export default class ImageCanvas extends React.Component<Props, State> {
  _canvasRef = React.createRef<HTMLCanvasElement>();
  _ready: boolean = true;
  _droppedFrame: boolean = false;

  static defaultProps = {
    markers: [],
  };

  state = { cameraModel: null, prevCameraInfo: null, prevTransformMarkers: false };

  static getDerivedStateFromProps({ cameraInfo, topic, transformMarkers }: Props, prevState: State) {
    if (!cameraInfo && prevState.prevCameraInfo) {
      return {
        prevCameraInfo: cameraInfo,
        cameraModel: null,
        transformMarkers: false,
      };
    }
    // only reset the cameraModel when cameraInfo or transformMarkers change
    if (
      cameraInfo &&
      (transformMarkers !== prevState.prevTransformMarkers ||
        cameraInfo !== prevState.prevCameraInfo ||
        (!prevState.prevCameraInfo || !isEqual(omit(cameraInfo, "header"), omit(prevState.prevCameraInfo, "header"))))
    ) {
      return {
        prevTransformMarkers: transformMarkers,
        prevCameraInfo: cameraInfo,
        cameraModel: new CameraModel(cameraInfo, transformMarkers),
      };
    }

    return null;
  }

  decodeMessageToBitmap = async (msg: any): Promise<?ImageBitmap> => {
    let image: ImageData | Image | Blob | void;
    const { data: rawData } = msg.message;
    if (rawData instanceof Uint8Array) {
      // Binary message processing
      if (msg.datatype === "sensor_msgs/Image") {
        const { width, height, is_bigendian, encoding } = msg.message;
        image = new ImageData(width, height);
        // prettier-ignore
        switch (encoding) {
          case "yuv422": decodeYUV(rawData, width, height, image.data); break;
          case "bgr8": decodeBGR(rawData, width, height, image.data); break;
          case "32FC1": decodeFloat1c(rawData, width, height, is_bigendian, image.data); break;
          case "bayer_rggb8": decodeRGGB(rawData, width, height, image.data); break;
          case "mono8":
          case "8UC1":
            decodeMono8(rawData, width, height, image.data); break;
          case "mono16":
          case "16UC1":
            decodeMono16(rawData, width, height, is_bigendian, image.data); break;
          default: break;

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

  paintBitmap = (bitmap: ?ImageBitmap) => {
    const { cameraInfo: info } = this.props;
    const { cameraModel } = this.state;
    const canvas = this._canvasRef.current;
    const cameraModelWithInitializedData = cameraModel && cameraModel.initializedData ? cameraModel : null;

    if (!canvas) {
      return;
    }
    if (!bitmap) {
      this.clearCanvas();
      return;
    }
    const ctx = canvas.getContext("2d");
    if (info && info.width && info.height) {
      this.resizeCanvas(info.width, info.height);
      ctx.save();
      ctx.scale(info.width / bitmap.width, info.height / bitmap.height);
      ctx.drawImage(bitmap, 0, 0);
      ctx.restore();
      ctx.save();
      if (cameraModelWithInitializedData) {
        this.paintMarkers(ctx, cameraModelWithInitializedData);
        ctx.restore();
      }
    } else {
      this.resizeCanvas(bitmap.width, bitmap.height);
      ctx.drawImage(bitmap, 0, 0);
    }
    bitmap.close();
  };

  paintMarkers(ctx: CanvasRenderingContext2D, cameraModel: CameraModel) {
    const { markers } = this.props;
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

  paintMarker(ctx: CanvasRenderingContext2D, marker: ImageMarker, cameraModel: CameraModel) {
    switch (marker.type) {
      case 0: {
        // CIRCLE
        ctx.beginPath();
        const { x, y } = cameraModel.maybeUnrectifyPoint(marker.position);
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
          const { x: x1, y: y1 } = cameraModel.maybeUnrectifyPoint(marker.points[i]);
          const { x: x2, y: y2 } = cameraModel.maybeUnrectifyPoint(marker.points[i + 1]);
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
        const { x, y } = cameraModel.maybeUnrectifyPoint(marker.points[0]);
        ctx.moveTo(x, y);
        for (let i = 1; i < marker.points.length; i++) {
          const { x, y } = cameraModel.maybeUnrectifyPoint(marker.points[i]);
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
            const { x, y } = cameraModel.maybeUnrectifyPoint(marker.points[i]);
            ctx.fillStyle = toRGBA(marker.outline_colors[i]);
            ctx.beginPath();
            ctx.arc(x, y, size, 0, 2 * Math.PI);
            ctx.fill();
          }
        } else {
          ctx.beginPath();
          for (let i = 0; i < marker.points.length; i++) {
            const { x, y } = cameraModel.maybeUnrectifyPoint(marker.points[i]);
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
        const { x, y } = cameraModel.maybeUnrectifyPoint(marker.position);

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

  shouldComponentUpdate(nextProps: Props) {
    return (
      nextProps.transformMarkers !== this.props.transformMarkers ||
      // shallow equality to avoid comparing image data
      nextProps.image !== this.props.image ||
      // deep equality since camera info is re-published but never actually changes
      !isEqual(nextProps.cameraInfo, this.props.cameraInfo) ||
      // shallow equality because marker list may be rebuilt with the same markers
      nextProps.markers.length !== this.props.markers.length ||
      nextProps.markers.some((marker, i) => marker !== this.props.markers[i])
    );
  }

  componentDidUpdate(prevProps: Props) {
    this.renderCurrentImage();
  }

  downloadImage = () => {
    const { topic, image } = this.props;
    const canvas = this._canvasRef.current;
    const { body } = document;

    // satisfy flow
    if (!body || !canvas || !image) {
      return;
    }

    // context: https://stackoverflow.com/questions/37135417/download-canvas-as-png-in-fabric-js-giving-network-error
    // create a link element to download data
    const link = document.createElement("a");
    // read the canvas data as an image (png)
    canvas.toBlob((blob) => {
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      // name the image the same name as the topic
      // note: the / characters in the file name will be replaced with _
      // by the browser
      // remove the leading / so the image name doesn't start with _
      const topicName = topic.slice(1);
      const stamp = image.message.header ? image.message.header.stamp : { sec: 0, nsec: 0 };
      const filename = `${topicName}-${stamp.sec}-${stamp.nsec}`;
      link.setAttribute("download", filename);
      link.style.display = "none";
      body.appendChild(link);
      // click the link to trigger a download
      link.click();
      window.requestAnimationFrame(() => {
        // remove the link after triggering download
        body.removeChild(link);
        URL.revokeObjectURL(url);
      });
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

  renderCurrentImage() {
    if (!this._ready) {
      console.warn("Dropped frame on image canvas");
      this._droppedFrame = true;
      return;
    }

    const { image } = this.props;
    if (!image) {
      this.clearCanvas();
      return;
    }

    this._ready = false;
    this._droppedFrame = false;

    this.decodeMessageToBitmap(image)
      .then((bitmap) => {
        this.paintBitmap(bitmap);
        this._ready = true;
        if (this._droppedFrame) {
          console.warn("Retrying render of dropped frame");
          this.renderCurrentImage();
          this._droppedFrame = false;
        }
      })
      .catch((err) => {
        console.warn(`failed to decode image on ${image.topic}:`, err);
        this.clearCanvas();
        this._ready = true;
      });
  }

  render() {
    return <canvas onContextMenu={this.onCanvasRightClick} ref={this._canvasRef} className={styles.canvas} />;
  }
}
