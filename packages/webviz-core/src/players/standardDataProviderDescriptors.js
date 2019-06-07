// @flow
//
//  Copyright (c) 2019-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import type { ChainableDataProviderDescriptor } from "webviz-core/src/players/types";

export function getLocalBagDescriptor(file: File): ChainableDataProviderDescriptor {
  return {
    name: "ReadAheadDataProvider",
    args: {},
    children: [
      {
        name: "ParseMessagesDataProvider",
        args: {},
        children: [
          {
            name: "WorkerDataProvider",
            args: {},
            children: [{ name: "BagDataProvider", args: { bagPath: { type: "file", file } }, children: [] }],
          },
        ],
      },
    ],
  };
}

export function getRemoteBagDescriptor(url: string, guid: ?string, loadEntireBag?: boolean) {
  const bagDataProvider = {
    name: "BagDataProvider",
    args: {
      bagPath: { type: "remoteBagUrl", url },
      cacheSizeInBytes: loadEntireBag ? Infinity : undefined,
    },
    children: [],
  };

  // If we have an input identifier (which should be globally unique), then cache in indexeddb.
  // If not, then we don't have a cache key, so just read directly from the bag in memory.
  return guid
    ? {
        name: "ParseMessagesDataProvider",
        args: {},
        children: [
          {
            name: "IdbCacheReaderDataProvider",
            args: { id: guid },
            children: [
              {
                name: "WorkerDataProvider",
                args: {},
                children: [
                  {
                    name: "IdbCacheWriterDataProvider",
                    args: { id: guid },
                    children: [bagDataProvider],
                  },
                ],
              },
            ],
          },
        ],
      }
    : {
        name: "ReadAheadDataProvider",
        args: {},
        children: [
          {
            name: "ParseMessagesDataProvider",
            args: {},
            children: [
              {
                name: "WorkerDataProvider",
                args: {},
                children: [bagDataProvider],
              },
            ],
          },
        ],
      };
}
