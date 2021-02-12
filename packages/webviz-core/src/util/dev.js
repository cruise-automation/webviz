// @flow
//
//  Copyright (c) 2019-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

export const setReactHotLoaderConfig = () => {
  if (process.env.NODE_ENV !== "production") {
    const { setConfig } = require("react-hot-loader");
    // $FlowFixMe - flow-typed does not have the most up to date react-hot-loader type defs.
    setConfig({
      // react-hot-loader re-writes hooks with a wrapper function that is designed
      // to be re-invoked on module updates. While good in some cases, reloading
      // hooks in webviz causes havoc on our internal state since we depend on a
      // hooks to initilialize playback.
      reloadHooks: false,
    });
  }
};
