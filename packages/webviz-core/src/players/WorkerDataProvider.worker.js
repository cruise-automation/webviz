// @flow
//
//  Copyright (c) 2018-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import BagDataProvider from "webviz-core/src/players/BagDataProvider";
import createGetDataProvider from "webviz-core/src/players/createGetDataProvider";
import IdbCacheWriterDataProvider from "webviz-core/src/players/IdbCacheWriterDataProvider";
import MeasureDataProvider from "webviz-core/src/players/MeasureDataProvider";
import ReadAheadDataProvider from "webviz-core/src/players/ReadAheadDataProvider";
import RpcDataProviderRemote from "webviz-core/src/players/RpcDataProviderRemote";
import Rpc from "webviz-core/src/util/Rpc";

const getDataProvider = createGetDataProvider({
  BagDataProvider,
  MeasureDataProvider,
  ReadAheadDataProvider,
  IdbCacheWriterDataProvider,
});

if (global.postMessage && !global.onmessage) {
  new RpcDataProviderRemote(new Rpc(global), getDataProvider);
}
