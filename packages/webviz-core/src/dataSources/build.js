// @flow
//
//  Copyright (c) 2018-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import {
  dataSourceConnected,
  dataSourceConnecting,
  dataSourceDisconnected,
  getDataSource,
  getPipeline,
  setDataSourceNull,
} from "webviz-core/src/actions/dataSource";
import { BagDataProvider } from "webviz-core/src/dataSources/bag/BagDataProvider";
import RandomAccessDataSource from "webviz-core/src/dataSources/RandomAccessDataSource";
import ReadAheadDataProvider from "webviz-core/src/dataSources/ReadAheadDataProvider";
import type { DataSource } from "webviz-core/src/types/dataSources";
import type { Dispatch, GetState } from "webviz-core/src/types/Store";
import reportError from "webviz-core/src/util/reportError";

export type DataSourceInput = string | File | DataSource;

function clearDataSource(dispatch: Dispatch) {
  const dataSource = getDataSource();
  if (dataSource) {
    dataSource.close();
  }
  setDataSourceNull();
  dispatch(dataSourceDisconnected());
}

export const loadBag = (files: FileList | File[]) => async (dispatch: Dispatch, getState: GetState): Promise<void> => {
  if (getDataSource()) {
    clearDataSource(dispatch);
  }
  const bagProvider = new BagDataProvider(files[0]);
  const provider = new ReadAheadDataProvider(bagProvider);
  const dataSource = new RandomAccessDataSource(provider);
  dispatch(dataSourceConnecting(dataSource));

  try {
    await getPipeline().initialize(dispatch, dataSource);
  } catch (e) {
    reportError("Datasource failed to initialize", e);
    return clearDataSource(dispatch);
  }

  dispatch(dataSourceConnected());
  dataSource.requestTopics();
};
