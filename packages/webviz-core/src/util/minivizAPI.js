// @flow
//
//  Copyright (c) 2019-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.
import type { LayoutDescription } from "webviz-core/src/types/layouts";
import { isInIFrame, postMessageToIframeHost } from "webviz-core/src/util/iframeUtils";
import type { NotificationType, DetailsType, NotificationSeverity } from "webviz-core/src/util/sendNotification";

type IframePlaybackMessageData = {
  playbackState: { timestampSec: number, timeStampNano: number },
};

type IframeNotificationMessageData = {
  message: string,
  details: DetailsType,
  type: NotificationType,
  severity: NotificationSeverity,
};

// Do not modify below values. You will break Miniviz
export const WebvizNotificationMessageType = "webviz-notification";
export const WebvizPlaybackMessageType = "webviz-playback";
export const WebvizLayoutMessageType = "webviz-layout";
export const IframePlaybackMessageType = "playback-message";
export const IframeSeekMessageType = "seek-message";
export const IframeUrlChangeMessageType = "url-change-message";
export type IframeEvent =
  | {| type: typeof IframeUrlChangeMessageType, newUrlSource: string |}
  | {| type: typeof IframePlaybackMessageType, isPlaying: boolean, playSpeed: number |}
  | {| type: typeof IframeSeekMessageType, seekTimeMs: number |};

function createMessageHandler(handleMessage: (eventData: IframeEvent) => void) {
  return (event: any) => {
    if (!isInIFrame() || event.data == null || typeof event.data !== "object") {
      return;
    }
    handleMessage(event.data);
  };
}

const minivizAPI = {
  addListener: (handleMessage: (event: any) => void): (() => void) => {
    if (isInIFrame()) {
      const handler = createMessageHandler(handleMessage);
      window.addEventListener("message", handler, false);
      return () => {
        window.removeEventListener("message", handler, false);
      };
    }
    return () => {};
  },

  postPlaybackMessage: (data: IframePlaybackMessageData) => {
    postMessageToIframeHost({
      type: WebvizPlaybackMessageType,
      data,
    });
  },

  postNotificationMessage: (data: IframeNotificationMessageData) => {
    postMessageToIframeHost({
      type: WebvizNotificationMessageType,
      data,
    });
  },

  postLayoutsMessage: (data: LayoutDescription[]) => {
    postMessageToIframeHost({
      type: WebvizLayoutMessageType,
      data,
    });
  },
};

export default minivizAPI;
