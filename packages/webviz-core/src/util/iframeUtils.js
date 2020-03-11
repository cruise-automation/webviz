// @flow
//
//  Copyright (c) 2019-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.
import type { ErrorType, DetailsType } from "webviz-core/src/util/reportError";

export function isInIFrame(): boolean {
  return typeof window === "object" && window.top !== window;
}

type IframeMessage = {
  type: "webviz-error",
  data: {
    message: string,
    details: DetailsType,
    type: ErrorType,
  },
};

export function postMessageToIframeHost(iframeMessage: IframeMessage) {
  if (isInIFrame()) {
    window.parent.postMessage({ location: window.location.href, ...iframeMessage }, "*");
  }
}
