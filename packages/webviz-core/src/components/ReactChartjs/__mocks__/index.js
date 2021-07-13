// @flow
//
//  Copyright (c) 2020-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import React from "react";

export const DEFAULT_PROPS = {
  zoomOptions: { mode: "xy", enabled: true, sensitivity: 3, speed: 0.1 },
};

export default class ReactChartjs extends React.PureComponent<any> {
  static onUpdate = jest.fn<any, any>();

  static defaultProps = DEFAULT_PROPS;

  componentDidUpdate() {
    ReactChartjs.onUpdate();
  }

  render() {
    return null;
  }
}
