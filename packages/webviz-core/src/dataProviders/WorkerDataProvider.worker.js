// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import ApiCheckerDataProvider from "webviz-core/src/dataProviders/ApiCheckerDataProvider";
import BagDataProvider from "webviz-core/src/dataProviders/BagDataProvider";
import createGetDataProvider from "webviz-core/src/dataProviders/createGetDataProvider";
import IdbCacheWriterDataProvider from "webviz-core/src/dataProviders/IdbCacheWriterDataProvider";
import MeasureDataProvider from "webviz-core/src/dataProviders/MeasureDataProvider";
import RpcDataProviderRemote from "webviz-core/src/dataProviders/RpcDataProviderRemote";
import Rpc from "webviz-core/src/util/Rpc";

// This is the open source version. There is also an internal variant.

const getDataProvider = createGetDataProvider({
  ApiCheckerDataProvider,
  BagDataProvider,
  MeasureDataProvider,
  IdbCacheWriterDataProvider,
});

if (global.postMessage && !global.onmessage) {
  new RpcDataProviderRemote(new Rpc(global), getDataProvider);
}
