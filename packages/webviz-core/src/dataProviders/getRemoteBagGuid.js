// @flow
//
//  Copyright (c) 2019-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import BrowserHttpReader from "webviz-core/src/dataProviders/BrowserHttpReader";

// Get a globally unique ID for caching purposes for a remote URL, or `undefined`
// when none can be found.
export async function getRemoteBagGuid(url: string): Promise<?string> {
  try {
    const identifier = (await new BrowserHttpReader(url).open()).identifier;
    // Combine the identifier (ETag or Last-Modified) with the actual URL to form a globally unique ID.
    return identifier ? `${url}---${identifier}` : undefined;
  } catch (error) {
    return undefined;
  }
}
