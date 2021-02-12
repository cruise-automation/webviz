// @flow
//
//  Copyright (c) 2019-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import type { DataProvider, DataProviderDescriptor, GetDataProvider } from "webviz-core/src/dataProviders/types";

export default function createGetDataProvider(descriptorMap: { [name: string]: Class<DataProvider> }): GetDataProvider {
  return function getDataProvider(descriptor: DataProviderDescriptor): DataProvider {
    const Provider = descriptorMap[descriptor.name];
    if (!Provider) {
      throw new Error(`Unknown DataProviderDescriptor#name: ${descriptor.name}`);
    }
    return new Provider(descriptor.args, descriptor.children, getDataProvider);
  };
}
