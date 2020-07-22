// @flow
//
//  Copyright (c) 2019-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import ApiCheckerDataProvider, {
  instrumentTreeWithApiCheckerDataProvider,
} from "webviz-core/src/dataProviders/ApiCheckerDataProvider";
import BagDataProvider from "webviz-core/src/dataProviders/BagDataProvider";
import CombinedDataProvider from "webviz-core/src/dataProviders/CombinedDataProvider";
import createGetDataProvider from "webviz-core/src/dataProviders/createGetDataProvider";
import IdbCacheReaderDataProvider from "webviz-core/src/dataProviders/IdbCacheReaderDataProvider";
import MeasureDataProvider, {
  instrumentTreeWithMeasureDataProvider,
} from "webviz-core/src/dataProviders/MeasureDataProvider";
import MemoryCacheDataProvider from "webviz-core/src/dataProviders/MemoryCacheDataProvider";
import ParseMessagesDataProvider from "webviz-core/src/dataProviders/ParseMessagesDataProvider";
import RenameDataProvider from "webviz-core/src/dataProviders/RenameDataProvider";
import type { DataProviderDescriptor, DataProvider } from "webviz-core/src/dataProviders/types";
import WorkerDataProvider from "webviz-core/src/dataProviders/WorkerDataProvider";
import { getGlobalHooks } from "webviz-core/src/loadWebviz";
import { MEASURE_DATA_PROVIDERS_QUERY_KEY } from "webviz-core/src/util/globalConstants";

const getDataProviderBase = createGetDataProvider({
  ApiCheckerDataProvider,
  BagDataProvider,
  CombinedDataProvider,
  IdbCacheReaderDataProvider,
  MeasureDataProvider,
  MemoryCacheDataProvider,
  ParseMessagesDataProvider,
  RenameDataProvider,
  WorkerDataProvider,
  ...getGlobalHooks().getAdditionalDataProviders(),
});

export function rootGetDataProvider(tree: DataProviderDescriptor): DataProvider {
  if (new URLSearchParams(location.search).has(MEASURE_DATA_PROVIDERS_QUERY_KEY)) {
    tree = instrumentTreeWithMeasureDataProvider(tree);
  }
  return getDataProviderBase(instrumentTreeWithApiCheckerDataProvider(tree));
}
