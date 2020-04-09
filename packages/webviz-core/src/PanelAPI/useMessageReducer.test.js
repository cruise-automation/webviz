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
import { MockMessagePipelineProvider } from "webviz-core/src/components/MessagePipeline";

describe("useMessageReducer", () => {
  // Create a helper component that exposes restore, addMessage, and the results of the hook for mocking
  function createTest() {
    function Test({ topics }) {
      Test.result(
        PanelAPI.useMessageReducer({
          topics,
          addMessage: Test.addMessage,
          restore: Test.restore,
        })
      );
      return null;
    }
    Test.result = jest.fn();
    Test.restore = jest.fn();
    Test.addMessage = jest.fn();
    return Test;
  }

  it("calls restore to initialize without messages", async () => {
    const Test = createTest();
    Test.restore.mockReturnValue(1);

    const root = mount(
      <MockMessagePipelineProvider>
        <Test topics={["/foo"]} />
      </MockMessagePipelineProvider>
    );

    await Promise.resolve();
    expect(Test.restore.mock.calls).toEqual([[undefined]]);
    expect(Test.addMessage.mock.calls).toEqual([]);
    expect(Test.result.mock.calls).toEqual([[1]]);

    root.unmount();
  });

  it("calls restore to initialize and addMessage for initial messages", async () => {
    const Test = createTest();

    Test.restore.mockReturnValue(1);
    Test.addMessage.mockImplementation((_, msg) => msg.message.value);

    const message = {
      op: "message",
      datatype: "Foo",
      topic: "/foo",
      receiveTime: { sec: 0, nsec: 0 },
      message: { value: 2 },
    };

    const root = mount(
      <MockMessagePipelineProvider messages={[message]}>
        <Test topics={["/foo"]} />
      </MockMessagePipelineProvider>
    );

    expect(Test.restore.mock.calls).toEqual([[undefined]]);
    expect(Test.addMessage.mock.calls).toEqual([[1, message]]);
    expect(Test.result.mock.calls).toEqual([[2]]);

    root.unmount();
  });

  it("calls addMessage for messages added later", async () => {
    const Test = createTest();

    Test.restore.mockReturnValue(1);
    Test.addMessage.mockImplementation((_, msg) => msg.message.value);

    const message1 = {
      op: "message",
      datatype: "Foo",
      topic: "/foo",
      receiveTime: { sec: 0, nsec: 0 },
      message: { value: 2 },
    };
    const message2 = {
      op: "message",
      datatype: "Bar",
      topic: "/bar",
      receiveTime: { sec: 0, nsec: 0 },
      message: { value: 3 },
    };

    const root = mount(
      <MockMessagePipelineProvider messages={[]}>
        <Test topics={["/foo"]} />
      </MockMessagePipelineProvider>
    );

    root.setProps({ messages: [message1] });

    expect(Test.restore.mock.calls).toEqual([[undefined]]);
    expect(Test.addMessage.mock.calls).toEqual([[1, message1]]);
    expect(Test.result.mock.calls).toEqual([[1], [2]]);

    // Subscribe to a new topic, then receive a message on that topic
    root.setProps({ children: <Test topics={["/foo", "/bar"]} /> });

    expect(Test.restore.mock.calls).toEqual([[undefined]]);
    expect(Test.addMessage.mock.calls).toEqual([[1, message1]]);
    expect(Test.result.mock.calls).toEqual([[1], [2], [2]]);

    root.setProps({ messages: [message2] });

    expect(Test.restore.mock.calls).toEqual([[undefined]]);
    expect(Test.addMessage.mock.calls).toEqual([[1, message1], [2, message2]]);
    expect(Test.result.mock.calls).toEqual([[1], [2], [2], [3]]);

    root.unmount();
  });

  it("does not filter out non-existing topics", () => {
    const Test = createTest();

    // Initial mount. Note that we haven't received any topics yet.
    const setSubscriptions = jest.fn();
    const root = mount(
      <MockMessagePipelineProvider setSubscriptions={setSubscriptions}>
        <Test topics={["/foo"]} />
      </MockMessagePipelineProvider>
    );

    // Updating to change topics.
    root.setProps({ children: <Test topics={["/foo", "/bar"]} /> });

    // And unsubscribes properly, too.
    root.unmount();
    expect(setSubscriptions.mock.calls).toEqual([
      [expect.any(String), [{ topic: "/foo" }]],
      [expect.any(String), [{ topic: "/foo" }, { topic: "/bar" }]],
      [expect.any(String), []],
    ]);
  });

  it("clears everything on seek", () => {
    const Test = createTest();

    Test.restore.mockReturnValue(1);
    Test.addMessage.mockImplementation((_, msg) => msg.message.value);

    const message1 = {
      op: "message",
      datatype: "Foo",
      topic: "/foo",
      receiveTime: { sec: 0, nsec: 0 },
      message: { value: 2 },
    };

    const root = mount(
      <MockMessagePipelineProvider messages={[]}>
        <Test topics={["/foo"]} />
      </MockMessagePipelineProvider>
    );

    root.setProps({ messages: [message1] });

    expect(Test.restore.mock.calls).toEqual([[undefined]]);
    expect(Test.addMessage.mock.calls).toEqual([[1, message1]]);
    expect(Test.result.mock.calls).toEqual([[1], [2]]);

    root.setProps({ messages: [], activeData: { lastSeekTime: 1 } });

    expect(Test.restore.mock.calls).toEqual([[undefined], [undefined]]);
    expect(Test.addMessage.mock.calls).toEqual([[1, message1]]);
    expect(Test.result.mock.calls).toEqual([[1], [2], [1]]);

    root.unmount();
  });

  it("doesn't re-render for messages on non-subscribed topics", async () => {
    const Test = createTest();

    Test.restore.mockReturnValue(1);
    Test.addMessage.mockImplementation((_, msg) => msg.message.value);

    const message1 = {
      op: "message",
      datatype: "Foo",
      topic: "/foo",
      receiveTime: { sec: 0, nsec: 0 },
      message: { value: 2 },
    };
    const message2 = {
      op: "message",
      datatype: "Bar",
      topic: "/bar",
      receiveTime: { sec: 0, nsec: 0 },
      message: { value: 3 },
    };

    const root = mount(
      <MockMessagePipelineProvider messages={[message1]}>
        <Test topics={["/foo"]} />
      </MockMessagePipelineProvider>
    );

    expect(Test.restore.mock.calls).toEqual([[undefined]]);
    expect(Test.addMessage.mock.calls).toEqual([[1, message1]]);
    expect(Test.result.mock.calls).toEqual([[2]]);

    root.setProps({ messages: [message2] });

    expect(Test.restore.mock.calls).toEqual([[undefined]]);
    expect(Test.addMessage.mock.calls).toEqual([[1, message1]]);
    expect(Test.result.mock.calls).toEqual([[2]]);

    root.unmount();
  });

  it("doesn't re-render when requested topics change", async () => {
    const Test = createTest();

    Test.restore.mockReturnValue(1);
    Test.addMessage.mockImplementation((_, msg) => msg.message.value);

    const message1 = {
      op: "message",
      datatype: "Foo",
      topic: "/foo",
      receiveTime: { sec: 0, nsec: 0 },
      message: { value: 2 },
    };
    const message2 = {
      op: "message",
      datatype: "Bar",
      topic: "/bar",
      receiveTime: { sec: 0, nsec: 0 },
      message: { value: 3 },
    };

    const root = mount(
      <MockMessagePipelineProvider messages={[message1, message2]}>
        <Test topics={["/bar"]} />
      </MockMessagePipelineProvider>
    );

    expect(Test.restore.mock.calls).toEqual([[undefined]]);
    expect(Test.addMessage.mock.calls).toEqual([[1, message2]]);
    expect(Test.result.mock.calls).toEqual([[3]]);

    // When topics change, we expect useMessageReducer NOT to call addMessage for pre-existing messages.
    // (If the player is playing, new messages will come in soon, and if it's paused, we'll backfill.)
    // This is because processing the same frame again might lead to duplicate or out-of-order
    // addMessages calls. If the user really cares about re-processing the current frame, they can
    // change their restore/addMessages reducers.
    root.setProps({ children: <Test topics={["/bar", "/foo"]} /> });

    expect(Test.restore.mock.calls).toEqual([[undefined]]);
    expect(Test.addMessage.mock.calls).toEqual([[1, message2]]);
    expect(Test.result.mock.calls).toEqual([[3], [3]]);

    root.unmount();
  });

  it("doesn't re-render when player topics or other playerState changes", async () => {
    const Test = createTest();

    Test.restore.mockReturnValue(1);
    Test.addMessage.mockImplementation((_, msg) => msg.message.value);

    const message = {
      op: "message",
      datatype: "Foo",
      topic: "/foo",
      receiveTime: { sec: 0, nsec: 0 },
      message: { value: 2 },
    };

    const root = mount(
      <MockMessagePipelineProvider messages={[message]}>
        <Test topics={["/foo"]} />
      </MockMessagePipelineProvider>
    );

    expect(Test.restore.mock.calls).toEqual([[undefined]]);
    expect(Test.addMessage.mock.calls).toEqual([[1, message]]);
    expect(Test.result.mock.calls).toEqual([[2]]);

    root.setProps({ topics: ["/foo", "/bar"] });
    root.setProps({ capabilities: ["some_capability"] });

    expect(Test.restore.mock.calls).toEqual([[undefined]]);
    expect(Test.addMessage.mock.calls).toEqual([[1, message]]);
    expect(Test.result.mock.calls).toEqual([[2]]);

    root.unmount();
  });

  it("doesn't re-render when activeData is empty", async () => {
    const Test = createTest();

    Test.restore.mockReturnValue(1);
    Test.addMessage.mockImplementation((_, msg) => msg.message.value);

    const root = mount(
      <MockMessagePipelineProvider noActiveData>
        <Test topics={["/foo"]} />
      </MockMessagePipelineProvider>
    );

    expect(Test.restore.mock.calls).toEqual([[undefined]]);
    expect(Test.addMessage.mock.calls).toEqual([]);
    expect(Test.result.mock.calls).toEqual([[1]]);

    root.setProps({ capabilities: ["some_capability"] });

    expect(Test.restore.mock.calls).toEqual([[undefined]]);
    expect(Test.addMessage.mock.calls).toEqual([]);
    expect(Test.result.mock.calls).toEqual([[1]]);

    root.unmount();
  });

  it("calls requestBackfill when topics change", async () => {
    const Test = createTest();
    const requestBackfill = jest.fn();

    // Calls `requestBackfill` initially.
    const root = mount(
      <MockMessagePipelineProvider requestBackfill={requestBackfill}>
        <Test topics={["/foo"]} />
      </MockMessagePipelineProvider>
    );
    expect(requestBackfill.mock.calls.length).toEqual(1);
    requestBackfill.mockClear();

    // Rendering again with the same topics should NOT result in any calls.
    root.setProps({ children: <Test topics={["/foo"]} /> });
    expect(requestBackfill.mock.calls.length).toEqual(0);
    requestBackfill.mockClear();

    // However, changing the topics results in another `requestBackfill` call.
    root.setProps({ children: <Test topics={["/foo", "/bar"]} /> });
    expect(requestBackfill.mock.calls.length).toEqual(1);
    requestBackfill.mockClear();

    // Passing in a different `addMessage` function should NOT result in any calls.
    Test.addMessage = () => {};
    root.setProps({ children: <Test topics={["/foo", "/bar"]} /> });
    expect(requestBackfill.mock.calls.length).toEqual(0);
    requestBackfill.mockClear();

    // Passing in a different `restore` function should NOT result in any calls.
    Test.restore = () => {};
    root.setProps({ children: <Test topics={["/foo", "/bar"]} /> });
    expect(requestBackfill.mock.calls.length).toEqual(0);
    requestBackfill.mockClear();

    root.unmount();
  });
});
