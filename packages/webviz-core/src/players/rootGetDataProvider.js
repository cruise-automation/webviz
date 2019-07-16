// @flow
//
//  Copyright (c) 2019-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.
import { getGlobalHooks } from "webviz-core/src/loadWebviz";
import BagDataProvider from "webviz-core/src/players/BagDataProvider";
import CombinedDataProvider from "webviz-core/src/players/CombinedDataProvider";
import createGetDataProvider from "webviz-core/src/players/createGetDataProvider";
import IdbCacheReaderDataProvider from "webviz-core/src/players/IdbCacheReaderDataProvider";
import MeasureDataProvider, { instrumentDataProviderTree } from "webviz-core/src/players/MeasureDataProvider";
import ParseMessagesDataProvider from "webviz-core/src/players/ParseMessagesDataProvider";
import ReadAheadDataProvider from "webviz-core/src/players/ReadAheadDataProvider";
import type { DataProviderDescriptor, RandomAccessDataProvider } from "webviz-core/src/players/types";
import WorkerDataProvider from "webviz-core/src/players/WorkerDataProvider";
import { MEASURE_DATA_PROVIDERS_QUERY_KEY } from "webviz-core/src/util/globalConstants";

const getDataProviderBase = createGetDataProvider({
  BagDataProvider,
  MeasureDataProvider,
  ParseMessagesDataProvider,
  ReadAheadDataProvider,
  WorkerDataProvider,
  IdbCacheReaderDataProvider,
  CombinedDataProvider,
  ...getGlobalHooks().getAdditionalDataProviders(),
});

export function rootGetDataProvider(tree: DataProviderDescriptor): RandomAccessDataProvider {
  if (new URLSearchParams(location.search).has(MEASURE_DATA_PROVIDERS_QUERY_KEY)) {
    tree = instrumentDataProviderTree(tree);
  }
  return getDataProviderBase(tree);
}
