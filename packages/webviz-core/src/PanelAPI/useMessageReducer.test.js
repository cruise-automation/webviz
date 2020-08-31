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
import { wrapJsObject } from "webviz-core/src/util/binaryObjects";

describe("useMessageReducer", () => {
  // Create a helper component that exposes restore, addMessage, and the results of the hook for mocking
  function createTest(useAddMessage: boolean = true, useAddMessages: boolean = false, useAddBobjects = false) {
    function Test({ topics, addMessagesOverride }: { topics: string[], addMessagesOverride?: any }) {
      try {
        Test.result(
          PanelAPI.useMessageReducer({
            topics,
            addMessage: useAddMessage ? Test.addMessage : undefined,
            addMessages: useAddMessages ? addMessagesOverride || Test.addMessages : undefined,
            addBobjects: useAddBobjects ? Test.addBobjects : undefined,
            restore: Test.restore,
          })
        );
      } catch (e) {
        Test.error(e);
      }
      return null;
    }
    Test.result = jest.fn();
    Test.error = jest.fn();
    Test.restore = jest.fn();
    Test.addMessage = jest.fn();
    Test.addMessages = jest.fn();
    Test.addBobjects = jest.fn();
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

  it.each([
    [{ useAddMessage: false, useAddMessages: false, useAddBobjects: false, shouldThrow: true }],
    [{ useAddMessage: false, useAddMessages: false, useAddBobjects: true, shouldThrow: false }],
    [{ useAddMessage: false, useAddMessages: true, useAddBobjects: false, shouldThrow: false }],
    [{ useAddMessage: false, useAddMessages: true, useAddBobjects: true, shouldThrow: true }],
    [{ useAddMessage: true, useAddMessages: false, useAddBobjects: false, shouldThrow: false }],
    [{ useAddMessage: true, useAddMessages: false, useAddBobjects: true, shouldThrow: true }],
    [{ useAddMessage: true, useAddMessages: true, useAddBobjects: false, shouldThrow: true }],
    [{ useAddMessage: true, useAddMessages: true, useAddBobjects: true, shouldThrow: true }],
  ])(
    "requires exactly one 'add' callback (%p)",
    async ({ useAddMessage, useAddMessages, useAddBobjects, shouldThrow }) => {
      const Test = createTest(useAddMessage, useAddMessages, useAddBobjects);
      mount(
        <MockMessagePipelineProvider>
          <Test topics={["/foo"]} />
        </MockMessagePipelineProvider>
      );
      if (shouldThrow) {
        expect(Test.result.mock.calls).toHaveLength(0);
        expect(Test.error.mock.calls).toHaveLength(1);
      } else {
        expect(Test.error.mock.calls).toHaveLength(0);
        expect(Test.result.mock.calls).toHaveLength(1);
      }
    }
  );

  it("calls restore to initialize and addMessage for initial messages", async () => {
    const Test = createTest();

    Test.restore.mockReturnValue(1);
    Test.addMessage.mockImplementation((_, msg) => msg.message.value);

    const message = {
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
    expect(Test.addMessages.mock.calls).toEqual([]);
    expect(Test.result.mock.calls).toEqual([[2]]);

    root.unmount();
  });

  it("calls restore to initialize and addMessages for initial messages", async () => {
    const Test = createTest(false, true);

    Test.restore.mockReturnValue(1);
    Test.addMessages.mockImplementation((_, msgs) => msgs[msgs.length - 1].message.value);

    const message = {
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
    expect(Test.addMessage.mock.calls).toEqual([]);
    expect(Test.addMessages.mock.calls).toEqual([[1, [message]]]);
    expect(Test.result.mock.calls).toEqual([[2]]);

    root.unmount();
  });

  it("calls restore to initialize and addBobjects for initial bobjects", async () => {
    const Test = createTest(false, false, true);

    Test.restore.mockReturnValue(1);
    Test.addBobjects.mockImplementation((_, msgs) => msgs[msgs.length - 1].message.sec());

    const message = {
      topic: "/foo",
      receiveTime: { sec: 0, nsec: 0 },
      message: wrapJsObject({}, "time", { sec: 1234, nsec: 5678 }),
    };

    const root = mount(
      <MockMessagePipelineProvider bobjects={[message]}>
        <Test topics={["/foo"]} />
      </MockMessagePipelineProvider>
    );

    expect(Test.restore.mock.calls).toEqual([[undefined]]);
    expect(Test.addMessage.mock.calls).toEqual([]);
    expect(Test.addMessages.mock.calls).toEqual([]);
    expect(Test.addBobjects.mock.calls).toEqual([[1, [message]]]);
    expect(Test.result.mock.calls).toEqual([[1234]]);

    root.unmount();
  });

  it("calls addMessage for messages added later", async () => {
    const Test = createTest();

    Test.restore.mockReturnValue(1);
    Test.addMessage.mockImplementation((_, msg) => msg.message.value);

    const message1 = {
      topic: "/foo",
      receiveTime: { sec: 0, nsec: 0 },
      message: { value: 2 },
    };
    const message2 = {
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

  it("calls addMessages for messages added later", async () => {
    const Test = createTest(false, true);

    Test.restore.mockReturnValue(1);
    Test.addMessages.mockImplementation((prevValue, msgs) => msgs[msgs.length - 1].message.value);

    const message1 = {
      topic: "/foo",
      receiveTime: { sec: 0, nsec: 0 },
      message: { value: 2 },
    };
    const message2 = {
      topic: "/bar",
      receiveTime: { sec: 0, nsec: 0 },
      message: { value: 3 },
    };
    const message3 = {
      topic: "/bar",
      receiveTime: { sec: 0, nsec: 0 },
      message: { value: 4 },
    };

    const root = mount(
      <MockMessagePipelineProvider messages={[]}>
        <Test topics={["/foo"]} />
      </MockMessagePipelineProvider>
    );

    root.setProps({ messages: [message1] });

    expect(Test.restore.mock.calls).toEqual([[undefined]]);
    expect(Test.addMessage.mock.calls).toEqual([]);
    expect(Test.addMessages.mock.calls).toEqual([[1, [message1]]]);
    expect(Test.result.mock.calls).toEqual([[1], [2]]);

    // Subscribe to a new topic, then receive a message on that topic
    root.setProps({ children: <Test topics={["/foo", "/bar"]} /> });

    expect(Test.restore.mock.calls).toEqual([[undefined]]);
    expect(Test.addMessage.mock.calls).toEqual([]);
    expect(Test.addMessages.mock.calls).toEqual([[1, [message1]]]);
    expect(Test.result.mock.calls).toEqual([[1], [2], [2]]);

    root.setProps({ messages: [message2, message3] });

    expect(Test.restore.mock.calls).toEqual([[undefined]]);
    expect(Test.addMessage.mock.calls).toEqual([]);
    expect(Test.addMessages.mock.calls).toEqual([[1, [message1]], [2, [message2, message3]]]);
    expect(Test.result.mock.calls).toEqual([[1], [2], [2], [4]]);

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
      [expect.any(String), [{ topic: "/foo", format: "parsedMessages", preloadingFallback: false }]],
      [
        expect.any(String),
        [
          { topic: "/foo", format: "parsedMessages", preloadingFallback: false },
          { topic: "/bar", format: "parsedMessages", preloadingFallback: false },
        ],
      ],
      [expect.any(String), []],
    ]);
  });

  it("clears everything on seek", () => {
    const Test = createTest();

    Test.restore.mockReturnValue(1);
    Test.addMessage.mockImplementation((_, msg) => msg.message.value);

    const message1 = {
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
      topic: "/foo",
      receiveTime: { sec: 0, nsec: 0 },
      message: { value: 2 },
    };
    const message2 = {
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
      topic: "/foo",
      receiveTime: { sec: 0, nsec: 0 },
      message: { value: 2 },
    };
    const message2 = {
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

  it("restore called when addMessages changes", async () => {
    const Test = createTest(false, true);

    Test.restore.mockReturnValue(1);
    Test.addMessages.mockImplementation((_, msgs) => msgs[msgs.length - 1].message.value);

    const message1 = {
      topic: "/foo",
      receiveTime: { sec: 0, nsec: 0 },
      message: { value: 2 },
    };

    const root = mount(
      <MockMessagePipelineProvider messages={[message1]}>
        <Test topics={["/foo"]} />
      </MockMessagePipelineProvider>
    );

    expect(Test.restore.mock.calls).toEqual([[undefined]]);
    expect(Test.result.mock.calls).toEqual([[2]]);
    root.setProps({ children: <Test topics={["/foo"]} addMessagesOverride={jest.fn()} /> });
    expect(Test.restore.mock.calls).toEqual([[undefined], [2]]);

    root.unmount();
  });
});
