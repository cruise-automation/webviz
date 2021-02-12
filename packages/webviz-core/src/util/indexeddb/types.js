// @flow
//
//  Copyright (c) 2019-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

export type WritableStreamOptions = {
  batchSize?: number,
  // extra static data to be copied to the value of every record inserted
  // used to copy topic name into airavata records
  extra?: { [key: any]: any },
};
