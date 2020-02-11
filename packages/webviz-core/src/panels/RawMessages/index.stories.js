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

import {
  fixture,
  enumFixture,
  enumAdvancedFixture,
  withMissingData,
  topicsToDiffFixture,
  topicsWithIdsToDiffFixture,
  multipleNumberMessagesFixture,
} from "./fixture";
import RawMessages from "webviz-core/src/panels/RawMessages";
import PanelSetup from "webviz-core/src/stories/PanelSetup";

storiesOf("<RawMessages>", module)
  .addDecorator(withScreenshot())
  .add("folded", () => {
    return (
      <PanelSetup fixture={fixture} style={{ width: 350 }}>
        <RawMessages config={{ topicPath: "/msgs/big_topic", diffTopicPath: "", diffEnabled: false }} />
      </PanelSetup>
    );
  })
  .add("with receiveTime", () => {
    return (
      <PanelSetup fixture={fixture} style={{ width: 350 }}>
        <RawMessages config={{ topicPath: "/foo", diffTopicPath: "", diffEnabled: false }} />
      </PanelSetup>
    );
  })
  .add("display big value – num", () => {
    return (
      <PanelSetup fixture={fixture} style={{ width: 350 }}>
        <RawMessages config={{ topicPath: "/baz/num", diffTopicPath: "", diffEnabled: false }} />
      </PanelSetup>
    );
  })
  .add("display big value – text", () => {
    return (
      <PanelSetup fixture={fixture} style={{ width: 350 }}>
        <RawMessages config={{ topicPath: "/baz/text", diffTopicPath: "", diffEnabled: false }} />
      </PanelSetup>
    );
  })
  .add("display big value – single element array", () => {
    return (
      <PanelSetup fixture={fixture} style={{ width: 350 }}>
        <RawMessages config={{ topicPath: "/baz/array", diffTopicPath: "", diffEnabled: false }} />
      </PanelSetup>
    );
  })
  .add("display basic enum", () => {
    return (
      <PanelSetup fixture={enumFixture} style={{ width: 350 }}>
        <RawMessages config={{ topicPath: "/baz/enum", diffTopicPath: "", diffEnabled: false }} />
      </PanelSetup>
    );
  })
  .add("display advanced enum usage", () => {
    return (
      <PanelSetup fixture={enumAdvancedFixture} style={{ width: 350 }}>
        <RawMessages config={{ topicPath: "/baz/enum_advanced", diffTopicPath: "", diffEnabled: false }} />
      </PanelSetup>
    );
  })
  .add("with missing data", () => {
    return (
      <PanelSetup fixture={withMissingData} style={{ width: 350 }}>
        <RawMessages config={{ topicPath: "/baz/missing_data", diffTopicPath: "", diffEnabled: false }} />
      </PanelSetup>
    );
  })
  .add("display geometry types - length", () => {
    return (
      <PanelSetup fixture={fixture} style={{ width: 350 }}>
        <RawMessages config={{ topicPath: "/geometry/types", diffTopicPath: "", diffEnabled: false }} />
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
        <RawMessages
          config={{ topicPath: "/baz/enum_advanced", diffTopicPath: "/another/baz/enum_advanced", diffEnabled: true }}
        />
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
        <RawMessages
          config={{ topicPath: "/baz/enum_advanced", diffTopicPath: "/another/baz/enum_advanced", diffEnabled: true }}
        />
      </PanelSetup>
    );
  })
  .add("empty diff message", () => {
    return (
      <PanelSetup fixture={{ topics: [], frame: {} }} style={{ width: 350 }}>
        <RawMessages
          config={{ topicPath: "/baz/enum_advanced", diffTopicPath: "/another/baz/enum_advanced", diffEnabled: true }}
        />
      </PanelSetup>
    );
  })
  .add("diff same messages", () => {
    return (
      <PanelSetup fixture={fixture} style={{ width: 350 }}>
        <RawMessages config={{ topicPath: "/foo", diffTopicPath: "/foo", diffEnabled: true }} />
      </PanelSetup>
    );
  })
  .add("multiple messages with top-level filter", () => {
    return (
      <PanelSetup fixture={multipleNumberMessagesFixture} style={{ width: 350 }}>
        <RawMessages
          config={{ topicPath: "/multiple_number_messages{value==2}", diffTopicPath: "", diffEnabled: false }}
        />
      </PanelSetup>
    );
  });
