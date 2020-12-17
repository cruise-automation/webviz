// @flow
//
//  Copyright (c) 2019-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.
import { mount } from "enzyme";
import React from "react";

import Teleop from "webviz-core/src/panels/Teleop";
import PanelSetup from "webviz-core/src/stories/PanelSetup";

describe("Teleop panel", () => {
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
        <Teleop
          config={{
            topicName: "/cmd_vel",
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
