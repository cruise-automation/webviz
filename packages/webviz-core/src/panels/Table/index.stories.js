// @flow
//
//  Copyright (c) 2020-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { storiesOf } from "@storybook/react";
import React from "react";

import demoBag from "webviz-core/public/fixtures/demo-shuffled.bag";
import Table from "webviz-core/src/panels/Table";
import PanelSetup from "webviz-core/src/stories/PanelSetup";
import PanelSetupWithBag from "webviz-core/src/stories/PanelSetupWithBag";

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
  })
  .add("ros data", () => {
    return (
      <PanelSetupWithBag bag={demoBag} subscriptions={["/diagnostics"]}>
        <Table config={{ topicPath: "/diagnostics.header" }} saveConfig={() => {}} />
      </PanelSetupWithBag>
    );
  })
  .add("ros primitive", () => {
    return (
      <PanelSetupWithBag bag={demoBag} subscriptions={["/diagnostics"]}>
        <Table config={{ topicPath: "/diagnostics.header.stamp" }} saveConfig={() => {}} />
      </PanelSetupWithBag>
    );
  });
