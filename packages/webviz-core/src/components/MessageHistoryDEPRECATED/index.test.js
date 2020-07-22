// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { mount } from "enzyme";
import { createMemoryHistory } from "history";
import { last } from "lodash";
import React from "react";

import MessageHistoryDEPRECATED from ".";
import { datatypes, messages } from "./fixture";
import { setGlobalVariables } from "webviz-core/src/actions/panels";
import { MockMessagePipelineProvider } from "webviz-core/src/components/MessagePipeline";
import createRootReducer from "webviz-core/src/reducers";
import configureStore from "webviz-core/src/store/configureStore.testing";

const singleTopic = [{ name: "/some/topic", datatype: "some/datatype" }];

describe("<MessageHistoryDEPRECATED />", () => {
  it("passes through children", () => {
    const provider = mount(
      <MockMessagePipelineProvider>
        <MessageHistoryDEPRECATED paths={[]}>{() => <div>Hello!</div>}</MessageHistoryDEPRECATED>
      </MockMessagePipelineProvider>
    );
    expect(provider.text()).toEqual("Hello!");
  });

  it("(un)subscribes based on `topics`", () => {
    const setSubscriptions = jest.fn();
    const provider = mount(
      <MockMessagePipelineProvider
        topics={[{ name: "/some/topic", datatype: "dummy" }, { name: "/some/other/topic", datatype: "dummy" }]}
        setSubscriptions={setSubscriptions}>
        <MessageHistoryDEPRECATED paths={["/some/topic", "/some/other/topic"]}>{() => null}</MessageHistoryDEPRECATED>
      </MockMessagePipelineProvider>
    );

    provider.setProps({
      children: <MessageHistoryDEPRECATED paths={["/some/topic"]}>{() => null}</MessageHistoryDEPRECATED>,
    });

    provider.unmount();

    expect(setSubscriptions.mock.calls).toEqual([
      [expect.any(String), [{ topic: "/some/topic" }, { topic: "/some/other/topic" }]],
      [expect.any(String), [{ topic: "/some/topic" }]],
      [expect.any(String), []],
    ]);
  });

  it("does not filter out non-existing topics", () => {
    // Initial mount. Note that we haven't received any topics yet.
    const setSubscriptions = jest.fn();
    const provider = mount(
      <MockMessagePipelineProvider setSubscriptions={setSubscriptions}>
        <MessageHistoryDEPRECATED paths={["/some/topic"]}>{() => null}</MessageHistoryDEPRECATED>
      </MockMessagePipelineProvider>
    );

    // Updating to change topics
    provider.setProps({
      children: (
        <MessageHistoryDEPRECATED paths={["/some/topic", "/some/other/topic"]}>{() => null}</MessageHistoryDEPRECATED>
      ),
    });

    // And unsubscribes properly, too.
    provider.unmount();
    expect(setSubscriptions.mock.calls).toEqual([
      [expect.any(String), [{ topic: "/some/topic" }]],
      [expect.any(String), [{ topic: "/some/topic" }, { topic: "/some/other/topic" }]],
      [expect.any(String), []],
    ]);
  });

  it("allows changing historySize", () => {
    const childFn = jest.fn().mockReturnValue(null);
    const provider = mount(
      <MockMessagePipelineProvider datatypes={{}} topics={singleTopic}>
        <MessageHistoryDEPRECATED historySize={1} paths={["/some/topic"]}>
          {childFn}
        </MessageHistoryDEPRECATED>
      </MockMessagePipelineProvider>
    );
    provider.setProps({
      children: (
        <MessageHistoryDEPRECATED historySize={2} paths={["/some/topic"]}>
          {childFn}
        </MessageHistoryDEPRECATED>
      ),
    });
    provider.setProps({ messages: [messages[0], messages[1], messages[2]] });

    expect(childFn.mock.calls).toEqual([
      [
        {
          itemsByPath: { "/some/topic": [] },
          startTime: { sec: 100, nsec: 0 },
        },
      ],
      [
        {
          itemsByPath: { "/some/topic": [] },
          startTime: { sec: 100, nsec: 0 },
        },
      ],
      [
        {
          itemsByPath: {
            "/some/topic": [{ message: messages[1], queriedData: [] }, { message: messages[2], queriedData: [] }],
          },
          startTime: { sec: 100, nsec: 0 },
        },
      ],
    ]);
  });

  it("buffers messages (with historySize=2)", () => {
    // Start with just the first two messages.
    const childFn = jest.fn().mockReturnValue(null);
    const provider = mount(
      <MockMessagePipelineProvider topics={singleTopic} datatypes={datatypes} messages={[messages[0], messages[1]]}>
        <MessageHistoryDEPRECATED paths={["/some/topic"]} historySize={2}>
          {childFn}
        </MessageHistoryDEPRECATED>
      </MockMessagePipelineProvider>
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
        startTime: expect.any(Object),
      },
    ]);

    // Then let's send in the last message too, and it should discard the older message
    // (since bufferSize=2).
    provider.setProps({ messages: [messages[2]] });
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
        startTime: expect.any(Object),
      },
    ]);
  });

  it("clears everything on seek", () => {
    const childFn = jest.fn().mockReturnValue(null);
    const provider = mount(
      <MockMessagePipelineProvider topics={singleTopic} datatypes={datatypes} messages={[messages[0]]}>
        <MessageHistoryDEPRECATED paths={["/some/topic"]}>{childFn}</MessageHistoryDEPRECATED>
      </MockMessagePipelineProvider>
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
          ],
        },
        startTime: expect.any(Object),
      },
    ]);

    // Do the seek, and make sure we clear things out.
    provider.setProps({ messages: [], activeData: { lastSeekTime: 1 } });
    expect(childFn.mock.calls.length).toEqual(2);
    expect(last(childFn.mock.calls)).toEqual([
      {
        itemsByPath: { "/some/topic": [] },
        startTime: expect.any(Object),
      },
    ]);
  });

  it("returns the same when passing in a topic twice", () => {
    const childFn1 = jest.fn().mockReturnValue(null);
    const childFn2 = jest.fn().mockReturnValue(null);
    mount(
      <MockMessagePipelineProvider topics={singleTopic} datatypes={datatypes} messages={[messages[0], messages[1]]}>
        <MessageHistoryDEPRECATED paths={["/some/topic"]}>{childFn1}</MessageHistoryDEPRECATED>
        <MessageHistoryDEPRECATED paths={["/some/topic", "/some/topic"]}>{childFn2}</MessageHistoryDEPRECATED>
      </MockMessagePipelineProvider>
    );
    expect(childFn2.mock.calls).toEqual(childFn1.mock.calls);
  });

  it("lets you drill down in a path", () => {
    const childFn = jest.fn().mockReturnValue(null);
    mount(
      <MockMessagePipelineProvider topics={singleTopic} datatypes={datatypes} messages={[messages[0], messages[1]]}>
        <MessageHistoryDEPRECATED paths={["/some/topic.index"]}>{childFn}</MessageHistoryDEPRECATED>
      </MockMessagePipelineProvider>
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
          startTime: expect.any(Object),
        },
      ],
    ]);
  });

  it("remembers data when changing topics", () => {
    const childFn = jest.fn().mockReturnValue(null);
    const provider = mount(
      <MockMessagePipelineProvider
        topics={[{ name: "/some/topic", datatype: "some/datatype" }, { name: "/some/other/topic", datatype: "dummy" }]}
        datatypes={datatypes}
        messages={[messages[0]]}>
        <MessageHistoryDEPRECATED paths={["/some/topic"]}>{childFn}</MessageHistoryDEPRECATED>
      </MockMessagePipelineProvider>
    );
    expect(childFn.mock.calls.length).toEqual(1);
    expect(last(childFn.mock.calls)).toEqual([
      {
        itemsByPath: {
          "/some/topic": [
            {
              message: messages[0],
              queriedData: [{ path: "/some/topic", value: messages[0].message }],
            },
          ],
        },
        startTime: expect.any(Object),
      },
    ]);

    // Add a new path, and we should get another call with the same data
    provider.setProps({
      children: (
        <MessageHistoryDEPRECATED paths={["/some/topic", "/some/other/topic"]}>{childFn}</MessageHistoryDEPRECATED>
      ),
    });
    expect(childFn.mock.calls.length).toEqual(2);
    expect(last(childFn.mock.calls)).toEqual([
      {
        itemsByPath: {
          "/some/topic": [
            {
              message: messages[0],
              queriedData: [{ path: "/some/topic", value: messages[0].message }],
            },
          ],
          "/some/other/topic": [],
        },
        startTime: expect.any(Object),
      },
    ]);
  });

  it("remembers data when changing paths on an existing topic", () => {
    const childFn = jest.fn().mockReturnValue(null);
    const provider = mount(
      <MockMessagePipelineProvider
        topics={[{ name: "/some/topic", datatype: "some/datatype" }, { name: "/some/other/topic", datatype: "dummy" }]}
        datatypes={datatypes}
        messages={[messages[0]]}>
        <MessageHistoryDEPRECATED paths={["/some/topic"]}>{childFn}</MessageHistoryDEPRECATED>
      </MockMessagePipelineProvider>
    );
    expect(childFn.mock.calls.length).toEqual(1);
    expect(last(childFn.mock.calls)).toEqual([
      {
        itemsByPath: {
          "/some/topic": [
            {
              message: messages[0],
              queriedData: [{ path: "/some/topic", value: messages[0].message }],
            },
          ],
        },
        startTime: expect.any(Object),
      },
    ]);

    // Change an existing path, and we should restore the data from the previous path on the same topic
    provider.setProps({
      children: <MessageHistoryDEPRECATED paths={["/some/topic.index"]}>{childFn}</MessageHistoryDEPRECATED>,
    });
    expect(childFn.mock.calls.length).toEqual(2);
    expect(last(childFn.mock.calls)).toEqual([
      {
        itemsByPath: {
          "/some/topic.index": [
            {
              message: messages[0],
              queriedData: [{ path: "/some/topic.index", value: 0 }],
            },
          ],
        },
        startTime: expect.any(Object),
      },
    ]);
  });

  describe("global variables in paths", () => {
    const exampleDatatypes = {
      "dtype/Foo": { fields: [{ name: "bars", type: "dtype/Bar", isArray: true, isComplex: true }] },
      "dtype/Bar": { fields: [{ name: "index", type: "int32" }, { name: "baz", type: "int32" }] },
    };

    const message = {
      topic: "/some/topic",
      receiveTime: { sec: 100, nsec: 0 },
      message: { bars: [{ index: 0, baz: 10 }, { index: 1, baz: 11 }, { index: 2, baz: 12 }] },
    };
    it("updates queriedData when a global variable changes", () => {
      const childFn = jest.fn().mockReturnValue(null);

      const store = configureStore(createRootReducer(createMemoryHistory()));

      store.dispatch(setGlobalVariables({ foo: 0 }));

      const provider = mount(
        <MockMessagePipelineProvider
          store={store}
          topics={[{ name: "/some/topic", datatype: "dtype/Foo" }]}
          datatypes={exampleDatatypes}
          messages={[message]}>
          <MessageHistoryDEPRECATED paths={["/some/topic.bars[:]{index==$foo}.baz"]}>
            {childFn}
          </MessageHistoryDEPRECATED>
        </MockMessagePipelineProvider>
      );
      expect(childFn.mock.calls).toEqual([
        [
          {
            itemsByPath: {
              "/some/topic.bars[:]{index==$foo}.baz": [
                {
                  message,
                  queriedData: [{ path: "/some/topic.bars[:]{index==$foo}.baz", value: 10 }],
                },
              ],
            },
            startTime: expect.any(Object),
          },
        ],
      ]);
      childFn.mockClear();

      // when $foo changes to 1, queriedData.value should change to 11
      store.dispatch(setGlobalVariables({ foo: 1 }));
      expect(childFn.mock.calls).toEqual([
        [
          {
            itemsByPath: {
              "/some/topic.bars[:]{index==$foo}.baz": [
                {
                  message,
                  queriedData: [{ path: "/some/topic.bars[:]{index==$foo}.baz", value: 11 }],
                },
              ],
            },
            startTime: expect.any(Object),
          },
        ],
      ]);

      provider.unmount();
    });
  });

  it("supports changing a path for a previously-existing topic that no longer exists", () => {
    const childFn = jest.fn().mockReturnValue(null);
    const provider = mount(
      <MockMessagePipelineProvider
        topics={[{ name: "/some/topic", datatype: "some/datatype" }]}
        datatypes={datatypes}
        messages={[messages[0]]}>
        <MessageHistoryDEPRECATED paths={["/some/topic"]}>{childFn}</MessageHistoryDEPRECATED>
      </MockMessagePipelineProvider>
    );
    expect(childFn.mock.calls.length).toEqual(1);
    expect(last(childFn.mock.calls)).toEqual([
      {
        itemsByPath: {
          "/some/topic": [
            {
              message: messages[0],
              queriedData: [{ path: "/some/topic", value: messages[0].message }],
            },
          ],
        },
        startTime: expect.any(Object),
      },
    ]);

    provider.setProps({
      topics: [],
      datatypes: {},
      messages: [],
      children: <MessageHistoryDEPRECATED paths={["/some/topic.index"]}>{childFn}</MessageHistoryDEPRECATED>,
    });
    expect(childFn.mock.calls.length).toEqual(2);
    expect(last(childFn.mock.calls)).toEqual([
      {
        itemsByPath: {
          "/some/topic.index": [],
        },
        startTime: expect.any(Object),
      },
    ]);
  });

  it("ignores messages from non-subscribed topics", () => {
    const childFn = jest.fn().mockReturnValue(null);
    const provider = mount(
      <MockMessagePipelineProvider
        topics={[{ name: "/some/topic", datatype: "dummy" }, { name: "/some/other/topic", datatype: "dummy" }]}
        datatypes={datatypes}
        messages={[messages[0]]}>
        <MessageHistoryDEPRECATED paths={["/some/other/topic"]}>{childFn}</MessageHistoryDEPRECATED>
      </MockMessagePipelineProvider>
    );
    expect(childFn.mock.calls).toEqual([
      [
        {
          itemsByPath: { "/some/other/topic": [] },
          startTime: expect.any(Object),
        },
      ],
    ]);

    provider.setProps({ messages: [messages[1], messages[2]] });

    expect(childFn.mock.calls).toEqual([
      [
        {
          itemsByPath: { "/some/other/topic": [] },
          startTime: expect.any(Object),
        },
      ],
    ]);
  });

  it("return the same itemsByPath (identity) if the MessageHistory props did not change but children changed", () => {
    const paths = ["/some/topic"]; // Note that paths have to be identical.
    let itemsByPath1, itemsByPath2;
    const provider = mount(
      <MockMessagePipelineProvider
        topics={[{ name: "/some/topic", datatype: "dummy" }]}
        datatypes={datatypes}
        messages={[messages[0], messages[1]]}>
        <MessageHistoryDEPRECATED paths={paths}>
          {({ itemsByPath }) => {
            itemsByPath1 = itemsByPath;
            return null;
          }}
        </MessageHistoryDEPRECATED>
      </MockMessagePipelineProvider>
    );
    provider.setProps({
      children: (
        <MessageHistoryDEPRECATED paths={paths}>
          {({ itemsByPath }) => {
            itemsByPath2 = itemsByPath;
            return null;
          }}
        </MessageHistoryDEPRECATED>
      ),
    });
    expect(itemsByPath1).toBe(itemsByPath2);
  });
});
