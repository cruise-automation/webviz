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
import { datatypes, messages } from "./fixture";
import { getRawItemsByTopicForTests } from "./MessageHistoryOnlyTopics";
import { datatypesReceived, frameReceived, topicsReceived } from "webviz-core/src/actions/player";
import Pipeline from "webviz-core/src/pipeline/Pipeline";
import reducer from "webviz-core/src/reducers";
import configureStore from "webviz-core/src/store/configureStore.testing";

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
      topicsReceived([{ name: "/some/topic", datatype: "dummy" }, { name: "/some/other/topic", datatype: "dummy" }])
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
    ]);
    expect(Pipeline.prototype.unsubscribe.mock.calls).toEqual([]);

    wrapper.setProps({ children: <MessageHistory paths={["/some/topic"]}>{() => null}</MessageHistory> });
    expect(Pipeline.prototype.subscribe.mock.calls).toEqual([
      [{ topic: "/some/topic" }],
      [{ topic: "/some/other/topic" }],
    ]);
    expect(Pipeline.prototype.unsubscribe.mock.calls).toEqual([[{ topic: "/some/other/topic" }]]);

    wrapper.unmount();
    expect(Pipeline.prototype.subscribe.mock.calls).toEqual([
      [{ topic: "/some/topic" }],
      [{ topic: "/some/other/topic" }],
    ]);
    expect(Pipeline.prototype.unsubscribe.mock.calls).toEqual([
      [{ topic: "/some/other/topic" }],
      [{ topic: "/some/topic" }],
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
    expect(Pipeline.prototype.subscribe.mock.calls).toEqual([]);
    expect(Pipeline.prototype.unsubscribe.mock.calls).toEqual([]);

    // But then it subscribes when the topic becomes available:
    store.dispatch(topicsReceived([{ name: "/some/topic", datatype: "dummy" }]));
    expect(Pipeline.prototype.subscribe.mock.calls).toEqual([[{ topic: "/some/topic" }]]);
    expect(Pipeline.prototype.unsubscribe.mock.calls).toEqual([]);

    // And unsubscribes properly, too.
    wrapper.unmount();
    expect(Pipeline.prototype.subscribe.mock.calls).toEqual([[{ topic: "/some/topic" }]]);
    expect(Pipeline.prototype.unsubscribe.mock.calls).toEqual([[{ topic: "/some/topic" }]]);

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

    expect(Pipeline.prototype.subscribe.mock.calls).toContainOnly([[{ requester: undefined, topic: "/some/topic" }]]);
    expect(Pipeline.prototype.unsubscribe.mock.calls).toEqual([]);

    // And unsubscribes properly, too.
    wrapper.unmount();
    expect(Pipeline.prototype.subscribe.mock.calls).toContainOnly([[{ requester: undefined, topic: "/some/topic" }]]);
    expect(Pipeline.prototype.unsubscribe.mock.calls).toEqual([[{ topic: "/some/topic" }]]);

    // Just a sanity check: in the end we should end up with the same number
    // of subscribes and unsubscribes.
    expect(Pipeline.prototype.subscribe.mock.calls.length).toEqual(Pipeline.prototype.unsubscribe.mock.calls.length);
  });

  it("properly registers the `historySize` of the first component (when it immediately loads a frame)", () => {
    const store = configureStore(reducer);
    store.dispatch(datatypesReceived(datatypes));
    store.dispatch(topicsReceived([{ name: "/some/topic", datatype: "some/topic" }]));
    store.dispatch(frameReceived({ "/some/topic": [messages[0], messages[1]] }));
    mount(
      <Provider store={store}>
        <MessageHistory historySize={1} paths={["/some/topic"]}>
          {() => null}
        </MessageHistory>
      </Provider>
    );
    store.dispatch(frameReceived({ "/some/topic": [] }));

    expect(getRawItemsByTopicForTests()["/some/topic"].length).toEqual(1);
  });

  it("only uses `historySize` of currently mounted components", () => {
    const store = configureStore(reducer);
    store.dispatch(datatypesReceived(datatypes));
    store.dispatch(topicsReceived([{ name: "/some/topic", datatype: "some/topic" }]));

    // Dummy component with unlimited `historySize` which we unmount before even loading a frame.
    mount(
      <Provider store={store}>
        <MessageHistory paths={["/some/topic"]}>{() => null}</MessageHistory>
      </Provider>
    ).unmount();

    // Actual component with `historySize={1}` that loads a frame.
    mount(
      <Provider store={store}>
        <MessageHistory historySize={1} paths={["/some/topic"]}>
          {() => null}
        </MessageHistory>
      </Provider>
    );
    store.dispatch(frameReceived({ "/some/topic": [messages[0], messages[1]] }));

    expect(getRawItemsByTopicForTests()["/some/topic"].length).toEqual(1);
  });

  it("allows changing historySize", () => {
    const store = configureStore(reducer);
    store.dispatch(datatypesReceived(datatypes));
    store.dispatch(topicsReceived([{ name: "/some/topic", datatype: "some/topic" }]));

    const wrapper = mount(
      <Provider store={store}>
        <MessageHistory historySize={1} paths={["/some/topic"]}>
          {() => null}
        </MessageHistory>
      </Provider>
    );
    wrapper.setProps({
      children: (
        <MessageHistory historySize={2} paths={["/some/topic"]}>
          {() => null}
        </MessageHistory>
      ),
    });

    store.dispatch(frameReceived({ "/some/topic": [messages[0], messages[1], messages[2]] }));

    expect(getRawItemsByTopicForTests()["/some/topic"].length).toEqual(2);
  });

  it("buffers messages (with historySize=2)", () => {
    // Start with just the first two messages.
    const store = configureStore(reducer);
    store.dispatch(datatypesReceived(datatypes));
    store.dispatch(topicsReceived([{ name: "/some/topic", datatype: "some/topic" }]));
    store.dispatch(frameReceived({ "/some/topic": [messages[0], messages[1]] }));
    const childFn = jest.fn().mockReturnValue(null);
    mount(
      <Provider store={store}>
        <MessageHistory paths={["/some/topic"]} historySize={2}>
          {childFn}
        </MessageHistory>
      </Provider>
    );
    expect(childFn.mock.calls.length).toEqual(1);
    expect(last(childFn.mock.calls)).toEqual([
      {
        itemsByPath: {
          "/some/topic": [
            {
              message: messages[0],
              queriedData: [{ value: messages[0].message, path: "/some/topic" }],
            },
            {
              message: messages[1],
              queriedData: [{ value: messages[1].message, path: "/some/topic" }],
            },
          ],
        },
        cleared: false,
        metadataByPath: { "/some/topic": expect.any(Object) },
        startTime: expect.any(Object),
      },
    ]);

    // Then let's send in the last message too, and it should discard the older message
    // (since bufferSize=2).
    store.dispatch(frameReceived({ "/some/topic": [messages[2]] }));
    expect(childFn.mock.calls.length).toEqual(2);
    expect(last(childFn.mock.calls)).toEqual([
      {
        itemsByPath: {
          "/some/topic": [
            {
              message: messages[1],
              queriedData: [{ value: messages[1].message, path: "/some/topic" }],
            },
            {
              message: messages[2],
              queriedData: [{ value: messages[2].message, path: "/some/topic" }],
            },
          ],
        },
        cleared: false,
        metadataByPath: { "/some/topic": expect.any(Object) },
        startTime: expect.any(Object),
      },
    ]);
  });

  it("clears everything on seek", () => {
    const store = configureStore(reducer);
    store.dispatch(datatypesReceived(datatypes));
    store.dispatch(topicsReceived([{ name: "/some/topic", datatype: "some/topic" }]));
    store.dispatch(
      frameReceived({
        "/some/topic": [
          {
            op: "message",
            datatype: "some/topic",
            topic: "/some/topic",
            receiveTime: { sec: 1000, nsec: 0 }, // different time than above
            message: {},
          },
        ],
      })
    );
    const childFn = jest.fn().mockReturnValue(null);
    mount(
      <Provider store={store}>
        <MessageHistory paths={["/some/topic"]}>{childFn}</MessageHistory>
      </Provider>
    );
    expect(childFn.mock.calls.length).toEqual(1);
    expect(last(childFn.mock.calls)).toEqual([
      {
        itemsByPath: {
          "/some/topic": [
            {
              message: {
                op: "message",
                datatype: "some/topic",
                topic: "/some/topic",
                receiveTime: { sec: 1000, nsec: 0 },
                message: {},
              },
              queriedData: [{ value: {}, path: "/some/topic" }],
            },
          ],
        },
        cleared: false,
        metadataByPath: { "/some/topic": expect.any(Object) },
        startTime: expect.any(Object),
      },
    ]);

    // Do the seek, and make sure we clear things out.
    store.dispatch({ type: "PLAYBACK_RESET" });
    expect(childFn.mock.calls.length).toEqual(2);
    expect(last(childFn.mock.calls)).toEqual([
      {
        itemsByPath: { "/some/topic": [] },
        cleared: true,
        metadataByPath: { "/some/topic": expect.any(Object) },
        startTime: expect.any(Object),
      },
    ]);
  });

  it("returns the same when passing in a topic twice", () => {
    const store = configureStore(reducer);
    store.dispatch(datatypesReceived(datatypes));
    store.dispatch(topicsReceived([{ name: "/some/topic", datatype: "some/topic" }]));
    store.dispatch(frameReceived({ "/some/topic": [messages[0], messages[1]] }));
    const childFn1 = jest.fn().mockReturnValue(null);
    mount(
      <Provider store={store}>
        <MessageHistory paths={["/some/topic"]}>{childFn1}</MessageHistory>
      </Provider>
    );
    const childFn2 = jest.fn().mockReturnValue(null);
    mount(
      <Provider store={store}>
        <MessageHistory paths={["/some/topic", "/some/topic"]}>{childFn2}</MessageHistory>
      </Provider>
    );
    expect(childFn2.mock.calls).toEqual(childFn1.mock.calls);
  });

  it("caches older messages when instantiating a new component", () => {
    const store = configureStore(reducer);
    store.dispatch(datatypesReceived(datatypes));
    store.dispatch(topicsReceived([{ name: "/some/topic", datatype: "some/topic" }]));
    store.dispatch(frameReceived({ "/some/topic": [messages[0]] }));
    const childFn1 = jest.fn().mockReturnValue(null);
    mount(
      <Provider store={store}>
        <MessageHistory paths={["/some/topic"]}>{childFn1}</MessageHistory>
      </Provider>
    );
    store.dispatch(frameReceived({ "/some/topic": [messages[1]] }));
    const childFn2 = jest.fn().mockReturnValue(null);
    mount(
      <Provider store={store}>
        <MessageHistory paths={["/some/topic"]}>{childFn2}</MessageHistory>
      </Provider>
    );
    expect(last(childFn2.mock.calls)).toEqual(last(childFn1.mock.calls));
  });

  it("lets you drill down in a path", () => {
    const store = configureStore(reducer);
    store.dispatch(datatypesReceived(datatypes));
    store.dispatch(topicsReceived([{ name: "/some/topic", datatype: "some/topic" }]));
    store.dispatch(frameReceived({ "/some/topic": [messages[0], messages[1]] }));
    const childFn = jest.fn().mockReturnValue(null);
    mount(
      <Provider store={store}>
        <MessageHistory paths={["/some/topic.index"]}>{childFn}</MessageHistory>
      </Provider>
    );
    expect(childFn.mock.calls).toEqual([
      [
        {
          itemsByPath: {
            "/some/topic.index": [
              {
                message: messages[0],
                queriedData: [{ path: "/some/topic.index", value: 0 }],
              },
              {
                message: messages[1],
                queriedData: [{ path: "/some/topic.index", value: 1 }],
              },
            ],
          },
          cleared: false,
          metadataByPath: { "/some/topic.index": expect.any(Object) },
          startTime: expect.any(Object),
        },
      ],
    ]);
  });

  it("remembers data when changing topics", () => {
    const store = configureStore(reducer);
    store.dispatch(
      topicsReceived([{ name: "/some/topic", datatype: "dummy" }, { name: "/some/other/topic", datatype: "dummy" }])
    );
    const childFn = jest.fn().mockReturnValue(null);
    const wrapper = mount(
      <Provider store={store}>
        <MessageHistory paths={["/some/topic"]}>{childFn}</MessageHistory>
      </Provider>
    );
    store.dispatch(frameReceived({ "/some/topic": [messages[0]] }));
    expect(childFn.mock.calls.length).toEqual(2);
    expect(last(childFn.mock.calls)).toEqual([
      {
        itemsByPath: {
          "/some/topic": [
            {
              message: messages[0],
              queriedData: [],
            },
          ],
        },
        cleared: false,
        metadataByPath: { "/some/topic": undefined },
        startTime: expect.any(Object),
      },
    ]);

    // Change props, and we expect to get another call with the same data.
    wrapper.setProps({
      children: <MessageHistory paths={["/some/topic", "/some/other/topic"]}>{childFn}</MessageHistory>,
    });
    expect(childFn.mock.calls.length).toEqual(3);
    expect(last(childFn.mock.calls)).toEqual([
      {
        itemsByPath: {
          "/some/topic": childFn.mock.calls[1][0].itemsByPath["/some/topic"],
          "/some/other/topic": [],
        },
        cleared: false,
        metadataByPath: { "/some/topic": undefined, "/some/other/topic": undefined },
        startTime: expect.any(Object),
      },
    ]);
  });

  it("return the same itemsByPath (identity) if the MessageHistory props did not change but children changed", () => {
    const store = configureStore(reducer);
    const paths = ["/some/topic"];
    store.dispatch(
      topicsReceived([{ name: "/some/topic", datatype: "dummy" }, { name: "/some/other/topic", datatype: "dummy" }])
    );
    store.dispatch(frameReceived({ "/some/topic": [messages[0], messages[1]] }));

    const allItemsByPath = [];
    const ChildExample = ({ value, itemsByPath }) => {
      allItemsByPath.push(itemsByPath);
      return <div>{`value: ${value}`}</div>;
    };

    const Test = ({ value }) => {
      return (
        <Provider store={store}>
          <MessageHistory paths={paths}>
            {({ itemsByPath }) => <ChildExample value={value} itemsByPath={itemsByPath} />}
          </MessageHistory>
        </Provider>
      );
    };
    const wrapper = mount(<Test value={0} />);
    expect(wrapper.text()).toEqual("value: 0");
    wrapper.setProps({ value: 1 });

    expect(allItemsByPath).toHaveLength(2);
    expect(allItemsByPath[0]["/some/topic"]).toBe(allItemsByPath[1]["/some/topic"]);
    expect(wrapper.text()).toEqual("value: 1");
  });

  it("return different itemsByPath if other props have changed", () => {
    const store = configureStore(reducer);
    store.dispatch(
      topicsReceived([{ name: "/some/topic", datatype: "dummy" }, { name: "/some/topic1", datatype: "dummy" }])
    );
    store.dispatch(frameReceived({ "/some/topic": [messages[0], messages[1]] }));

    const allItemsByPath = [];
    const ChildExample = ({ itemsByPath }) => {
      allItemsByPath.push(itemsByPath);
      return null;
    };

    const Test = (props) => {
      return (
        <Provider store={store}>
          <MessageHistory {...props}>{({ itemsByPath }) => <ChildExample itemsByPath={itemsByPath} />}</MessageHistory>
        </Provider>
      );
    };
    const wrapper = mount(<Test paths={["/some/topic", "/some/topic1"]} historySize={1} imageScale={0.5} />);
    wrapper.setProps({ paths: ["/some/topic1"] });
    wrapper.setProps({ historySize: 2 });
    store.dispatch(
      frameReceived({
        "/some/topic1": [
          {
            op: "message",
            datatype: "some/topic1",
            topic: "/some/topic1",
            receiveTime: { sec: 101, nsec: 0 },
            message: { index: 3 },
          },
        ],
      })
    );

    expect(allItemsByPath).toEqual([
      // first mount
      {
        "/some/topic": [
          {
            message: {
              datatype: "some/topic",
              message: { index: 1 },
              op: "message",
              receiveTime: { nsec: 0, sec: 101 },
              topic: "/some/topic",
            },
            queriedData: [],
          },
        ],
        "/some/topic1": [],
      },

      // set prop: paths
      { "/some/topic1": [] },

      // set prop: historySize
      { "/some/topic1": [] },

      // received new frames
      {
        "/some/topic1": [
          {
            message: {
              datatype: "some/topic1",
              message: { index: 3 },
              op: "message",
              receiveTime: { nsec: 0, sec: 101 },
              topic: "/some/topic1",
            },
            queriedData: [],
          },
        ],
      },
    ]);
  });
});
