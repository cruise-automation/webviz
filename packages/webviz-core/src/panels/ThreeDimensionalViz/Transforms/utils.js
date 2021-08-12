// @flow
//
//  Copyright (c) 2020-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import type { TF } from "webviz-core/src/types/Messages";

export const makeTransformElement = (tf: TF) => ({
  childFrame: tf.child_frame_id,
  parentFrame: tf.header.frame_id,
  pose: { position: tf.transform.translation, orientation: tf.transform.rotation },
});
