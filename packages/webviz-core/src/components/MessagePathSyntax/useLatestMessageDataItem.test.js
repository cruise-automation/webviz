// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.
import { mount } from "enzyme";
import * as React from "react";

import { useLatestMessageDataItem } from "./useLatestMessageDataItem";
import { MockMessagePipelineProvider } from "webviz-core/src/components/MessagePipeline";
import type { Message } from "webviz-core/src/players/types";

const topics = [{ name: "/topic", datatype: "datatype" }];
const datatypes = { datatype: { fields: [{ name: "value", type: "uint32", isArray: false, isComplex: false }] } };
const messages: Message[] = [
  {
    op: "message",
    topic: "/topic",
    datatype: "datatype",
    receiveTime: { sec: 0, nsec: 0 },
    message: { value: 0 },
  },
  {
    op: "message",
    topic: "/topic",
    datatype: "datatype",
    receiveTime: { sec: 1, nsec: 0 },
    message: { value: 1 },
  },
  {
    op: "message",
    topic: "/topic",
    datatype: "datatype",
    receiveTime: { sec: 2, nsec: 0 },
    message: { value: 2 },
  },
];

describe("useLatestMessageDataItem", () => {
  // Create a helper component that exposes the results of the hook for mocking.
  function createTest() {
    function Test({ path }: { path: string }) {
      Test.result(useLatestMessageDataItem(path));
      return null;
    }
    Test.result = jest.fn();
    return Test;
  }

  it("returns undefined by default", async () => {
    const Test = createTest();
    const root = mount(
      <MockMessagePipelineProvider topics={topics} datatypes={datatypes}>
        <Test path="/topic.value" />
      </MockMessagePipelineProvider>
    );
    expect(Test.result.mock.calls).toEqual([[undefined]]);
    root.unmount();
  });

  it("uses the latest message", async () => {
    const Test = createTest();
    const root = mount(
      <MockMessagePipelineProvider messages={[messages[0]]} topics={topics} datatypes={datatypes}>
        <Test path="/topic.value" />
      </MockMessagePipelineProvider>
    );
    expect(Test.result.mock.calls).toEqual([
      [{ message: messages[0], queriedData: [{ path: "/topic.value", value: 0 }] }],
    ]);

    root.setProps({ messages: [messages[1], messages[2]] });
    expect(Test.result.mock.calls).toEqual([
      [{ message: messages[0], queriedData: [{ path: "/topic.value", value: 0 }] }],
      [{ message: messages[2], queriedData: [{ path: "/topic.value", value: 2 }] }],
    ]);

    root.unmount();
  });

  it("only keeps messages that match the path", async () => {
    const Test = createTest();
    const root = mount(
      <MockMessagePipelineProvider messages={messages} topics={topics} datatypes={datatypes}>
        <Test path="/topic{value==1}.value" />
      </MockMessagePipelineProvider>
    );
    expect(Test.result.mock.calls).toEqual([
      [{ message: messages[1], queriedData: [{ path: "/topic{value==1}.value", value: 1 }] }],
    ]);
    root.unmount();
  });

  it("changing the path gives the new queriedData from the message", async () => {
    const Test = createTest();
    const root = mount(
      <MockMessagePipelineProvider messages={messages} topics={topics} datatypes={datatypes}>
        <Test path="/topic{value==1}.value" />
      </MockMessagePipelineProvider>
    );

    root.setProps({ children: <Test path="/topic{value==1}" /> });
    expect(Test.result.mock.calls).toEqual([
      [{ message: messages[1], queriedData: [{ path: "/topic{value==1}.value", value: 1 }] }],
      [{ message: messages[1], queriedData: [{ path: "/topic{value==1}", value: messages[1].message }] }],
    ]);

    root.unmount();
  });
});
