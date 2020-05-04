// @flow
//
//  Copyright (c) 2019-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.
import { mount } from "enzyme";
import React from "react";

import Publish from "webviz-core/src/panels/Publish";
import PanelSetup from "webviz-core/src/stories/PanelSetup";

describe("Publish panel", () => {
  it("does not update its state on first render", async () => {
    const saveConfig = jest.fn();
    mount(
      <PanelSetup
        fixture={{
          topics: [],
          datatypes: { "std_msgs/String": { fields: [{ name: "data", type: "string" }] } },
          frame: {},
          capabilities: [],
        }}>
        <Publish
          config={{
            topicName: "/sample_topic",
            datatype: "std_msgs/String",
            buttonText: "Publish",
            buttonTooltip: "",
            buttonColor: "",
            advancedView: true,
            value: `{ "data": "hello" }`,
          }}
          saveConfig={saveConfig}
        />
      </PanelSetup>
    );
    // Gets called with unnecessary payload if we don't check whether state.cachedProps.config has
    // already been initialized
    expect(saveConfig).not.toHaveBeenCalled();
  });
});
