/* eslint-disable header/header */

//  Copyright (c) 2018-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import Raven from "raven-js";

if (process.env.NODE_ENV !== "test" && RAVEN_URL) {
  const config = {
    logger: "client",
    release: CURRENT_VERSION,
    tags: {
      git_commit: GIT_INFO.hash,
    },
    shouldSendCallback() {
      const { getGlobalHooks } = require("webviz-core/src/loadWebviz");
      return process.env.NODE_ENV === "production" && getGlobalHooks().useRaven();
    },
    environment: process.env.NODE_ENV,
  };

  const ravenUrl = RAVEN_URL;

  Raven.config(ravenUrl, config).install();
}

export default Raven;
