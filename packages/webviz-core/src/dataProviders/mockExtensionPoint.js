// @flow
//
//  Copyright (c) 2019-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.
import type { ExtensionPoint } from "webviz-core/src/dataProviders/types";

export function mockExtensionPoint() {
  const metadata = [];
  return {
    extensionPoint: ({
      progressCallback() {},
      reportMetadataCallback(m) {
        metadata.push(m);
      },
    }: ExtensionPoint),
    metadata,
  };
}
