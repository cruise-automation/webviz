// @flow
//
//  Copyright (c) 2019-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.
import { storiesOf } from "@storybook/react";
import * as React from "react";

import TopicToRenderMenu from "webviz-core/src/components/TopicToRenderMenu";
import PanelSetup from "webviz-core/src/stories/PanelSetup";

const topics = [
  {
    name: "/foo",
    datatype: "abc_msgs/foo",
  },
  {
    name: "/webviz_source_2/foo",
    datatype: "abc_msgs/foo",
  },
  {
    name: "/webviz_source_2/foo",
    datatype: "bad_datatype/abc_msgs/foo",
  },
];

const topicsGroups = [
  {
    key: "foo",
    suffix: "/foo",
    datatype: "abc_msgs/foo",
  },
  {
    key: "bar",
    suffix: "/bar",
    datatype: "abc_msgs/bar",
  },
];

storiesOf("<TopicToRenderMenu>", module)
  .add("example (have topicsGroups)", () => {
    return (
      <PanelSetup
        fixture={{ topics: [], datatypes: {}, frame: {} }}
        onMount={(el) => {
          const topicSet = el.querySelector("[data-test=topic-set]");
          if (topicSet) {
            topicSet.click();
          }
        }}>
        <TopicToRenderMenu
          onChange={() => {}}
          topicToRender=""
          topics={topics}
          topicsGroups={topicsGroups}
          defaultTopicToRender=""
        />
      </PanelSetup>
    );
  })
  .add("example (have singleTopicDatatype)", () => {
    return (
      <PanelSetup
        fixture={{ topics: [], datatypes: {}, frame: {} }}
        onMount={(el) => {
          const topicSet = el.querySelector("[data-test=topic-set]");
          if (topicSet) {
            topicSet.click();
          }
        }}>
        <TopicToRenderMenu
          onChange={() => {}}
          topicToRender="/foo"
          topics={topics}
          singleTopicDatatype={"abc_msgs/foo"}
          defaultTopicToRender="/foo"
        />
      </PanelSetup>
    );
  })
  .add("select another topic (have singleTopicDatatype)", () => {
    return (
      <PanelSetup
        fixture={{ topics: [], datatypes: {}, frame: {} }}
        onMount={(el) => {
          const topicSet = el.querySelector("[data-test=topic-set]");
          if (topicSet) {
            topicSet.click();
          }
        }}>
        <TopicToRenderMenu
          onChange={() => {}}
          topicToRender="/webviz_source_2/foo"
          topics={topics}
          singleTopicDatatype={"abc_msgs/foo"}
          defaultTopicToRender="/foo"
        />
      </PanelSetup>
    );
  })
  .add("no bag loaded, defaultTopicToRender === topicToRender (have topicsGroups)", () => {
    return (
      <PanelSetup
        fixture={{ topics: [], datatypes: {}, frame: {} }}
        onMount={(el) => {
          const topicSet = el.querySelector("[data-test=topic-set]");
          if (topicSet) {
            topicSet.click();
          }
        }}>
        <TopicToRenderMenu
          onChange={() => {}}
          topicToRender=""
          topics={[]}
          topicsGroups={topicsGroups}
          defaultTopicToRender=""
        />
      </PanelSetup>
    );
  })
  .add("no bag loaded, defaultTopicToRender !== topicToRender (have topicsGroups)", () => {
    return (
      <PanelSetup
        fixture={{ topics: [], datatypes: {}, frame: {} }}
        onMount={(el) => {
          const topicSet = el.querySelector("[data-test=topic-set]");
          if (topicSet) {
            topicSet.click();
          }
        }}>
        <TopicToRenderMenu
          onChange={() => {}}
          topicToRender="/webviz_source_2"
          topics={[]}
          topicsGroups={topicsGroups}
          defaultTopicToRender=""
        />
      </PanelSetup>
    );
  })
  .add("bag loaded but topicToRender is not available (have singleTopicDatatype)", () => {
    return (
      <PanelSetup
        fixture={{ topics: [], datatypes: {}, frame: {} }}
        onMount={(el) => {
          const topicSet = el.querySelector("[data-test=topic-set]");
          if (topicSet) {
            topicSet.click();
          }
        }}>
        <TopicToRenderMenu
          onChange={() => {}}
          topicToRender="/abc"
          topics={topics}
          singleTopicDatatype={"abc_msgs/foo"}
          defaultTopicToRender="/foo"
        />
      </PanelSetup>
    );
  })
  .add("bag loaded but defaultTopicToRender is not available (have singleTopicDatatype)", () => {
    return (
      <PanelSetup
        fixture={{ topics: [], datatypes: {}, frame: {} }}
        onMount={(el) => {
          const topicSet = el.querySelector("[data-test=topic-set]");
          if (topicSet) {
            topicSet.click();
          }
        }}>
        <TopicToRenderMenu
          onChange={() => {}}
          topicToRender="/bar"
          topics={topics}
          singleTopicDatatype={"abc_msgs/foo"}
          defaultTopicToRender="/bar"
        />
      </PanelSetup>
    );
  });
