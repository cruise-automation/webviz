// @flow
//
//  Copyright (c) 2019-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { mount } from "enzyme";
import * as React from "react";
import { MessageReader } from "rosbag";

import * as PanelAPI from ".";
import { setExperimentalFeature } from "webviz-core/src/components/ExperimentalFeatures";
import { MockMessagePipelineProvider } from "webviz-core/src/components/MessagePipeline";

describe("useBlocksByTopic", () => {
  // Create a helper component that exposes the results of the hook for mocking.
  function createTest() {
    function Test({ topics }) {
      Test.result(PanelAPI.useBlocksByTopic(topics));
      return null;
    }
    Test.result = jest.fn();
    return Test;
  }

  beforeEach(() => {
    setExperimentalFeature("preloading", "alwaysOn");
  });

  afterEach(() => {
    setExperimentalFeature("preloading", "default");
  });

  it("returns an empty structure when there are no blocks", async () => {
    const Test = createTest();

    const root = mount(
      <MockMessagePipelineProvider>
        <Test topics={["/foo"]} />
      </MockMessagePipelineProvider>
    );

    await Promise.resolve();
    expect(Test.result.mock.calls).toEqual([[{ blocks: [], messageReadersByTopic: {} }]]);

    root.unmount();
  });

  it("returns just the blocks for which we're subscribed and have message definitions", async () => {
    // Eight cases:
    //  Subscribed | Defined | Present | Should appear in blocks
    //  -----------+---------+---------+------------------------
    //           0 |       0 |       0 |                       0
    //           0 |       0 |       1 |                       0
    //           0 |       1 |       0 |                       0
    //           0 |       1 |       1 |                       0
    //           1 |       0 |       0 |                       0
    //           1 |       0 |       1 |                       0
    //           1 |       1 |       0 |                       0
    //           1 |       1 |       1 |                       1
    const activeData = {
      messageDefinitionsByTopic: {
        "/just_defined": "uint32 id",
        "/defined_and_present": "uint32 id",
        "/subscribed_and_defined": "uint32 id",
        "/subscribed_defined_and_present": "uint32 id",
      },
    };
    const progress = {
      blocks: [
        {
          sizeInBytes: 0,
          messagesByTopic: {
            "/just_present": [],
            "/defined_and_present": [],
            "/subscribed_and_present": [],
            "/subscribed_defined_and_present": [],
          },
        },
        undefined,
      ],
    };
    const Test = createTest();

    const root = mount(
      <MockMessagePipelineProvider activeData={activeData} progress={progress}>
        <Test
          topics={[
            "/just_subscribed",
            "/subscribed_and_defined",
            "/subscribed_and_present",
            "/subscribed_defined_and_present",
          ]}
        />
      </MockMessagePipelineProvider>
    );

    await Promise.resolve();
    expect(Test.result.mock.calls).toEqual([
      [
        {
          blocks: [
            {
              // Messages from the subscribed and defined topic that is present in the block.
              "/subscribed_defined_and_present": [],
            },
            // Missing block transformed into empty messages-by-topic. Missing/uncached data for
            // topics is signaled through missing entries in these objects.
            {},
          ],
          // Readers for each subscribed and defined topic, regardless of whether anything has been
          // cached for those topics.
          messageReadersByTopic: {
            "/subscribed_and_defined": expect.any(MessageReader),
            "/subscribed_defined_and_present": expect.any(MessageReader),
          },
        },
      ],
    ]);

    root.unmount();
  });

  it("returns no messagesByTopic when the player does not provide blocks", async () => {
    const activeData = { messageDefinitionsByTopic: { "/topic1": "uint32 id" } };
    const Test = createTest();
    const root = mount(
      <MockMessagePipelineProvider activeData={activeData}>
        <Test topics={["/topic1"]} />
      </MockMessagePipelineProvider>
    );
    await Promise.resolve();
    // Consumers just need to check in one place to see whether they need a fallback for a topic:
    // in messageReadersByTopic. (They don't also need to check the presence of blocks.)
    expect(Test.result.mock.calls).toEqual([[{ blocks: [], messageReadersByTopic: {} }]]);
    root.unmount();
  });

  it("returns no data when the experimental feature is turned off (default)", async () => {
    setExperimentalFeature("preloading", "default");
    const activeData = { messageDefinitionsByTopic: { "/topic1": "uint32 id" } };
    const progress = { blocks: [{ sizeInBytes: 0, messagesByTopic: { "/topic1": [] } }] };
    const Test = createTest();
    const root = mount(
      <MockMessagePipelineProvider activeData={activeData} progress={progress}>
        <Test topics={["/topic1"]} />
      </MockMessagePipelineProvider>
    );
    await Promise.resolve();
    // No message readers, even though we have a definition and we try to subscribe to the topic.
    // This means the data will never be provided.
    expect(Test.result.mock.calls).toEqual([[{ blocks: [{}], messageReadersByTopic: {} }]]);
    root.unmount();
  });

  it("handles uninitialized block states", async () => {
    // messagesByTopic will not exist.
    const activeData = undefined;
    // Note: progress.blocks.map() does not iterate over the blocks.
    const progress = { blocks: new Array(2) };
    const Test = createTest();
    const root = mount(
      <MockMessagePipelineProvider activeData={activeData} progress={progress}>
        <Test topics={["/topic1"]} />
      </MockMessagePipelineProvider>
    );
    await Promise.resolve();
    // No message readers, even though we have a definition and we try to subscribe to the topic.
    // This means the data will never be provided.
    expect(Test.result.mock.calls).toEqual([[{ blocks: [{}, {}], messageReadersByTopic: {} }]]);
    root.unmount();
  });
});
