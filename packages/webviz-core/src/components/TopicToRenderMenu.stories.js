// @flow
//
//  Copyright (c) 2019-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.
import { storiesOf } from "@storybook/react";
import * as React from "react";
import { withScreenshot } from "storybook-chrome-screenshot";

import TopicToRenderMenu from "webviz-core/src/components/TopicToRenderMenu";
import PanelSetup from "webviz-core/src/stories/PanelSetup";

const topics = [
  {
    name: "/default/foo",
    datatype: "abc_msgs/foo",
  },
  {
    name: "/webviz_bag_2/default/foo",
    datatype: "abc_msgs/foo",
  },
  {
    name: "/webviz_bag_2/default/foo",
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
  .addDecorator(withScreenshot())
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
          topicToRender={"/default"}
          topics={topics}
          topicsGroups={topicsGroups}
          defaultTopicToRender={"/default"}
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
          topicToRender={"/default/foo"}
          topics={topics}
          singleTopicDatatype={"abc_msgs/foo"}
          defaultTopicToRender={"/default/foo"}
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
          topicToRender={"/webviz_bag_2/default/foo"}
          topics={topics}
          singleTopicDatatype={"abc_msgs/foo"}
          defaultTopicToRender={"/default/foo"}
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
          topicToRender={"/default"}
          topics={[]}
          topicsGroups={topicsGroups}
          defaultTopicToRender={"/default"}
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
          topicToRender={"/webviz_bag_2/default"}
          topics={[]}
          topicsGroups={topicsGroups}
          defaultTopicToRender={"/default"}
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
          topicToRender={"/abc"}
          topics={topics}
          singleTopicDatatype={"abc_msgs/foo"}
          defaultTopicToRender={"/default/foo"}
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
          topicToRender={"/default/bar"}
          topics={topics}
          singleTopicDatatype={"abc_msgs/foo"}
          defaultTopicToRender={"/default/bar"}
        />
      </PanelSetup>
    );
  });
