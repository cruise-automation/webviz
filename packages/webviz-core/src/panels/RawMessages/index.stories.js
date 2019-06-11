// @flow
//
//  Copyright (c) 2018-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { storiesOf } from "@storybook/react";
import React from "react";
import { withScreenshot } from "storybook-chrome-screenshot";

import { fixture, enumFixture, enumAdvancedFixture } from "./fixture";
import RawMessages from "webviz-core/src/panels/RawMessages";
import PanelSetup from "webviz-core/src/stories/PanelSetup";

storiesOf("<RawMessages>", module)
  .addDecorator(withScreenshot())
  .add("folded", () => {
    return (
      <PanelSetup fixture={fixture} style={{ width: 350 }}>
        <RawMessages config={{ topicName: "/msgs/big_topic" }} />
      </PanelSetup>
    );
  })
  .add("with receiveTime", () => {
    return (
      <PanelSetup fixture={fixture} style={{ width: 350 }}>
        <RawMessages config={{ topicName: "/foo" }} />
      </PanelSetup>
    );
  })
  .add("display big value – num", () => {
    return (
      <PanelSetup fixture={fixture} style={{ width: 350 }}>
        <RawMessages config={{ topicName: "/baz/num" }} />
      </PanelSetup>
    );
  })
  .add("display big value – text", () => {
    return (
      <PanelSetup fixture={fixture} style={{ width: 350 }}>
        <RawMessages config={{ topicName: "/baz/text" }} />
      </PanelSetup>
    );
  })
  .add("display big value – single element array", () => {
    return (
      <PanelSetup fixture={fixture} style={{ width: 350 }}>
        <RawMessages config={{ topicName: "/baz/array" }} />
      </PanelSetup>
    );
  })
  .add("display basic enum", () => {
    return (
      <PanelSetup fixture={enumFixture} style={{ width: 350 }}>
        <RawMessages config={{ topicName: "/baz/enum" }} />
      </PanelSetup>
    );
  })
  .add("display advanced enum usage", () => {
    return (
      <PanelSetup fixture={enumAdvancedFixture} style={{ width: 350 }}>
        <RawMessages config={{ topicName: "/baz/enum_advanced" }} />
      </PanelSetup>
    );
  })
  .add("display geometry types - length", () => {
    return (
      <PanelSetup fixture={fixture} style={{ width: 350 }}>
        <RawMessages config={{ topicName: "/geometry/types" }} />
      </PanelSetup>
    );
  });
