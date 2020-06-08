// @flow
//
//  Copyright (c) 2019-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.
import { storiesOf } from "@storybook/react";
import React from "react";

import { MockMessagePipelineProvider } from "webviz-core/src/components/MessagePipeline";
import PlaybackSpeedControls from "webviz-core/src/components/PlaybackSpeedControls";

function ControlsStory() {
  return (
    <div
      style={{ padding: 20, paddingTop: 300 }}
      ref={(el) => {
        setImmediate(() => {
          if (el) {
            // $FlowFixMe - just crash when we can't find this dropdown.
            el.querySelector("[data-test=PlaybackSpeedControls-Dropdown]").click();
          }
        });
      }}>
      <PlaybackSpeedControls />
    </div>
  );
}

storiesOf("<PlaybackSpeedControls>", module)
  .add("without speed capability", () => {
    return (
      <MockMessagePipelineProvider>
        <ControlsStory />
      </MockMessagePipelineProvider>
    );
  })
  .add("without a speed from the player", () => {
    return (
      <MockMessagePipelineProvider capabilities={["setSpeed"]} activeData={{ speed: undefined }}>
        <ControlsStory />
      </MockMessagePipelineProvider>
    );
  })
  .add("with a speed", () => {
    return (
      <MockMessagePipelineProvider capabilities={["setSpeed"]}>
        <ControlsStory />
      </MockMessagePipelineProvider>
    );
  })
  .add("with a very small speed", () => {
    return (
      <MockMessagePipelineProvider capabilities={["setSpeed"]} activeData={{ speed: 0.01 }}>
        <ControlsStory />
      </MockMessagePipelineProvider>
    );
  });
