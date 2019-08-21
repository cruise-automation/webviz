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
import { datatypes, messages, dualInputMessages } from "./fixture";
import { MockMessagePipelineProvider } from "webviz-core/src/components/MessagePipeline";
import { MockPanelContextProvider } from "webviz-core/src/components/Panel";
import { SECOND_BAG_PREFIX } from "webviz-core/src/util/globalConstants";

const singleTopic = [{ name: "/some/topic", datatype: "some/datatype" }];

const allTopics = [
  { name: "/some/topic", datatype: "some/datatype" },
  { name: "/other/topic", datatype: "some/datatype" },
  { name: "/webviz_bag_2/some/topic", datatype: "some/datatype" },
];

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
    const setSubscriptions = jest.fn();
    const provider = mount(
      <MockMessagePipelineProvider
        topics={[{ name: "/some/topic", datatype: "dummy" }, { name: "/some/other/topic", datatype: "dummy" }]}
        setSubscriptions={setSubscriptions}>
        <MessageHistory paths={["/some/topic", "/some/other/topic"]}>{() => null}</MessageHistory>
      </MockMessagePipelineProvider>
    );

    provider.setProps({ children: <MessageHistory paths={["/some/topic"]}>{() => null}</MessageHistory> });

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
        <MessageHistory paths={["/some/topic"]}>{() => null}</MessageHistory>
      </MockMessagePipelineProvider>
    );

    // Updating to change topics
    provider.setProps({
      children: <MessageHistory paths={["/some/topic", "/some/other/topic"]}>{() => null}</MessageHistory>,
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
        <MessageHistory historySize={1} paths={["/some/topic"]}>
          {childFn}
        </MessageHistory>
      </MockMessagePipelineProvider>
    );
    provider.setProps({
      children: (
        <MessageHistory historySize={2} paths={["/some/topic"]}>
          {childFn}
        </MessageHistory>
      ),
    });
    provider.setProps({ messages: [messages[0], messages[1], messages[2]] });

    expect(childFn.mock.calls).toEqual([
      [
        {
          cleared: false,
          itemsByPath: { "/some/topic": [] },
          metadataByPath: {},
          startTime: { sec: 100, nsec: 0 },
        },
      ],
      [
        {
          cleared: false,
          itemsByPath: { "/some/topic": [] },
          metadataByPath: {},
          startTime: { sec: 100, nsec: 0 },
        },
      ],
      [
        {
          cleared: false,
          itemsByPath: {
            "/some/topic": [{ message: messages[1], queriedData: [] }, { message: messages[2], queriedData: [] }],
          },
          metadataByPath: {},
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
        topics={[{ name: "/some/topic", datatype: "some/datatype" }, { name: "/some/other/topic", datatype: "dummy" }]}
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
              queriedData: [{ path: "/some/topic", value: messages[0].message }],
            },
          ],
        },
        cleared: false,
        metadataByPath: { "/some/topic": expect.any(Object) },
        startTime: expect.any(Object),
      },
    ]);

    // Add a new path, and we should get another call with the same data
    provider.setProps({
      children: <MessageHistory paths={["/some/topic", "/some/other/topic"]}>{childFn}</MessageHistory>,
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
        cleared: false,
        metadataByPath: { "/some/topic": expect.any(Object) },
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
              queriedData: [{ path: "/some/topic", value: messages[0].message }],
            },
          ],
        },
        cleared: false,
        metadataByPath: { "/some/topic": expect.any(Object) },
        startTime: expect.any(Object),
      },
    ]);

    // Change an existing path, and we should restore the data from the previous path on the same topic
    provider.setProps({
      children: <MessageHistory paths={["/some/topic.index"]}>{childFn}</MessageHistory>,
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
        cleared: false,
        metadataByPath: { "/some/topic.index": expect.any(Object) },
        startTime: expect.any(Object),
      },
    ]);
  });

  it("supports changing a path for a previously-existing topic that no longer exists", () => {
    const childFn = jest.fn().mockReturnValue(null);
    const provider = mount(
      <MockMessagePipelineProvider
        topics={[{ name: "/some/topic", datatype: "some/datatype" }]}
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
              queriedData: [{ path: "/some/topic", value: messages[0].message }],
            },
          ],
        },
        cleared: false,
        metadataByPath: { "/some/topic": expect.any(Object) },
        startTime: expect.any(Object),
      },
    ]);

    provider.setProps({
      topics: [],
      datatypes: {},
      messages: [],
      children: <MessageHistory paths={["/some/topic.index"]}>{childFn}</MessageHistory>,
    });
    expect(childFn.mock.calls.length).toEqual(2);
    expect(last(childFn.mock.calls)).toEqual([
      {
        itemsByPath: {
          "/some/topic.index": [],
        },
        cleared: false,
        metadataByPath: {},
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
        <MessageHistory paths={["/some/other/topic"]}>{childFn}</MessageHistory>
      </MockMessagePipelineProvider>
    );
    expect(childFn.mock.calls).toEqual([
      [
        {
          itemsByPath: { "/some/other/topic": [] },
          cleared: false,
          metadataByPath: {},
          startTime: expect.any(Object),
        },
      ],
    ]);

    provider.setProps({ messages: [messages[1], messages[2]] });

    expect(childFn.mock.calls).toEqual([
      [
        {
          itemsByPath: { "/some/other/topic": [] },
          cleared: false,
          metadataByPath: {},
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

  describe("setting topicPrefix", () => {
    it("filters topics and strips topic names using topicPrefix", () => {
      const childFn1 = jest.fn((x) => null);

      const renderDualInputMessageHistory = () => {
        return (
          <MockMessagePipelineProvider
            topics={allTopics}
            datatypes={datatypes}
            messages={messages.concat(dualInputMessages)}>
            <MessageHistory paths={["/some/topic"]}>{childFn1}</MessageHistory>
          </MockMessagePipelineProvider>
        );
      };
      mount(
        <MockPanelContextProvider topicPrefix={SECOND_BAG_PREFIX}>
          {renderDualInputMessageHistory()}
        </MockPanelContextProvider>
      );

      const secondBagPrefixResults = childFn1.mock.calls[0][0].itemsByPath;

      expect(secondBagPrefixResults).toEqual({
        "/some/topic": dualInputMessages.map((msg) =>
          expect.objectContaining({
            message: { ...msg, topic: msg.topic.slice(SECOND_BAG_PREFIX.length) },
          })
        ),
      });
    });

    it("will send correctly filtered and stripped topics to MessageHistory components with different topicPrefixes", () => {
      const noPrefixRenderer = jest.fn((x) => null);
      const secondBagPrefixRenderer = jest.fn((x) => null);

      const provider = mount(
        <MockMessagePipelineProvider topics={allTopics} datatypes={datatypes} messages={[]}>
          <MockPanelContextProvider topicPrefix="">
            <MessageHistory paths={["/some/topic"]}>{noPrefixRenderer}</MessageHistory>
          </MockPanelContextProvider>
          <MockPanelContextProvider topicPrefix={SECOND_BAG_PREFIX}>
            <MessageHistory paths={["/some/topic"]}>{secondBagPrefixRenderer}</MessageHistory>;
          </MockPanelContextProvider>
        </MockMessagePipelineProvider>
      );
      provider.setProps({ messages: messages.concat(dualInputMessages) });

      const noPrefixResults = noPrefixRenderer.mock.calls[1][0].itemsByPath;
      const secondBagPrefixResults = secondBagPrefixRenderer.mock.calls[1][0].itemsByPath;
      expect(noPrefixResults["/some/topic"].map((item) => item.message)).toEqual(messages);
      expect(secondBagPrefixResults["/some/topic"].map((item) => item.message)).toEqual(
        dualInputMessages.map((msg) => {
          delete msg.queriedData;
          return { ...msg, topic: msg.topic.slice(SECOND_BAG_PREFIX.length) };
        })
      );
    });

    it("sets subscriptions on topics with topicPrefix, and changes subscription when changing topicPrefix", () => {
      const setSubscriptionsFn = jest.fn((x) => undefined);

      const renderDualInputMessageHistory = () => {
        return (
          <MockMessagePipelineProvider
            topics={allTopics}
            datatypes={datatypes}
            messages={messages.concat(dualInputMessages)}
            setSubscriptions={setSubscriptionsFn}>
            <MessageHistory paths={["/some/topic"]}>{() => null}</MessageHistory>
          </MockMessagePipelineProvider>
        );
      };

      const provider = mount(
        <MockPanelContextProvider topicPrefix={SECOND_BAG_PREFIX}>
          {renderDualInputMessageHistory()}
        </MockPanelContextProvider>
      );

      provider.setProps({ topicPrefix: "" });

      expect(setSubscriptionsFn.mock.calls).toEqual([
        [expect.any(String), [expect.objectContaining({ topic: `${SECOND_BAG_PREFIX}/some/topic` })]],
        [expect.any(String), [expect.objectContaining({ topic: "/some/topic" })]],
      ]);
    });
  });
});
