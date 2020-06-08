// @flow
//
//  Copyright (c) 2019-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { storiesOf } from "@storybook/react";
import React from "react";

import UnlinkGlobalVariables from "./UnlinkGlobalVariables";
import PanelSetup from "webviz-core/src/stories/PanelSetup";

const linkedGlobalVariables = [
  {
    topic: "/foo/bar",
    markerKeyPath: ["id"],
    name: "some_id",
  },
  {
    topic: "/abc/xyz",
    markerKeyPath: ["id", "some_path"],
    name: "some_id",
  },
  {
    topic: "/foo/bar",
    markerKeyPath: ["x", "scale", "some_very_very_long_path"],
    name: "some_id",
  },
  {
    topic: "/foo/bar",
    markerKeyPath: ["x", "scale", "some_very_very_long_path"],
    name: "someOtherName",
  },
];

storiesOf("<UnlinkGlobalVariables>", module).add("default", () => {
  return (
    <PanelSetup
      fixture={{
        topics: [],
        datatypes: {},
        frame: {},
        linkedGlobalVariables,
        globalVariables: {
          scaleY: 2.4,
          fooScaleX: 3,
        },
      }}>
      <div
        ref={(el) => {
          if (el) {
            const btn = el.querySelector("[data-test='unlink-some_id']");
            if (btn) {
              btn.click();
            }
          }
        }}>
        <UnlinkGlobalVariables name="some_id" />
      </div>
    </PanelSetup>
  );
});
