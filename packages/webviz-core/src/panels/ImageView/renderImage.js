// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

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
import { buildMarkerData, type Dimensions, type RawMarkerData, type MarkerData, type OffscreenCanvas } from "./util";
import type { Message } from "webviz-core/src/players/types";
import type { ImageMarker, Color, Point } from "webviz-core/src/types/Messages";
import sendNotification from "webviz-core/src/util/sendNotification";

// Just globally keep track of if we've shown an error in rendering, since typically when you get
// one error, you'd then get a whole bunch more, which is spammy.
let hasLoggedCameraModelError: boolean = false;

// Given a canvas, an image message, and marker info, render the image to the canvas.
// Nothing in this module should have state.
export async function renderImage({
  canvas,
  imageMessage,
  imageMessageDatatype,
  rawMarkerData,
}: {
  canvas: ?(HTMLCanvasElement | OffscreenCanvas),
  imageMessage: ?Message,
  imageMessageDatatype: ?string,
  rawMarkerData: RawMarkerData,
}): Promise<?Dimensions> {
  if (!canvas) {
    return null;
  }
  if (!imageMessage || !imageMessageDatatype) {
    clearCanvas(canvas);
    return null;
  }
  let markerData = null;
  try {
    markerData = buildMarkerData(rawMarkerData);
  } catch (error) {
    if (!hasLoggedCameraModelError) {
      sendNotification(`Failed to initialize camera model from CameraInfo`, error, "user", "warn");
      hasLoggedCameraModelError = true;
    }
  }

  try {
    const bitmap = await decodeMessageToBitmap(imageMessage, imageMessageDatatype);
    const dimensions = paintBitmap(canvas, bitmap, markerData);
    bitmap.close();
    return dimensions;
  } catch (error) {
    // If there is an error, clear the image and re-throw it.
    clearCanvas(canvas);
    throw error;
  }
}

function toRGBA(color: Color) {
  const { r, g, b, a } = color;
  return `rgba(${r}, ${g}, ${b}, ${a || 1})`;
}

// Note: Return type is inexact -- may contain z.
function maybeUnrectifyPoint(cameraModel: ?CameraModel, point: Point): $ReadOnly<{ x: number, y: number }> {
  if (cameraModel) {
    return cameraModel.unrectifyPoint(point);
  }
  return point;
}

async function decodeMessageToBitmap(msg: Message, datatype: string): Promise<ImageBitmap> {
  let image: ImageData | Image | Blob;
  const { data: rawData, is_bigendian, width, height, encoding } = msg.message;
  if (!(rawData instanceof Uint8Array)) {
    throw new Error("Message must have data of type Uint8Array");
  }

  // In a Websocket context, we don't know whether the message is compressed or
  // raw. Our subscription interface for the WebsocketPlayer can request
  // compressed verisons of topics, in which case the message datatype can
  // differ from the one recorded during initialization. So here we just check
  // for properties consistent with either datatype, and render accordingly.
  if (datatype === "sensor_msgs/Image" && encoding) {
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
  } else if (["sensor_msgs/CompressedImage", "sensor_msgs/Image"].includes(datatype) || msg.message.format) {
    image = new Blob([rawData], { type: `image/${msg.message.format}` });
  } else {
    throw new Error(`Message type is not usable for rendering images.`);
  }

  return self.createImageBitmap(image);
}

function clearCanvas(canvas: ?HTMLCanvasElement) {
  if (canvas) {
    canvas.getContext("2d").clearRect(0, 0, canvas.width, canvas.height);
  }
}

function paintBitmap(canvas: HTMLCanvasElement, bitmap: ImageBitmap, markerData: MarkerData): ?Dimensions {
  let bitmapDimensions = { width: bitmap.width, height: bitmap.height };
  const ctx = canvas.getContext("2d");
  if (!markerData) {
    resizeCanvas(canvas, bitmap.width, bitmap.height);
    ctx.transform(1, 0, 0, 1, 0, 0);
    ctx.drawImage(bitmap, 0, 0);
    return bitmapDimensions;
  }

  const { markers, cameraModel } = markerData;
  let { originalWidth, originalHeight } = markerData;
  if (originalWidth == null) {
    originalWidth = bitmap.width;
  }
  if (originalHeight == null) {
    originalHeight = bitmap.height;
  }

  bitmapDimensions = { width: originalWidth, height: originalHeight };
  resizeCanvas(canvas, originalWidth, originalHeight);
  ctx.save();
  ctx.scale(originalWidth / bitmap.width, originalHeight / bitmap.height);
  ctx.drawImage(bitmap, 0, 0);
  ctx.restore();
  ctx.save();
  try {
    paintMarkers(ctx, markers, cameraModel);
  } catch (err) {
    console.warn("error painting markers:", err);
  } finally {
    ctx.restore();
  }
  return bitmapDimensions;
}

function paintMarkers(ctx: CanvasRenderingContext2D, messages: Message[], cameraModel: ?CameraModel) {
  for (const { message } of messages) {
    ctx.save();
    try {
      if (Array.isArray(message.markers)) {
        for (const marker of message.markers) {
          paintMarker(ctx, marker, cameraModel);
        }
      } else {
        paintMarker(ctx, message, cameraModel);
      }
    } catch (e) {
      console.error("Unable to paint marker to ImageView", e, message);
    }
    ctx.restore();
  }
}

function paintMarker(ctx: CanvasRenderingContext2D, marker: ImageMarker, cameraModel: ?CameraModel) {
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
        const maybeUnrectifiedPoint = maybeUnrectifyPoint(cameraModel, marker.points[i]);
        ctx.lineTo(maybeUnrectifiedPoint.x, maybeUnrectifiedPoint.y);
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

function resizeCanvas(canvas: ?HTMLCanvasElement, width: number, height: number) {
  if (canvas && (canvas.width !== width || canvas.height !== height)) {
    canvas.width = width;
    canvas.height = height;
  }
}
