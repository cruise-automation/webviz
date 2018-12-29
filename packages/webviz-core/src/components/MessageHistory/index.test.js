// @flow
//
//  Copyright (c) 2018-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { mount } from "enzyme";
import { last } from "lodash";
import React from "react";
import { Provider } from "react-redux";

import MessageHistory from ".";
import { datatypes, messagesWithHeader } from "./fixture";
import { getRawItemsByTopicForTests } from "./MessageHistoryOnlyTopics";
import { datatypesReceived, frameReceived, topicsReceived } from "webviz-core/src/actions/dataSource";
import Pipeline from "webviz-core/src/pipeline/Pipeline";
import reducer from "webviz-core/src/reducers";
import configureStore from "webviz-core/src/store/configureStore.testing";
import { CLOCK_TOPIC } from "webviz-core/src/util/globalConstants";

const messagesWithoutHeader = [
  {
    op: "message",
    datatype: "topic/without/header",
    topic: "/topic/without/header",
    receiveTime: { sec: 100, nsec: 0 },
    message: { index: 0 },
  },
  {
    op: "message",
    datatype: "topic/without/header",
    topic: "/topic/without/header",
    receiveTime: { sec: 101, nsec: 0 },
    message: { index: 1 },
  },
  {
    op: "message",
    datatype: "topic/without/header",
    topic: "/topic/without/header",
    receiveTime: { sec: 102, nsec: 0 },
    message: { index: 2 },
  },
  {
    op: "message",
    datatype: "topic/without/header",
    topic: "/topic/without/header",
    receiveTime: { sec: 103, nsec: 0 },
    message: { index: 3 },
  },
];

