// @flow
//
//  Copyright (c) 2021-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { mount } from "enzyme";
import * as React from "react";
import { parseMessageDefinition } from "rosbag";

import useBlocksByTopicWithFallback from "./useBlocksByTopicWithFallback";
import { MockMessagePipelineProvider } from "webviz-core/src/components/MessagePipeline";
import { wrapJsObject } from "webviz-core/src/util/binaryObjects";

const datatypes = {
  dummy: {
    fields: [{ type: "float32", name: "value", isComplex: false, isArray: false }],
  },
};
const parsedMessageDefinitionsByTopic = {
  "/foo": parseMessageDefinition("float32 value"),
};

describe("useBlocksByTopicWithFallback", () => {
  // Create a helper component that exposes the results of the hook for mocking.
  function createTest() {
    function Test({ topics }: { topics: string[] }) {
      Test.result(useBlocksByTopicWithFallback(topics));
      return null;
    }
    Test.result = jest.fn();
    return Test;
  }

  it("uses regular messages if blocks are not available", () => {
    const Test = createTest();

    const message1 = {
      topic: "/foo",
      receiveTime: { sec: 0, nsec: 0 },
      message: wrapJsObject(datatypes, "dummy", { value: 1 }),
    };

    const message2 = {
      topic: "/foo",
      receiveTime: { sec: 0, nsec: 1 },
      message: wrapJsObject(datatypes, "dummy", { value: 2 }),
    };

    const root = mount(
      <MockMessagePipelineProvider bobjects={[message1]}>
        <Test topics={["/foo"]} />
      </MockMessagePipelineProvider>
    );
    expect(Test.result.mock.calls[0]).toEqual([[{ "/foo": [message1] }]]);

    root.setProps({ bobjects: [message2] });
    expect(Test.result.mock.calls[1]).toEqual([[{ "/foo": [message1] }, { "/foo": [message2] }]]);
    // Ensure that block identity does not change between calls.
    expect(Test.result.mock.calls[0][0][0]).toBe(Test.result.mock.calls[1][0][0]);

    root.unmount();
  });

  it("uses blocks if they are available", () => {
    const Test = createTest();

    const message1 = {
      topic: "/foo",
      receiveTime: { sec: 0, nsec: 0 },
      message: wrapJsObject(datatypes, "dummy", { value: 1 }),
    };

    const message2 = {
      topic: "/foo",
      receiveTime: { sec: 0, nsec: 1 },
      message: wrapJsObject(datatypes, "dummy", { value: 2 }),
    };

    // Start with a single preloaded message and no regular messages.
    const block1 = { messagesByTopic: { "/foo": [message1] }, sizeInBytes: 4 };
    const block2 = { messagesByTopic: { "/foo": [message2] }, sizeInBytes: 4 };
    const root = mount(
      <MockMessagePipelineProvider
        bobjects={[]}
        activeData={{ parsedMessageDefinitionsByTopic }}
        progress={{
          messageCache: {
            startTime: { sec: 0, nsec: 0 },
            blocks: [block1],
          },
        }}>
        <Test topics={["/foo"]} />
      </MockMessagePipelineProvider>
    );
    // Add a second message to preloading annd a single one the normal pipleine.
    root.setProps({
      bobjects: [message2],

      progress: {
        messageCache: {
          startTime: { sec: 0, nsec: 0 },
          blocks: [block1, block2],
        },
      },
    });

    expect(Test.result.mock.calls).toEqual([
      [[{ "/foo": [message1] }]],
      [[{ "/foo": [message1] }, { "/foo": [message2] }]],
    ]);
    // Ensure that block identity does not change between calls.
    expect(Test.result.mock.calls[0][0][0]).toBe(Test.result.mock.calls[1][0][0]);

    root.unmount();
  });
});
