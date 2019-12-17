/* eslint-disable header/header */

//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

if (process.env.NODE_ENV === "test") {
  module.exports = require("./configureStore.testing");
} else {
  module.exports = require("./configureStore");
}
