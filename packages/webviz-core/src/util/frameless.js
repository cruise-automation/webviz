// @flow
//
//  Copyright (c) 2019-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { FRAMELESS } from "webviz-core/src/util/globalConstants";

function frameless() {
  return new URLSearchParams(window.location.search).has(FRAMELESS);
}

export default frameless;
