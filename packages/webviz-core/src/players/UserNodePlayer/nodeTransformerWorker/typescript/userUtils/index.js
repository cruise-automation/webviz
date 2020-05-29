// @flow
//
//  Copyright (c) 2019-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import markers from "webviz-core/src/players/UserNodePlayer/nodeTransformerWorker/typescript/userUtils/markers.ts";
import pointClouds from "webviz-core/src/players/UserNodePlayer/nodeTransformerWorker/typescript/userUtils/pointClouds.ts";
import readers from "webviz-core/src/players/UserNodePlayer/nodeTransformerWorker/typescript/userUtils/readers.ts";
import time from "webviz-core/src/players/UserNodePlayer/nodeTransformerWorker/typescript/userUtils/time.ts";
import types from "webviz-core/src/players/UserNodePlayer/nodeTransformerWorker/typescript/userUtils/types.ts";
import vectors from "webviz-core/src/players/UserNodePlayer/nodeTransformerWorker/typescript/userUtils/vectors.ts";

export default [
  { fileName: "pointClouds.ts", sourceCode: pointClouds },
  { fileName: "readers.ts", sourceCode: readers },
  { fileName: "time.ts", sourceCode: time },
  { fileName: "types.ts", sourceCode: types },
  { fileName: "vectors.ts", sourceCode: vectors },
  { fileName: "markers.ts", sourceCode: markers },
];
