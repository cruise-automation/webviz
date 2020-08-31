// @flow
//
//  Copyright (c) 2019-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { getExperimentalFeature } from "webviz-core/src/components/ExperimentalFeatures";
import { CoreDataProviders } from "webviz-core/src/dataProviders/constants";
import type { DataProviderDescriptor } from "webviz-core/src/dataProviders/types";
import { DISABLE_WORKERS_QUERY_KEY } from "webviz-core/src/util/globalConstants";

export const wrapInWorkerIfEnabled = (descriptor: DataProviderDescriptor): DataProviderDescriptor => {
  const params = new URLSearchParams(window.location.search);
  if (params.has(DISABLE_WORKERS_QUERY_KEY)) {
    return descriptor;
  }
  return { name: CoreDataProviders.WorkerDataProvider, args: {}, children: [descriptor] };
};

export function getLocalBagDescriptor(file: File): DataProviderDescriptor {
  return wrapInWorkerIfEnabled({
    name: CoreDataProviders.BagDataProvider,
    args: { bagPath: { type: "file", file } },
    children: [],
  });
}

export function getRemoteBagDescriptor(url: string, guid: ?string) {
  const unlimitedCache = getExperimentalFeature("unlimitedMemoryCache");

  const bagDataProvider = {
    name: CoreDataProviders.BagDataProvider,
    args: {
      bagPath: { type: "remoteBagUrl", url },
      cacheSizeInBytes: unlimitedCache ? Infinity : undefined,
    },
    children: [],
  };

  // If we have an input identifier (which should be globally unique), then cache in indexeddb.
  // If not, then we don't have a cache key, so just read directly from the bag in memory.
  return guid && getExperimentalFeature("diskBagCaching")
    ? {
        name: CoreDataProviders.IdbCacheReaderDataProvider,
        args: { id: guid },
        children: [
          wrapInWorkerIfEnabled({
            name: CoreDataProviders.IdbCacheWriterDataProvider,
            args: { id: guid },
            children: [bagDataProvider],
          }),
        ],
      }
    : wrapInWorkerIfEnabled(bagDataProvider);
}
