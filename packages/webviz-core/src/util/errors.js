// @flow
//
//  Copyright (c) 2019-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { type DetailsType } from "webviz-core/src/util/sendNotification";

export class AppError extends Error {
  details: DetailsType;
  extraInfo: any;
  message: string;
  constructor(details: DetailsType, extraInfo?: any) {
    super();
    this.details = details;
    this.extraInfo = extraInfo;
    this.name = "AppError";

    if (details instanceof Error) {
      this.message = details.stack;
    } else if (typeof details === "string") {
      this.message = details;
    }

    if (extraInfo) {
      // If `extraInfo` was passed via a componentDidCatch:
      // https://reactjs.org/docs/react-component.html#componentdidcatch
      if (extraInfo.componentStack) {
        this.message += `\n\n${extraInfo.componentStack}`;
      } else {
        try {
          const stringifiedExtraInfo = JSON.stringify(extraInfo);
          this.message += `\n\n${stringifiedExtraInfo}`;
        } catch (e) {
          this.message += `\n\n[ Either cyclic object or object with BigInt(s) ]`;
        }
      }
    }

    if (!this.message) {
      this.message = "Unknown Error";
    }
  }
}
