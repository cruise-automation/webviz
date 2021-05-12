// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { useAllExperimentalFeatures } from "webviz-core/src/components/ExperimentalFeatures";
import type { FeatureSettings } from "webviz-core/src/components/ExperimentalFeatures/types";
import { useShallowMemo } from "webviz-core/src/util/hooks";

// Used for getting the value to _set_ the context (not for getting the value from the context.)
// Only works in the main thread. In the worker thread the context needs to come from an Rpc.
export default function useWorldContextValue(): $ReadOnly<{| experimentalFeatures: FeatureSettings |}> {
  return useShallowMemo({ experimentalFeatures: useAllExperimentalFeatures() });
}
