// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.
import { storiesOf } from "@storybook/react";
import { noop } from "lodash";
import * as React from "react";

import PlotMenu from "webviz-core/src/panels/Plot/PlotMenu";

function Wrapper({ children }) {
  return <div style={{ display: "inline-block" }}>{children}</div>;
}

storiesOf("<PlotMenu>", module)
  .add("With min and max y set", () => (
    <Wrapper>
      <PlotMenu
        displayWidth=""
        minYValue="-5"
        maxYValue="5"
        saveConfig={noop}
        setMinMax={noop}
        setWidth={noop}
        datasets={[]}
        maxMessages="123"
        tooltips={[]}
        xAxisVal="timestamp"
      />
    </Wrapper>
  ))
  .add("With min and max y not set", () => (
    <Wrapper>
      <PlotMenu
        displayWidth=""
        minYValue=""
        maxYValue=""
        saveConfig={noop}
        setMinMax={noop}
        setWidth={noop}
        datasets={[]}
        maxMessages=""
        tooltips={[]}
        xAxisVal="timestamp"
      />
    </Wrapper>
  ));
