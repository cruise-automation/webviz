// @flow
//
//  Copyright (c) 2019-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { mount } from "enzyme";
import * as React from "react";

import * as PanelAPI from ".";
import { concatAndTruncate } from "./useMessagesByTopic";
import { MockMessagePipelineProvider } from "webviz-core/src/components/MessagePipeline";
import type { MessageFormat } from "webviz-core/src/players/types";
import { wrapJsObject } from "webviz-core/src/util/binaryObjects";

describe("useMessagesByTopic", () => {
  // Create a helper component that exposes the results of the hook for mocking.
  function createTest() {
    function Test({
      topics,
      historySize,
      format = "parsedMessages",
    }: {
      topics: string[],
      historySize: number,
      format?: MessageFormat,
    }) {
      Test.result(PanelAPI.useMessagesByTopic({ topics, historySize, format }));
      return null;
    }
    Test.result = jest.fn();
    return Test;
  }

  it("initializes with an empty array per topic", async () => {
    const Test = createTest();

    const root = mount(
      <MockMessagePipelineProvider>
        <Test topics={["/foo"]} historySize={1} />
      </MockMessagePipelineProvider>
    );

    await Promise.resolve();
    expect(Test.result.mock.calls).toEqual([[{ "/foo": [] }]]);

    root.unmount();
  });

  it("add messages to their respective arrays", () => {
    const Test = createTest();

    const message1 = {
      topic: "/foo",
      receiveTime: { sec: 0, nsec: 0 },
      message: { value: 1 },
    };

    const message2 = {
      topic: "/foo",
      receiveTime: { sec: 0, nsec: 0 },
      message: { value: 2 },
    };

    const root = mount(
      <MockMessagePipelineProvider messages={[message1]}>
        <Test topics={["/foo"]} historySize={Infinity} />
      </MockMessagePipelineProvider>
    );
    root.setProps({ messages: [message2] });

    expect(Test.result.mock.calls).toEqual([[{ "/foo": [message1] }], [{ "/foo": [message1, message2] }]]);

    // Make sure that the identities are also the same, not just deep-equal.
    expect(Test.result.mock.calls[0][0]["/foo"][0]).toBe(message1);

    root.unmount();
  });

  it("remembers messages when changing props (both topics and historySize)", () => {
    const Test = createTest();

    const message1 = {
      topic: "/foo",
      receiveTime: { sec: 0, nsec: 0 },
      message: { value: 1 },
    };

    const message2 = {
      topic: "/foo",
      receiveTime: { sec: 0, nsec: 0 },
      message: { value: 2 },
    };

    const root = mount(
      <MockMessagePipelineProvider messages={[message1, message2]}>
        <Test topics={["/foo"]} historySize={Infinity} />
      </MockMessagePipelineProvider>
    );
    root.setProps({ messages: [], children: <Test topics={["/foo", "/bar"]} historySize={1} /> });

    expect(Test.result.mock.calls).toEqual([[{ "/foo": [message1, message2] }], [{ "/foo": [message2], "/bar": [] }]]);

    // Make sure that the identities are also the same, not just deep-equal.
    expect(Test.result.mock.calls[1][0]["/foo"][0]).toBe(message2);

    root.unmount();
  });

  it("respects the 'format' parameter and returns bobjects", () => {
    const Test = createTest();
    const message = {
      topic: "/foo",
      receiveTime: { sec: 0, nsec: 0 },
      message: wrapJsObject({}, "time", { sec: 1234, nsec: 5678 }),
    };

    const root = mount(
      <MockMessagePipelineProvider bobjects={[message]}>
        <Test topics={["/foo"]} historySize={1} format="bobjects" />
      </MockMessagePipelineProvider>
    );

    expect(Test.result.mock.calls).toEqual([[{ "/foo": [message] }]]);

    root.unmount();
  });
});

describe("concatAndTruncate", () => {
  it("can truncate down to zero", () => {
    expect(concatAndTruncate([1, 2, 3], [4, 5, 6], 0)).toEqual([]);
    expect(concatAndTruncate([], [1, 2, 3], 0)).toEqual([]);
    expect(concatAndTruncate([1, 2, 3], [], 0)).toEqual([]);
    expect(concatAndTruncate([], [], 0)).toEqual([]);
  });

  it("works when no truncation is necessary", () => {
    expect(concatAndTruncate([1, 2, 3], [4, 5, 6], Infinity)).toEqual([1, 2, 3, 4, 5, 6]);
    expect(concatAndTruncate([1, 2, 3], [4, 5, 6], 100)).toEqual([1, 2, 3, 4, 5, 6]);
    expect(concatAndTruncate([1, 2, 3], [4, 5, 6], 6)).toEqual([1, 2, 3, 4, 5, 6]);

    expect(concatAndTruncate([], [1, 2, 3], Infinity)).toEqual([1, 2, 3]);
    expect(concatAndTruncate([], [1, 2, 3], 100)).toEqual([1, 2, 3]);
    expect(concatAndTruncate([], [1, 2, 3], 3)).toEqual([1, 2, 3]);

    expect(concatAndTruncate([1, 2, 3], [], Infinity)).toEqual([1, 2, 3]);
    expect(concatAndTruncate([1, 2, 3], [], 100)).toEqual([1, 2, 3]);
    expect(concatAndTruncate([1, 2, 3], [], 3)).toEqual([1, 2, 3]);
  });

  it("can truncate into the middle of the first array", () => {
    expect(concatAndTruncate([1, 2, 3], [], 2)).toEqual([2, 3]);
    expect(concatAndTruncate([1, 2, 3], [4, 5], 3)).toEqual([3, 4, 5]);
  });

  it("can truncate into the middle of the second array", () => {
    expect(concatAndTruncate([], [1, 2, 3], 2)).toEqual([2, 3]);
    expect(concatAndTruncate([0], [1, 2, 3], 2)).toEqual([2, 3]);
  });

  it("can return just the second array", () => {
    expect(concatAndTruncate([], [1, 2, 3], 3)).toEqual([1, 2, 3]);
    expect(concatAndTruncate([0], [1, 2, 3], 3)).toEqual([1, 2, 3]);
  });
});