describe("<MessageHistory />", () => {
  beforeEach(() => {
    // $FlowFixMe
    Pipeline.prototype.subscribe = jest.fn();
    // $FlowFixMe
    Pipeline.prototype.unsubscribe = jest.fn();
  });

  it("passes through children", () => {
    const store = configureStore(reducer);
    const wrapper = mount(
      <Provider store={store}>
        <MessageHistory paths={[]}>{() => <div>Hello!</div>}</MessageHistory>
      </Provider>
    );
    expect(wrapper.text()).toEqual("Hello!");
  });

  it("(un)subscribes based on `topics`", () => {
    const store = configureStore(reducer);
    store.dispatch(
      topicsReceived([
        { name: "/some/topic", datatype: "dummy" },
        { name: "/some/other/topic", datatype: "dummy" },
        { name: CLOCK_TOPIC, datatype: "dummy" },
      ])
    );

    // Initial mount.
    const wrapper = mount(
      <Provider store={store}>
        <MessageHistory paths={["/some/topic", "/some/other/topic"]}>{() => null}</MessageHistory>
      </Provider>
    );
    expect(Pipeline.prototype.subscribe.mock.calls).toEqual([
      [{ topic: "/some/topic" }],
      [{ topic: "/some/other/topic" }],
      [{ topic: CLOCK_TOPIC }],
    ]);
    expect(Pipeline.prototype.unsubscribe.mock.calls).toEqual([]);

    // Changing props. Explicitly listen to the CLOCK_TOPIC to show that we
    // subscribe to it twice (which is intentional).
    wrapper.setProps({ children: <MessageHistory paths={["/some/topic", CLOCK_TOPIC]}>{() => null}</MessageHistory> });
    expect(Pipeline.prototype.subscribe.mock.calls).toEqual([
      [{ topic: "/some/topic" }],
      [{ topic: "/some/other/topic" }],
      [{ topic: CLOCK_TOPIC }],
      [{ topic: CLOCK_TOPIC }],
    ]);
    expect(Pipeline.prototype.unsubscribe.mock.calls).toEqual([[{ topic: "/some/other/topic" }]]);

    // Unmount. Note that we also unsubscribe from CLOCK_TOPIC twice.
    wrapper.unmount();
    expect(Pipeline.prototype.subscribe.mock.calls).toEqual([
      [{ topic: "/some/topic" }],
      [{ topic: "/some/other/topic" }],
      [{ topic: CLOCK_TOPIC }],
      [{ topic: CLOCK_TOPIC }],
    ]);
    expect(Pipeline.prototype.unsubscribe.mock.calls).toEqual([
      [{ topic: "/some/other/topic" }],
      [{ topic: CLOCK_TOPIC }],
      [{ topic: "/some/topic" }],
      [{ topic: CLOCK_TOPIC }],
    ]);

    // Just a sanity check: in the end we should end up with the same number
    // of subscribes and unsubscribes.
    expect(Pipeline.prototype.subscribe.mock.calls.length).toEqual(Pipeline.prototype.unsubscribe.mock.calls.length);
  });

  it("filters out non-existing topics when ignoreMissing is set", () => {
    const store = configureStore(reducer);

    // Initial mount. Note that we haven't received any topics yet.
    const wrapper = mount(
      <Provider store={store}>
        <MessageHistory ignoreMissing paths={["/some/topic"]}>
          {() => null}
        </MessageHistory>
      </Provider>
    );
    expect(Pipeline.prototype.subscribe.mock.calls).toEqual([[{ topic: CLOCK_TOPIC }]]);
    expect(Pipeline.prototype.unsubscribe.mock.calls).toEqual([]);

    // But then it subscribes when the topic becomes available:
    store.dispatch(
      topicsReceived([{ name: "/some/topic", datatype: "dummy" }, { name: CLOCK_TOPIC, datatype: "dummy" }])
    );
    expect(Pipeline.prototype.subscribe.mock.calls).toEqual([[{ topic: CLOCK_TOPIC }], [{ topic: "/some/topic" }]]);
    expect(Pipeline.prototype.unsubscribe.mock.calls).toEqual([]);

    // And unsubscribes properly, too.
    wrapper.unmount();
    expect(Pipeline.prototype.subscribe.mock.calls).toEqual([[{ topic: CLOCK_TOPIC }], [{ topic: "/some/topic" }]]);
    expect(Pipeline.prototype.unsubscribe.mock.calls).toEqual([[{ topic: CLOCK_TOPIC }], [{ topic: "/some/topic" }]]);

    // Just a sanity check: in the end we should end up with the same number
    // of subscribes and unsubscribes.
    expect(Pipeline.prototype.subscribe.mock.calls.length).toEqual(Pipeline.prototype.unsubscribe.mock.calls.length);
  });

  it("does not filter out non-existing topics when ignoreMissing is not set", () => {
    const store = configureStore(reducer);

    // Initial mount. Note that we haven't received any topics yet.
    const wrapper = mount(
      <Provider store={store}>
        <MessageHistory paths={["/some/topic"]}>{() => null}</MessageHistory>
      </Provider>
    );

    expect(Pipeline.prototype.subscribe.mock.calls).toContainOnly([
      [{ requester: undefined, topic: CLOCK_TOPIC }],
      [{ requester: undefined, topic: "/some/topic" }],
    ]);
    expect(Pipeline.prototype.unsubscribe.mock.calls).toEqual([]);

    // And unsubscribes properly, too.
    wrapper.unmount();
    expect(Pipeline.prototype.subscribe.mock.calls).toContainOnly([
      [{ requester: undefined, topic: CLOCK_TOPIC }],
      [{ requester: undefined, topic: "/some/topic" }],
    ]);
    expect(Pipeline.prototype.unsubscribe.mock.calls).toEqual([[{ topic: CLOCK_TOPIC }], [{ topic: "/some/topic" }]]);

    // Just a sanity check: in the end we should end up with the same number
    // of subscribes and unsubscribes.
    expect(Pipeline.prototype.subscribe.mock.calls.length).toEqual(Pipeline.prototype.unsubscribe.mock.calls.length);
  });

  it("properly registers the `historySize` of the first component (when it immediately loads a frame)", () => {
    const store = configureStore(reducer);
    store.dispatch(datatypesReceived(datatypes));
    store.dispatch(topicsReceived([{ name: "/topic/with/header", datatype: "topic/with/header" }]));
    store.dispatch(frameReceived({ "/topic/with/header": [messagesWithHeader[0], messagesWithHeader[1]] }));
    mount(
      <Provider store={store}>
        <MessageHistory historySize={1} paths={["/topic/with/header"]}>
          {() => null}
        </MessageHistory>
      </Provider>
    );
    store.dispatch(frameReceived({ "/topic/with/header": [] }));

    expect(getRawItemsByTopicForTests()["/topic/with/header"].length).toEqual(1);
  });

  it("only uses `historySize` of currently mounted components", () => {
    const store = configureStore(reducer);
    store.dispatch(datatypesReceived(datatypes));
    store.dispatch(topicsReceived([{ name: "/topic/with/header", datatype: "topic/with/header" }]));

    // Dummy component with unlimited `historySize` which we unmount before even loading a frame.
    mount(
      <Provider store={store}>
        <MessageHistory paths={["/topic/with/header"]}>{() => null}</MessageHistory>
      </Provider>
    ).unmount();

    // Actual component with `historySize={1}` that loads a frame.
    mount(
      <Provider store={store}>
        <MessageHistory historySize={1} paths={["/topic/with/header"]}>
          {() => null}
        </MessageHistory>
      </Provider>
    );
    store.dispatch(frameReceived({ "/topic/with/header": [messagesWithHeader[0], messagesWithHeader[1]] }));

    expect(getRawItemsByTopicForTests()["/topic/with/header"].length).toEqual(1);
  });

  it("allows changing historySize", () => {
    const store = configureStore(reducer);
    store.dispatch(datatypesReceived(datatypes));
    store.dispatch(topicsReceived([{ name: "/topic/with/header", datatype: "topic/with/header" }]));

    const wrapper = mount(
      <Provider store={store}>
        <MessageHistory historySize={1} paths={["/topic/with/header"]}>
          {() => null}
        </MessageHistory>
      </Provider>
    );
    wrapper.setProps({
      children: (
        <MessageHistory historySize={2} paths={["/topic/with/header"]}>
          {() => null}
        </MessageHistory>
      ),
    });

    store.dispatch(
      frameReceived({ "/topic/with/header": [messagesWithHeader[0], messagesWithHeader[1], messagesWithHeader[2]] })
    );

    expect(getRawItemsByTopicForTests()["/topic/with/header"].length).toEqual(2);
  });

  it("buffers messages with timestamps (with historySize=2)", () => {
    // Start with just the first two messages.
    const store = configureStore(reducer);
    store.dispatch(datatypesReceived(datatypes));
    store.dispatch(topicsReceived([{ name: "/topic/with/header", datatype: "topic/with/header" }]));
    store.dispatch(frameReceived({ "/topic/with/header": [messagesWithHeader[0], messagesWithHeader[1]] }));
    const childFn = jest.fn().mockReturnValue(null);
    mount(
      <Provider store={store}>
        <MessageHistory paths={["/topic/with/header"]} historySize={2}>
          {childFn}
        </MessageHistory>
      </Provider>
    );
    expect(childFn.mock.calls.length).toEqual(1);
    expect(last(childFn.mock.calls)).toEqual([
      {
        itemsByPath: {
          "/topic/with/header": [
            {
              timestamp: { sec: 100, nsec: 0 },
              elapsedSinceStart: { sec: 100, nsec: 0 },
              hasAccurateTimestamp: true,
              message: messagesWithHeader[0],
              queriedData: [{ value: messagesWithHeader[0].message, path: "/topic/with/header" }],
            },
            {
              timestamp: { sec: 101, nsec: 0 },
              elapsedSinceStart: { sec: 101, nsec: 0 },
              hasAccurateTimestamp: true,
              message: messagesWithHeader[1],
              queriedData: [{ value: messagesWithHeader[1].message, path: "/topic/with/header" }],
            },
          ],
        },
        cleared: false,
        metadataByPath: { "/topic/with/header": expect.any(Object) },
        startTime: expect.any(Object),
      },
    ]);

    // Then let's send in the last message too, and it should discard the older message
    // (since bufferSize=2).
    store.dispatch(frameReceived({ "/topic/with/header": [messagesWithHeader[2]] }));
    expect(childFn.mock.calls.length).toEqual(2);
    expect(last(childFn.mock.calls)).toEqual([
      {
        itemsByPath: {
          "/topic/with/header": [
            {
              timestamp: { sec: 101, nsec: 0 },
              elapsedSinceStart: { sec: 101, nsec: 0 },
              hasAccurateTimestamp: true,
              message: messagesWithHeader[1],
              queriedData: [{ value: messagesWithHeader[1].message, path: "/topic/with/header" }],
            },
            {
              timestamp: { sec: 102, nsec: 0 },
              elapsedSinceStart: { sec: 102, nsec: 0 },
              hasAccurateTimestamp: true,
              message: messagesWithHeader[2],
              queriedData: [{ value: messagesWithHeader[2].message, path: "/topic/with/header" }],
            },
          ],
        },
        cleared: false,
        metadataByPath: { "/topic/with/header": expect.any(Object) },
        startTime: expect.any(Object),
      },
    ]);
  });

  it("uses CLOCK_TOPIC for messages without timestamps (with historySize=2)", () => {
    const store = configureStore(reducer);
    store.dispatch(datatypesReceived(datatypes));
    store.dispatch(topicsReceived([{ name: "/topic/without/header", datatype: "topic/without/header" }]));
    const childFn = jest.fn().mockReturnValue(null);
    mount(
      <Provider store={store}>
        <MessageHistory paths={["/topic/without/header"]} historySize={2}>
          {childFn}
        </MessageHistory>
      </Provider>
    );
    expect(childFn.mock.calls.length).toEqual(1);
    expect(last(childFn.mock.calls)).toEqual([
      {
        itemsByPath: { "/topic/without/header": [] },
        cleared: false,
        metadataByPath: { "/topic/without/header": expect.any(Object) },
        startTime: expect.any(Object),
      },
    ]);

    // Then send a clock message, and another regular message, in the same frame.
    store.dispatch(
      frameReceived({
        "/topic/without/header": [messagesWithoutHeader[1]],
        [CLOCK_TOPIC]: [
          {
            op: "message",
            datatype: "ros/Clock",
            topic: CLOCK_TOPIC,
            receiveTime: { sec: 101, nsec: 0 },
            message: { clock: { sec: 101, nsec: 0 } },
          },
        ],
      })
    );
    expect(childFn.mock.calls.length).toEqual(2);
    expect(last(childFn.mock.calls)).toEqual([
      {
        itemsByPath: {
          "/topic/without/header": [
            {
              timestamp: { sec: 101, nsec: 0 },
              elapsedSinceStart: { sec: 101, nsec: 0 },
              hasAccurateTimestamp: false,
              message: messagesWithoutHeader[1],
              queriedData: [{ value: messagesWithoutHeader[1].message, path: "/topic/without/header" }],
            },
          ],
        },
        cleared: false,
        metadataByPath: { "/topic/without/header": expect.any(Object) },
        startTime: expect.any(Object),
      },
    ]);

    // Send another regular message; it should get the same timestamp as above.
    store.dispatch(frameReceived({ "/topic/without/header": [messagesWithoutHeader[2]] }));
    expect(childFn.mock.calls.length).toEqual(3);
    expect(last(childFn.mock.calls)).toEqual([
      {
        itemsByPath: {
          "/topic/without/header": [
            {
              timestamp: { sec: 101, nsec: 0 },
              elapsedSinceStart: { sec: 101, nsec: 0 },
              hasAccurateTimestamp: false,
              message: messagesWithoutHeader[1],
              queriedData: [{ value: messagesWithoutHeader[1].message, path: "/topic/without/header" }],
            },
            {
              timestamp: { sec: 101, nsec: 0 },
              elapsedSinceStart: { sec: 101, nsec: 0 },
              hasAccurateTimestamp: false,
              message: messagesWithoutHeader[2],
              queriedData: [{ value: messagesWithoutHeader[2].message, path: "/topic/without/header" }],
            },
          ],
        },
        cleared: false,
        metadataByPath: { "/topic/without/header": expect.any(Object) },
        startTime: expect.any(Object),
      },
    ]);

    // Send another clock, and another regular message, but this time in separate frames.
    // The first message should be discarded (since bufferSize=2).
    store.dispatch(
      frameReceived({
        [CLOCK_TOPIC]: [
          {
            op: "message",
            datatype: "ros/Clock",
            topic: CLOCK_TOPIC,
            receiveTime: { sec: 102, nsec: 0 },
            message: { clock: { sec: 102, nsec: 0 } },
          },
        ],
      })
    );
    store.dispatch(frameReceived({ "/topic/without/header": [messagesWithoutHeader[3]] }));
    expect(childFn.mock.calls.length).toEqual(4);
    expect(last(childFn.mock.calls)).toEqual([
      {
        itemsByPath: {
          "/topic/without/header": [
            {
              timestamp: { sec: 101, nsec: 0 },
              elapsedSinceStart: { sec: 101, nsec: 0 },
              hasAccurateTimestamp: false,
              message: messagesWithoutHeader[2],
              queriedData: [{ value: messagesWithoutHeader[2].message, path: "/topic/without/header" }],
            },
            {
              timestamp: { sec: 102, nsec: 0 },
              elapsedSinceStart: { sec: 102, nsec: 0 },
              hasAccurateTimestamp: false,
              message: messagesWithoutHeader[3],
              queriedData: [{ value: messagesWithoutHeader[3].message, path: "/topic/without/header" }],
            },
          ],
        },
        cleared: false,
        metadataByPath: { "/topic/without/header": expect.any(Object) },
        startTime: expect.any(Object),
      },
    ]);
  });

  it("uses message.receiveTime when all else fails", () => {
    // First start with one message which should get discarded.
    const store = configureStore(reducer);
    store.dispatch(datatypesReceived(datatypes));
    store.dispatch(topicsReceived([{ name: "/topic/without/header", datatype: "topic/without/header" }]));
    const message = { ...messagesWithoutHeader[0] };
    store.dispatch(frameReceived({ "/topic/without/header": [message] }));
    const childFn = jest.fn().mockReturnValue(null);
    mount(
      <Provider store={store}>
        <MessageHistory paths={["/topic/without/header"]} historySize={2}>
          {childFn}
        </MessageHistory>
      </Provider>
    );
    expect(childFn.mock.calls.length).toEqual(1);
    expect(last(childFn.mock.calls)).toEqual([
      {
        itemsByPath: {
          "/topic/without/header": [
            {
              elapsedSinceStart: { sec: 100, nsec: 0 },
              hasAccurateTimestamp: false,
              message,
              queriedData: [{ constantName: undefined, path: "/topic/without/header", value: { index: 0 } }],
              timestamp: { sec: 100, nsec: 0 },
            },
          ],
        },
        cleared: false,
        metadataByPath: { "/topic/without/header": expect.any(Object) },
        startTime: expect.any(Object),
      },
    ]);
  });

  it("clears everything on seek", () => {
    // Initialize the component with some data, and make sure that we send a CLOCK_TOPIC message so
    // that we can check that we forget the clock timestamp when seeking.
    const store = configureStore(reducer);
    store.dispatch(datatypesReceived(datatypes));
    store.dispatch(topicsReceived([{ name: "/topic/without/header", datatype: "topic/without/header" }]));
    store.dispatch(
      frameReceived({
        [CLOCK_TOPIC]: [
          {
            op: "message",
            datatype: "ros/Clock",
            topic: CLOCK_TOPIC,
            receiveTime: { sec: 100, nsec: 0 },
            message: { clock: { sec: 100, nsec: 0 } },
          },
        ],
        "/topic/without/header": [
          {
            op: "message",
            datatype: "topic/without/header",
            topic: "/topic/without/header",
            receiveTime: { sec: 1000, nsec: 0 }, // different time than above
            message: {},
          },
        ],
      })
    );
    const childFn = jest.fn().mockReturnValue(null);
    mount(
      <Provider store={store}>
        <MessageHistory paths={["/topic/without/header"]}>{childFn}</MessageHistory>
      </Provider>
    );
    expect(childFn.mock.calls.length).toEqual(1);
    expect(last(childFn.mock.calls)).toEqual([
      {
        itemsByPath: {
          "/topic/without/header": [
            {
              timestamp: { sec: 100, nsec: 0 },
              elapsedSinceStart: { sec: 100, nsec: 0 },
              hasAccurateTimestamp: false,
              message: {
                op: "message",
                datatype: "topic/without/header",
                topic: "/topic/without/header",
                receiveTime: { sec: 1000, nsec: 0 },
                message: {},
              },
              queriedData: [{ value: {}, path: "/topic/without/header" }],
            },
          ],
        },
        cleared: false,
        metadataByPath: { "/topic/without/header": expect.any(Object) },
        startTime: expect.any(Object),
      },
    ]);

    // Do the seek, and make sure we clear things out.
    store.dispatch({ type: "PLAYBACK_RESET" });
    expect(childFn.mock.calls.length).toEqual(2);
    expect(last(childFn.mock.calls)).toEqual([
      {
        itemsByPath: { "/topic/without/header": [] },
        cleared: true,
        metadataByPath: { "/topic/without/header": expect.any(Object) },
        startTime: expect.any(Object),
      },
    ]);
  });

  it("returns the same when passing in a topic twice", () => {
    const store = configureStore(reducer);
    store.dispatch(datatypesReceived(datatypes));
    store.dispatch(topicsReceived([{ name: "/topic/with/header", datatype: "topic/with/header" }]));
    store.dispatch(frameReceived({ "/topic/with/header": [messagesWithHeader[0], messagesWithHeader[1]] }));
    const childFn1 = jest.fn().mockReturnValue(null);
    mount(
      <Provider store={store}>
        <MessageHistory paths={["/topic/with/header"]}>{childFn1}</MessageHistory>
      </Provider>
    );
    const childFn2 = jest.fn().mockReturnValue(null);
    mount(
      <Provider store={store}>
        <MessageHistory paths={["/topic/with/header", "/topic/with/header"]}>{childFn2}</MessageHistory>
      </Provider>
    );
    expect(childFn2.mock.calls).toEqual(childFn1.mock.calls);
  });

  it("caches older messages when instantiating a new component", () => {
    const store = configureStore(reducer);
    store.dispatch(datatypesReceived(datatypes));
    store.dispatch(topicsReceived([{ name: "/topic/with/header", datatype: "topic/with/header" }]));
    store.dispatch(frameReceived({ "/topic/with/header": [messagesWithHeader[0]] }));
    const childFn1 = jest.fn().mockReturnValue(null);
    mount(
      <Provider store={store}>
        <MessageHistory paths={["/topic/with/header"]}>{childFn1}</MessageHistory>
      </Provider>
    );
    store.dispatch(frameReceived({ "/topic/with/header": [messagesWithHeader[1]] }));
    const childFn2 = jest.fn().mockReturnValue(null);
    mount(
      <Provider store={store}>
        <MessageHistory paths={["/topic/with/header"]}>{childFn2}</MessageHistory>
      </Provider>
    );
    expect(last(childFn2.mock.calls)).toEqual(last(childFn1.mock.calls));
  });

  it("lets you drill down in a path", () => {
    const store = configureStore(reducer);
    store.dispatch(datatypesReceived(datatypes));
    store.dispatch(topicsReceived([{ name: "/topic/with/header", datatype: "topic/with/header" }]));
    store.dispatch(frameReceived({ "/topic/with/header": [messagesWithHeader[0], messagesWithHeader[1]] }));
    const childFn = jest.fn().mockReturnValue(null);
    mount(
      <Provider store={store}>
        <MessageHistory paths={["/topic/with/header.header.stamp"]}>{childFn}</MessageHistory>
      </Provider>
    );
    expect(childFn.mock.calls).toEqual([
      [
        {
          itemsByPath: {
            "/topic/with/header.header.stamp": [
              {
                message: messagesWithHeader[0],
                timestamp: { sec: 100, nsec: 0 },
                elapsedSinceStart: { sec: 100, nsec: 0 },
                hasAccurateTimestamp: true,
                queriedData: [{ path: "/topic/with/header.header.stamp", value: { sec: 100, nsec: 0 } }],
              },
              {
                message: messagesWithHeader[1],
                timestamp: { sec: 101, nsec: 0 },
                elapsedSinceStart: { sec: 101, nsec: 0 },
                hasAccurateTimestamp: true,
                queriedData: [{ path: "/topic/with/header.header.stamp", value: { sec: 101, nsec: 0 } }],
              },
            ],
          },
          cleared: false,
          metadataByPath: { "/topic/with/header.header.stamp": expect.any(Object) },
          startTime: expect.any(Object),
        },
      ],
    ]);
  });

  it("remembers data when changing topics", () => {
    const store = configureStore(reducer);
    store.dispatch(
      topicsReceived([
        { name: "/topic/with/header", datatype: "dummy" },
        { name: "/some/other/topic", datatype: "dummy" },
        { name: CLOCK_TOPIC, datatype: "dummy" },
      ])
    );
    const childFn = jest.fn().mockReturnValue(null);
    const wrapper = mount(
      <Provider store={store}>
        <MessageHistory paths={["/topic/with/header"]}>{childFn}</MessageHistory>
      </Provider>
    );
    store.dispatch(frameReceived({ "/topic/with/header": [messagesWithHeader[0]] }));
    expect(childFn.mock.calls.length).toEqual(2);
    expect(last(childFn.mock.calls)).toEqual([
      {
        itemsByPath: {
          "/topic/with/header": [
            {
              timestamp: { sec: 100, nsec: 0 },
              elapsedSinceStart: { sec: 100, nsec: 0 },
              hasAccurateTimestamp: true,
              message: messagesWithHeader[0],
              queriedData: [],
            },
          ],
        },
        cleared: false,
        metadataByPath: { "/topic/with/header": undefined },
        startTime: expect.any(Object),
      },
    ]);

    // Change props, and we expect to get another call with the same data.
    wrapper.setProps({
      children: <MessageHistory paths={["/topic/with/header", "/some/other/topic"]}>{childFn}</MessageHistory>,
    });
    expect(childFn.mock.calls.length).toEqual(3);
    expect(last(childFn.mock.calls)).toEqual([
      {
        itemsByPath: {
          "/topic/with/header": childFn.mock.calls[1][0].itemsByPath["/topic/with/header"],
          "/some/other/topic": [],
        },
        cleared: false,
        metadataByPath: { "/topic/with/header": undefined, "/some/other/topic": undefined },
        startTime: expect.any(Object),
      },
    ]);
  });
});
