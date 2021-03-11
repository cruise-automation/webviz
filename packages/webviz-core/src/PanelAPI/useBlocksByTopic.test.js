// @flow
//
//  Copyright (c) 2019-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { mount } from "enzyme";
import { cloneDeep } from "lodash";
import * as React from "react";
import { parseMessageDefinition } from "rosbag";

import * as PanelAPI from ".";
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

  it("returns an empty structure when there are no blocks", async () => {
    const Test = createTest();

    const root = mount(
      <MockMessagePipelineProvider>
        <Test topics={["/foo"]} />
      </MockMessagePipelineProvider>
    );

    expect(Test.result.mock.calls).toEqual([[[]]]);

    root.unmount();
  });

  it("returns just the blocks for which we're subscribed and have message definitions", async () => {
    // Eight cases:
    //  Subscribed | Present | Should appear in blocks
    //  -----------+---------+------------------------
    //           0 |       0 |                       0
    //           0 |       1 |                       0
    //           1 |       0 |                       0
    //           1 |       1 |                       0
    const activeData = {};
    const progress = {
      messageCache: {
        blocks: [
          {
            sizeInBytes: 0,
            messagesByTopic: {
              "/just_present": [],
              "/subscribed_and_present": [],
            },
          },
          undefined,
        ],
        startTime: { sec: 0, nsec: 0 },
      },
    };
    const Test = createTest();

    const root = mount(
      <MockMessagePipelineProvider activeData={activeData} progress={progress}>
        <Test topics={["/just_subscribed", "/subscribed_and_present"]} />
      </MockMessagePipelineProvider>
    );

    expect(Test.result.mock.calls).toEqual([
      [
        [
          {
            // Messages from the subscribed topic that is present in the block.
            "/subscribed_and_present": [],
          },
          // Missing block transformed into empty messages-by-topic. Missing/uncached data for
          // topics is signaled through missing entries in these objects.
          {},
        ],
      ],
    ]);

    root.unmount();
  });

  it("handles uninitialized block states", async () => {
    // messagesByTopic will not exist.
    const activeData = undefined;
    // Note: progress.blocks.map() does not iterate over the blocks.
    const progress = {
      messageCache: {
        blocks: new Array(2),
        startTime: { sec: 0, nsec: 0 },
      },
    };
    const Test = createTest();
    const root = mount(
      <MockMessagePipelineProvider activeData={activeData} progress={progress}>
        <Test topics={["/topic1"]} />
      </MockMessagePipelineProvider>
    );
    expect(Test.result.mock.calls).toEqual([[[{}, {}]]]);
    root.unmount();
  });

  it("maintains block identity across repeated renders", async () => {
    const activeData = { parsedMessageDefinitionsByTopic: { "/topic": parseMessageDefinition("uint32 id") } };
    const progress = {
      messageCache: {
        blocks: [{ sizeInBytes: 0, messagesByTopic: { "/topic": [] } }],
        startTime: { sec: 0, nsec: 0 },
      },
    };
    const Test = createTest();

    const root = mount(
      <MockMessagePipelineProvider activeData={activeData} progress={progress}>
        <Test topics={["/topic"]} />
      </MockMessagePipelineProvider>
    );

    // Make sure the calls are actual rerenders caused
    const expectedCall = [[{ "/topic": [] }]];
    expect(Test.result.mock.calls).toEqual([expectedCall]);

    // Same identity on everything. useBlocksByTopic does not run again.
    root.setProps({ activeData, progress: { messageCache: { ...progress.messageCache } } });

    // Block identity is the same, but blocks array identity changes.
    root.setProps({
      activeData,
      progress: { messageCache: { ...progress.messageCache, blocks: progress.messageCache.blocks.slice() } },
    });

    // Both identities change.
    root.setProps({ activeData, progress: { messageCache: cloneDeep(progress.messageCache) } });

    expect(Test.result.mock.calls).toEqual([expectedCall, expectedCall, expectedCall]);
    const [[c1], [c3], [c4]] = Test.result.mock.calls;
    expect(c1).not.toBe(c3);
    expect(c1[0]).toBe(c3[0]);

    expect(c3).not.toBe(c4);
    expect(c3[0]).not.toBe(c4[0]);
    root.unmount();
  });
});
