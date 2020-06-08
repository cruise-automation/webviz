// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { storiesOf } from "@storybook/react";
import * as React from "react";

import Tooltip from "webviz-core/src/components/Tooltip";

storiesOf("<Tooltip>", module).add("basic examples", () => {
  const containerStyle = {
    margin: "50px",
    display: "flex",
    flexWrap: "wrap",
  };
  const style = {
    width: "50px",
    height: "50px",
    margin: "10px",
    backgroundColor: "gray",
  };
  return (
    <div style={containerStyle}>
      <Tooltip contents="Top" placement="top" defaultShown>
        <div style={style} />
      </Tooltip>
      <Tooltip contents="Left" placement="left" defaultShown>
        <div style={style} />
      </Tooltip>
      <Tooltip contents="Right" placement="right" defaultShown>
        <div style={style} />
      </Tooltip>
      <Tooltip contents="Bottom" placement="bottom" defaultShown>
        <div style={style} />
      </Tooltip>
    </div>
  );
});
