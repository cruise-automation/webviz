// @flow
//
//  Copyright (c) 2019-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.
import { storiesOf } from "@storybook/react";
import React from "react";

import Publish from "webviz-core/src/panels/Publish";
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

const advancedJSON = `{\n  "data": ""\n}`;
const publishConfig = (advancedView: boolean, json: string) => ({
  topicName: "/sample_topic",
  datatype: "std_msgs/String",
  buttonText: "Publish",
  buttonTooltip: "",
  buttonColor: "",
  advancedView,
  value: json,
});

storiesOf("<Publish>", module)
  .add("example can publish, advanced", () => {
    const allowPublish = true;
    return (
      <PanelSetup fixture={getFixture(allowPublish)}>
        <Publish config={publishConfig(true, advancedJSON)} />
      </PanelSetup>
    );
  })
  .add("example can't publish, advanced", () => {
    const allowPublish = false;
    return (
      <PanelSetup fixture={getFixture(allowPublish)}>
        <Publish config={publishConfig(true, advancedJSON)} />
      </PanelSetup>
    );
  })
  .add("example can't publish, not advanced", () => {
    const allowPublish = false;
    return (
      <PanelSetup fixture={getFixture(allowPublish)}>
        <Publish config={publishConfig(false, advancedJSON)} />
      </PanelSetup>
    );
  })
  .add("Example with datatype that no longer exists", () => {
    return (
      <PanelSetup fixture={{ topics: [], datatypes: {}, frame: {}, capabilities: [] }}>
        <Publish config={publishConfig(true, advancedJSON)} />
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

    const validJSON = `{\n  "a": 1,\n  "b": 2,\n  "c": 3\n}`;

    return (
      <PanelSetup fixture={fixture}>
        <Publish config={publishConfig(true, validJSON)} />
      </PanelSetup>
    );
  })
  .add("example with invalid preset JSON", () => {
    const fixture = {
      topics: [],
      datatypes: {
        "std_msgs/String": { fields: [{ name: "data", type: "string" }] },
      },
      frame: {},
      capabilities: [PlayerCapabilities.advertise],
    };

    const invalid = `{\n  "a": 1,\n  'b: 2,\n  "c": 3\n}`;

    return (
      <PanelSetup fixture={fixture}>
        <Publish config={publishConfig(true, invalid)} />
      </PanelSetup>
    );
  });
