// @flow
//
//  Copyright (c) 2019-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.
import { GLOBAL_VARIABLES_QUERY_KEY, OLD_GLOBAL_VARIABLES_QUERY_KEY } from "webviz-core/src/util/globalConstants";
import sendNotification from "webviz-core/src/util/sendNotification";

export function getGlobalVariablesFromUrl(params: URLSearchParams): ?{} {
  const globalVariables = params.get(GLOBAL_VARIABLES_QUERY_KEY) || params.get(OLD_GLOBAL_VARIABLES_QUERY_KEY);
  if (globalVariables) {
    try {
      return JSON.parse(globalVariables);
    } catch (error) {
      sendNotification(`Invalid JSON for global variables (${GLOBAL_VARIABLES_QUERY_KEY})`, error, "user", "error");
    }
  }
}
