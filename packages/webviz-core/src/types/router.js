// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

export type Location = {
  search: string,
  pathname: string,
};

// this is the shape of the routing state branch
// created by react-router-redux
export type Routing = {
  location: Location,
};
