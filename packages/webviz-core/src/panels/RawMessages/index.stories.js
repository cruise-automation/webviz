// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { storiesOf } from "@storybook/react";
import React from "react";

import {
  fixture,
  enumFixture,
  enumAdvancedFixture,
  withMissingData,
  withLongString,
  topicsToDiffFixture,
  topicsWithIdsToDiffFixture,
  multipleNumberMessagesFixture,
} from "./fixture";
import RawMessages, { PREV_MSG_METHOD } from "webviz-core/src/panels/RawMessages";
import PanelSetup from "webviz-core/src/stories/PanelSetup";

const noDiffConfig = { diffMethod: "custom", diffTopicPath: "", diffEnabled: false, showFullMessageForDiff: false };
const diffConfig = {
  topicPath: "/baz/enum_advanced",
  diffMethod: "custom",
  diffTopicPath: "/another/baz/enum_advanced",
  diffEnabled: true,
};
const expandAll = () => {
  const allLabels = document.querySelectorAll("label");
  for (const label of allLabels) {
    label.click();
  }
};
storiesOf("<RawMessages>", module)
  .add("folded", () => {
    return (
      <PanelSetup fixture={fixture} style={{ width: 350 }}>
        <RawMessages config={{ topicPath: "/msgs/big_topic", ...noDiffConfig }} />
      </PanelSetup>
    );
  })
  .add("with receiveTime", () => {
    return (
      <PanelSetup fixture={fixture} style={{ width: 350 }}>
        <RawMessages config={{ topicPath: "/foo", ...noDiffConfig }} />
      </PanelSetup>
    );
  })
  .add("display big value – num", () => {
    return (
      <PanelSetup fixture={fixture} style={{ width: 350 }}>
        <RawMessages config={{ topicPath: "/baz/num", ...noDiffConfig }} />
      </PanelSetup>
    );
  })
  .add("display big value – text", () => {
    return (
      <PanelSetup fixture={fixture} style={{ width: 350 }}>
        <RawMessages config={{ topicPath: "/baz/text", ...noDiffConfig }} />
      </PanelSetup>
    );
  })
  .add("display big value – single element array", () => {
    return (
      <PanelSetup fixture={fixture} style={{ width: 350 }}>
        <RawMessages config={{ topicPath: "/baz/array", ...noDiffConfig }} />
      </PanelSetup>
    );
  })
  .add("display single object array", () => {
    return (
      <PanelSetup fixture={fixture} style={{ width: 350 }}>
        <RawMessages config={{ topicPath: "/baz/array/obj", ...noDiffConfig }} />
      </PanelSetup>
    );
  })
  .add("display basic enum", () => {
    return (
      <PanelSetup fixture={enumFixture} style={{ width: 350 }}>
        <RawMessages config={{ topicPath: "/baz/enum", ...noDiffConfig }} />
      </PanelSetup>
    );
  })
  .add("display advanced enum usage", () => {
    return (
      <PanelSetup fixture={enumAdvancedFixture} style={{ width: 350 }}>
        <RawMessages config={{ topicPath: "/baz/enum_advanced", ...noDiffConfig }} />
      </PanelSetup>
    );
  })
  .add("with missing data", () => {
    return (
      <PanelSetup fixture={withMissingData} style={{ width: 350 }}>
        <RawMessages config={{ topicPath: "/baz/missing_data", ...noDiffConfig }} />
      </PanelSetup>
    );
  })
  .add("with a truncated long string", () => {
    return (
      <PanelSetup fixture={withLongString} style={{ width: 350 }}>
        <RawMessages config={{ topicPath: "/baz/text", ...noDiffConfig }} />
      </PanelSetup>
    );
  })
  .add("display geometry types - length", () => {
    return (
      <PanelSetup fixture={fixture} style={{ width: 350 }}>
        <RawMessages config={{ topicPath: "/geometry/types", ...noDiffConfig }} />
      </PanelSetup>
    );
  })
  .add("display diff", () => {
    return (
      <PanelSetup fixture={topicsToDiffFixture} style={{ width: 500 }} onMount={expandAll}>
        <RawMessages config={{ ...diffConfig, showFullMessageForDiff: false }} />
      </PanelSetup>
    );
  })
  .add("display full diff", () => {
    return (
      <PanelSetup fixture={topicsToDiffFixture} style={{ width: 500 }} onMount={expandAll}>
        <RawMessages config={{ ...diffConfig, showFullMessageForDiff: true }} />
      </PanelSetup>
    );
  })
  .add("display diff with ID fields", () => {
    return (
      <PanelSetup fixture={topicsWithIdsToDiffFixture} style={{ width: 350 }} onMount={expandAll}>
        <RawMessages config={{ ...diffConfig, showFullMessageForDiff: false }} />
      </PanelSetup>
    );
  })
  .add("empty diff message", () => {
    return (
      <PanelSetup fixture={{ topics: [], frame: {} }} style={{ width: 350 }}>
        <RawMessages config={{ ...diffConfig, showFullMessageForDiff: false }} />
      </PanelSetup>
    );
  })
  .add("diff same messages", () => {
    return (
      <PanelSetup fixture={fixture} style={{ width: 350 }}>
        <RawMessages
          config={{
            topicPath: "/foo",
            diffMethod: "custom",
            diffTopicPath: "/foo",
            diffEnabled: true,
            showFullMessageForDiff: false,
          }}
        />
      </PanelSetup>
    );
  })
  .add("diff consecutive messages", () => {
    return (
      <PanelSetup fixture={fixture} style={{ width: 350 }} onMount={expandAll}>
        <RawMessages
          config={{
            topicPath: "/foo",
            diffMethod: PREV_MSG_METHOD,
            diffTopicPath: "",
            diffEnabled: true,
            showFullMessageForDiff: true,
          }}
        />
      </PanelSetup>
    );
  })
  .add("display correct message when diff is disabled, even with diff method & topic set", () => {
    return (
      <PanelSetup fixture={fixture} style={{ width: 350 }} onMount={expandAll}>
        <RawMessages
          config={{
            topicPath: "/foo",
            diffMethod: PREV_MSG_METHOD,
            diffTopicPath: "/another/baz/enum_advanced",
            diffEnabled: false,
            showFullMessageForDiff: true,
          }}
        />
      </PanelSetup>
    );
  })
  .add("multiple messages with top-level filter", () => {
    return (
      <PanelSetup fixture={multipleNumberMessagesFixture} style={{ width: 350 }}>
        <RawMessages
          config={{
            topicPath: "/multiple_number_messages{value==2}",
            ...noDiffConfig,
          }}
        />
      </PanelSetup>
    );
  });
