// @flow
//
//  Copyright (c) 2019-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.
import { storiesOf } from "@storybook/react";
import React from "react";

import Teleop from "webviz-core/src/panels/Teleop";
import { PlayerCapabilities } from "webviz-core/src/players/types";
import PanelSetup from "webviz-core/src/stories/PanelSetup";

const getFixture = (allowPublish) => {
  return {
    topics: [],
    datatypes: {
      "std_msgs/String": { fields: [{ name: "data", type: "string" }] },
    },
    frame: {},
    capabilities: allowPublish ? [PlayerCapabilities.advertise] : [],
  };
};

const publishConfig = () => ({
  buttonColor: "",
});

storiesOf("<Teleop>", module)
  .add("example can publish", () => {
    const allowPublish = true;
    return (
      <PanelSetup fixture={getFixture(allowPublish)}>
        <Teleop config={publishConfig()} />
      </PanelSetup>
    );
  })
  .add("example can't publish", () => {
    const allowPublish = false;
    return (
      <PanelSetup fixture={getFixture(allowPublish)}>
        <Teleop config={publishConfig()} />
      </PanelSetup>
    );
  })
  .add("Example with datatype that no longer exists", () => {
    return (
      <PanelSetup fixture={{ topics: [], datatypes: {}, frame: {}, capabilities: [] }}>
        <Teleop config={publishConfig()} />
      </PanelSetup>
    );
  })
  .add("example with valid preset JSON", () => {
    const fixture = {
      topics: [],
      datatypes: {
        "std_msgs/String": { fields: [{ name: "data", type: "string" }] },
      },
      frame: {},
      capabilities: [PlayerCapabilities.advertise],
    };

    return (
      <PanelSetup fixture={fixture}>
        <Teleop config={publishConfig()} />
      </PanelSetup>
    );
  });
