// @flow
//
//  Copyright (c) 2019-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

// Overwrite the default fetch error handler with one that catches one message: "Failed to fetch". We see this often
// in our logs and want the logs to more fully reflect the error message.
export default function overwriteFetch() {
  const originalFetch = global.fetch;
  global.fetch = function(url, init) {
    // Use this replacement error instead of the original one, because this one will have the correct stack trace.
    const replacementError = new TypeError(
      `Failed to fetch: url: ${url} This likely means there was a CORS issue, which can happen when the server is down.`
    );
    return originalFetch(url, init).catch((error) => {
      if (error.message === "Failed to fetch") {
        throw replacementError;
      }
      throw error;
    });
  };
  global.fetch.original = originalFetch;
}
