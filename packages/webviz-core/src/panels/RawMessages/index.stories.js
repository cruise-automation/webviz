// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { storiesOf } from "@storybook/react";
import React from "react";
import { withScreenshot } from "storybook-chrome-screenshot";

import { fixture, enumFixture, enumAdvancedFixture, topicsToDiffFixture, topicsWithIdsToDiffFixture } from "./fixture";
import RawMessages from "webviz-core/src/panels/RawMessages";
import PanelSetup from "webviz-core/src/stories/PanelSetup";

storiesOf("<RawMessages>", module)
  .addDecorator(withScreenshot())
  .add("folded", () => {
    return (
      <PanelSetup fixture={fixture} style={{ width: 350 }}>
        <RawMessages config={{ topicName: "/msgs/big_topic", diffTopicName: "" }} />
      </PanelSetup>
    );
  })
  .add("with receiveTime", () => {
    return (
      <PanelSetup fixture={fixture} style={{ width: 350 }}>
        <RawMessages config={{ topicName: "/foo", diffTopicName: "" }} />
      </PanelSetup>
    );
  })
  .add("display big value – num", () => {
    return (
      <PanelSetup fixture={fixture} style={{ width: 350 }}>
        <RawMessages config={{ topicName: "/baz/num", diffTopicName: "" }} />
      </PanelSetup>
    );
  })
  .add("display big value – text", () => {
    return (
      <PanelSetup fixture={fixture} style={{ width: 350 }}>
        <RawMessages config={{ topicName: "/baz/text", diffTopicName: "" }} />
      </PanelSetup>
    );
  })
  .add("display big value – single element array", () => {
    return (
      <PanelSetup fixture={fixture} style={{ width: 350 }}>
        <RawMessages config={{ topicName: "/baz/array", diffTopicName: "" }} />
      </PanelSetup>
    );
  })
  .add("display basic enum", () => {
    return (
      <PanelSetup fixture={enumFixture} style={{ width: 350 }}>
        <RawMessages config={{ topicName: "/baz/enum", diffTopicName: "" }} />
      </PanelSetup>
    );
  })
  .add("display advanced enum usage", () => {
    return (
      <PanelSetup fixture={enumAdvancedFixture} style={{ width: 350 }}>
        <RawMessages config={{ topicName: "/baz/enum_advanced", diffTopicName: "" }} />
      </PanelSetup>
    );
  })
  .add("display geometry types - length", () => {
    return (
      <PanelSetup fixture={fixture} style={{ width: 350 }}>
        <RawMessages config={{ topicName: "/geometry/types", diffTopicName: "" }} />
      </PanelSetup>
    );
  })
  .add("display diff", () => {
    return (
      <PanelSetup
        fixture={topicsToDiffFixture}
        style={{ width: 500 }}
        onMount={() => {
          const allLabels = document.querySelectorAll("label");
          for (const label of allLabels) {
            label.click();
          }
        }}>
        <RawMessages config={{ topicName: "/baz/enum_advanced", diffTopicName: "/another/baz/enum_advanced" }} />
      </PanelSetup>
    );
  })
  .add("display diff with ID fields", () => {
    return (
      <PanelSetup
        fixture={topicsWithIdsToDiffFixture}
        style={{ width: 350 }}
        onMount={() => {
          const allLabels = document.querySelectorAll("label");
          for (const label of allLabels) {
            label.click();
          }
        }}>
        <RawMessages config={{ topicName: "/baz/enum_advanced", diffTopicName: "/another/baz/enum_advanced" }} />
      </PanelSetup>
    );
  })
  .add("empty diff message", () => {
    return (
      <PanelSetup fixture={{ topics: [], frame: {} }} style={{ width: 350 }}>
        <RawMessages config={{ topicName: "/baz/enum_advanced", diffTopicName: "/another/baz/enum_advanced" }} />
      </PanelSetup>
    );
  });
