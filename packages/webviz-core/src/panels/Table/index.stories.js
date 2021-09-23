// @flow
//
//  Copyright (c) 2020-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { storiesOf } from "@storybook/react";
import React from "react";

import Table from "webviz-core/src/panels/Table";
import PanelSetup from "webviz-core/src/stories/PanelSetup";

storiesOf("<Table> - Open Source", module)
  .addParameters({ screenshot: { delay: 1000 } })
  .add("no topic path", () => {
    return (
      <PanelSetup fixture={{ frame: {}, topics: [] }}>
        <Table config={{ topicPath: "" }} saveConfig={() => {}} />
      </PanelSetup>
    );
  })
  .add("no data", () => {
    return (
      <PanelSetup fixture={{ frame: {}, topics: [] }}>
        <Table config={{ topicPath: "/unknown" }} saveConfig={() => {}} />
      </PanelSetup>
    );
  });
