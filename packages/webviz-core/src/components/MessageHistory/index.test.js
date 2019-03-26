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

import MessageHistory from ".";
import { datatypes, messages } from "./fixture";
import { getRawItemsByTopicForTests } from "./MessageHistoryOnlyTopics";
import { MockMessagePipelineProvider } from "webviz-core/src/components/MessagePipeline";
import type { SubscribePayload } from "webviz-core/src/types/players";

const singleTopic = [{ name: "/some/topic", datatype: "some/topic" }];

describe("<MessageHistory />", () => {
  it("passes through children", () => {
    const provider = mount(
      <MockMessagePipelineProvider>
        <MessageHistory paths={[]}>{() => <div>Hello!</div>}</MessageHistory>
      </MockMessagePipelineProvider>
    );
    expect(provider.text()).toEqual("Hello!");
  });

  it("(un)subscribes based on `topics`", () => {
    let subscriptions: SubscribePayload[] = [];
    function setSubscriptions(_, s: SubscribePayload[]) {
      subscriptions = s;
    }
    const provider = mount(
      <MockMessagePipelineProvider
        topics={[{ name: "/some/topic", datatype: "dummy" }, { name: "/some/other/topic", datatype: "dummy" }]}
        setSubscriptions={setSubscriptions}>
        <MessageHistory paths={["/some/topic", "/some/other/topic"]}>{() => null}</MessageHistory>
      </MockMessagePipelineProvider>
    );
    expect(subscriptions).toEqual([{ topic: "/some/topic" }, { topic: "/some/other/topic" }]);

    provider.setProps({ children: <MessageHistory paths={["/some/topic"]}>{() => null}</MessageHistory> });
    expect(subscriptions).toEqual([{ topic: "/some/topic" }]);

    provider.unmount();
    expect(subscriptions).toEqual([]);
  });

  it("filters out non-existing topics when ignoreMissing is set", () => {
    // Initial mount. Note that we haven't received any topics yet.
    let subscriptions: SubscribePayload[] = [];
    function setSubscriptions(_, s: SubscribePayload[]) {
      subscriptions = s;
    }
    const provider = mount(
      <MockMessagePipelineProvider setSubscriptions={setSubscriptions}>
        <MessageHistory ignoreMissing paths={["/some/topic"]}>
          {() => null}
        </MessageHistory>
      </MockMessagePipelineProvider>
    );
    expect(subscriptions).toEqual([]);

    // But then it subscribes when the topic becomes available:
    provider.setProps({
      topics: [{ name: "/some/topic", datatype: "dummy" }, { name: "/some/other/topic", datatype: "dummy" }],
    });
    expect(subscriptions).toEqual([{ topic: "/some/topic" }]);

    // And unsubscribes properly, too.
    provider.unmount();
    expect(subscriptions).toEqual([]);
  });

  it("does not filter out non-existing topics when ignoreMissing is not set", () => {
    // Initial mount. Note that we haven't received any topics yet.
    let subscriptions: SubscribePayload[] = [];
    function setSubscriptions(_, s: SubscribePayload[]) {
      subscriptions = s;
    }
    const provider = mount(
      <MockMessagePipelineProvider setSubscriptions={setSubscriptions}>
        <MessageHistory paths={["/some/topic"]}>{() => null}</MessageHistory>
      </MockMessagePipelineProvider>
    );
    expect(subscriptions).toEqual([{ topic: "/some/topic" }]);

    // And unsubscribes properly, too.
    provider.unmount();
    expect(subscriptions).toEqual([]);
  });

  it("properly registers the `historySize` of the first component (when it immediately loads messages)", () => {
    mount(
      <MockMessagePipelineProvider messages={[messages[0], messages[1]]}>
        <MessageHistory paths={["/some/topic"]} historySize={1}>
          {() => null}
        </MessageHistory>
      </MockMessagePipelineProvider>
    );
    expect(getRawItemsByTopicForTests()["/some/topic"].length).toEqual(1);
  });

  it("only uses `historySize` of currently mounted components", () => {
    // Dummy component with unlimited `historySize` which we unmount before even loading messages.
    mount(
      <MockMessagePipelineProvider>
        <MessageHistory paths={["/some/topic"]}>{() => null}</MessageHistory>
      </MockMessagePipelineProvider>
    ).unmount();

    // Actual component with `historySize={1}` that loads messages.
    mount(
      <MockMessagePipelineProvider messages={[messages[0], messages[1]]}>
        <MessageHistory historySize={1} paths={["/some/topic"]}>
          {() => null}
        </MessageHistory>
      </MockMessagePipelineProvider>
    );

    expect(getRawItemsByTopicForTests()["/some/topic"].length).toEqual(1);
  });

  it("allows changing historySize", () => {
    const provider = mount(
      <MockMessagePipelineProvider>
        <MessageHistory historySize={1} paths={["/some/topic"]}>
          {() => null}
        </MessageHistory>
      </MockMessagePipelineProvider>
    );
    provider.setProps({
      children: (
        <MessageHistory historySize={2} paths={["/some/topic"]}>
          {() => null}
        </MessageHistory>
      ),
    });
    provider.setProps({ messages: [messages[0], messages[1], messages[2]] });

    expect(getRawItemsByTopicForTests()["/some/topic"].length).toEqual(2);
  });

  it("buffers messages (with historySize=2)", () => {
    // Start with just the first two messages.
    const childFn = jest.fn().mockReturnValue(null);
    const provider = mount(
      <MockMessagePipelineProvider topics={singleTopic} datatypes={datatypes} messages={[messages[0], messages[1]]}>
        <MessageHistory paths={["/some/topic"]} historySize={2}>
          {childFn}
        </MessageHistory>
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
        cleared: false,
        metadataByPath: { "/some/topic": expect.any(Object) },
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
        cleared: false,
        metadataByPath: { "/some/topic": expect.any(Object) },
        startTime: expect.any(Object),
      },
    ]);
  });

  it("clears everything on seek", () => {
    const childFn = jest.fn().mockReturnValue(null);
    const provider = mount(
      <MockMessagePipelineProvider topics={singleTopic} datatypes={datatypes} messages={[messages[0]]}>
        <MessageHistory paths={["/some/topic"]}>{childFn}</MessageHistory>
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
        cleared: false,
        metadataByPath: { "/some/topic": expect.any(Object) },
        startTime: expect.any(Object),
      },
    ]);

    // Do the seek, and make sure we clear things out.
    provider.setProps({ messages: [], activeData: { lastSeekTime: 1 } });
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
    const childFn1 = jest.fn().mockReturnValue(null);
    const childFn2 = jest.fn().mockReturnValue(null);
    mount(
      <MockMessagePipelineProvider topics={singleTopic} datatypes={datatypes} messages={[messages[0], messages[1]]}>
        <MessageHistory paths={["/some/topic"]}>{childFn1}</MessageHistory>
        <MessageHistory paths={["/some/topic", "/some/topic"]}>{childFn2}</MessageHistory>
      </MockMessagePipelineProvider>
    );
    expect(childFn2.mock.calls).toEqual(childFn1.mock.calls);
  });

  it("caches older messages when instantiating a new component", () => {
    const childFn1 = jest.fn().mockReturnValue(null);
    const provider = mount(
      <MockMessagePipelineProvider topics={singleTopic} datatypes={datatypes} messages={[messages[0]]}>
        <MessageHistory paths={["/some/topic"]}>{childFn1}</MessageHistory>
      </MockMessagePipelineProvider>
    );
    const childFn2 = jest.fn().mockReturnValue(null);
    provider.setProps({
      messages: [messages[1]],
      children: (
        <React.Fragment>
          <MessageHistory paths={["/some/topic"]}>{childFn1}</MessageHistory>
          <MessageHistory paths={["/some/topic"]}>{childFn2}</MessageHistory>
        </React.Fragment>
      ),
    });
    expect(last(childFn2.mock.calls)).toEqual(last(childFn1.mock.calls));
  });

  it("lets you drill down in a path", () => {
    const childFn = jest.fn().mockReturnValue(null);
    mount(
      <MockMessagePipelineProvider topics={singleTopic} datatypes={datatypes} messages={[messages[0], messages[1]]}>
        <MessageHistory paths={["/some/topic.index"]}>{childFn}</MessageHistory>
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
          cleared: false,
          metadataByPath: { "/some/topic.index": expect.any(Object) },
          startTime: expect.any(Object),
        },
      ],
    ]);
  });

  it("remembers data when changing topics", () => {
    const childFn = jest.fn().mockReturnValue(null);
    const provider = mount(
      <MockMessagePipelineProvider
        topics={[{ name: "/some/topic", datatype: "dummy" }, { name: "/some/other/topic", datatype: "dummy" }]}
        datatypes={datatypes}
        messages={[messages[0]]}>
        <MessageHistory paths={["/some/topic"]}>{childFn}</MessageHistory>
      </MockMessagePipelineProvider>
    );
    expect(childFn.mock.calls.length).toEqual(1);
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
        metadataByPath: {},
        startTime: expect.any(Object),
      },
    ]);

    // Change props, and we expect to get another call with the same data.
    provider.setProps({
      children: <MessageHistory paths={["/some/topic", "/some/other/topic"]}>{childFn}</MessageHistory>,
    });
    expect(childFn.mock.calls.length).toEqual(2);
    expect(last(childFn.mock.calls)).toEqual([
      {
        itemsByPath: {
          "/some/topic": childFn.mock.calls[1][0].itemsByPath["/some/topic"],
          "/some/other/topic": [],
        },
        cleared: false,
        metadataByPath: {},
        startTime: expect.any(Object),
      },
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
        <MessageHistory paths={paths}>
          {({ itemsByPath }) => {
            itemsByPath1 = itemsByPath;
            return null;
          }}
        </MessageHistory>
      </MockMessagePipelineProvider>
    );
    provider.setProps({
      children: (
        <MessageHistory paths={paths}>
          {({ itemsByPath }) => {
            itemsByPath2 = itemsByPath;
            return null;
          }}
        </MessageHistory>
      ),
    });
    expect(itemsByPath1).toBe(itemsByPath2);
  });
});
