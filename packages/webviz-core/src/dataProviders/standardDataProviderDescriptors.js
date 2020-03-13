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

export function getLocalBagDescriptor(file: File): DataProviderDescriptor {
  const unlimitedCache = getExperimentalFeature("unlimitedMemoryCache");

  return {
    name: CoreDataProviders.ParseMessagesDataProvider,
    args: {},
    children: [
      {
        name: CoreDataProviders.MemoryCacheDataProvider,
        args: { unlimitedCache },
        children: [
          {
            name: CoreDataProviders.WorkerDataProvider,
            args: {},
            children: [
              { name: CoreDataProviders.BagDataProvider, args: { bagPath: { type: "file", file } }, children: [] },
            ],
          },
        ],
      },
    ],
  };
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
        name: CoreDataProviders.ParseMessagesDataProvider,
        args: {},
        children: [
          {
            name: CoreDataProviders.MemoryCacheDataProvider,
            args: { unlimitedCache },
            children: [
              {
                name: CoreDataProviders.IdbCacheReaderDataProvider,
                args: { id: guid },

                children: [
                  {
                    name: CoreDataProviders.WorkerDataProvider,
                    args: {},
                    children: [
                      {
                        name: CoreDataProviders.IdbCacheWriterDataProvider,
                        args: { id: guid },
                        children: [bagDataProvider],
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      }
    : {
        name: CoreDataProviders.ParseMessagesDataProvider,
        args: {},
        children: [
          {
            name: CoreDataProviders.MemoryCacheDataProvider,
            args: { unlimitedCache },
            children: [
              {
                name: CoreDataProviders.WorkerDataProvider,
                args: {},
                children: [bagDataProvider],
              },
            ],
          },
        ],
      };
}
