// @flow
//
//  Copyright (c) 2019-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { mount } from "enzyme";
import React from "react";

import { MessagePipelineConsumer } from "../components/MessagePipeline";
import Internals from "./Internals";
import MessageHistoryDEPRECATED from "webviz-core/src/components/MessageHistoryDEPRECATED";
import PanelSetup from "webviz-core/src/stories/PanelSetup";
import { downloadTextFile, objectValues } from "webviz-core/src/util";

const mockDownloadTextFile: any = downloadTextFile;
(objectValues: any).mockImplementation(Object.values); // broken by module mock
jest.mock("webviz-core/src/util");

describe("<Internals>", () => {
  it("displays panel subscribers", () => {
    const contextFn = jest.fn().mockReturnValue(null);
    const wrapper = mount(
      <PanelSetup
        fixture={{
          topics: [{ name: "/foo", datatype: "foo_msgs/Foo" }],
          frame: {},
        }}>
        <Internals />
        <MessagePipelineConsumer>{contextFn}</MessagePipelineConsumer>
      </PanelSetup>
    );
    expect(wrapper.find("[data-test='internals-subscriptions']").text()).not.toContain("/foo");
    expect(contextFn.mock.calls).toEqual([[expect.objectContaining({ subscriptions: [] })]]);
    wrapper.unmount();

    const anotherContextFn = jest.fn().mockReturnValue(null);
    const wrapperWithDeprecatedMessageHistory = mount(
      <PanelSetup
        fixture={{
          topics: [{ name: "/foo", datatype: "foo_msgs/Foo" }],
          frame: {},
        }}>
        <Internals />
        <MessagePipelineConsumer>{anotherContextFn}</MessagePipelineConsumer>
        <MessageHistoryDEPRECATED paths={["/foo"]}>{() => null}</MessageHistoryDEPRECATED>
      </PanelSetup>
    );
    expect(anotherContextFn.mock.calls).toEqual([
      [expect.objectContaining({ subscriptions: [] })],
      [expect.objectContaining({ subscriptions: [expect.objectContaining({ topic: "/foo" })] })],
    ]);
    expect(wrapperWithDeprecatedMessageHistory.find("[data-test='internals-subscriptions']").text()).toContain("/foo");
    wrapperWithDeprecatedMessageHistory.unmount();
  });

  it("records data and exports JSON fixture", async () => {
    const wrapper = mount(
      <PanelSetup
        fixture={{
          frame: {},
          topics: [{ name: "/foo", datatype: "foo_msgs/Foo" }],
        }}>
        <Internals />
        <MessageHistoryDEPRECATED paths={["/foo"]}>{() => null}</MessageHistoryDEPRECATED>
      </PanelSetup>
    );

    const recordButton = wrapper.find("[data-test='internals-record-button']").find("button");

    expect(wrapper.find("[data-test='internals-subscriptions']").text()).toContain("/foo");

    // start recording - default is all topics
    recordButton.simulate("click");
    expect(wrapper.text()).toContain("Recording 1 topics…");

    const downloadButton = wrapper.find("[data-test='internals-download-button']").find("button");

    downloadButton.simulate("click");
    expect(mockDownloadTextFile.mock.calls).toEqual([
      [JSON.stringify({ topics: [], frame: { "/foo": [] } }), "fixture.json"],
    ]);
    mockDownloadTextFile.mockClear();

    const message = {
      topic: "/foo",
      receiveTime: { sec: 0, nsec: 0 },
      message: {
        value: "hi",
      },
    };
    wrapper.setProps({
      fixture: {
        ...wrapper.props().fixture,
        frame: {
          "/foo": [message],
        },
      },
    });

    downloadButton.simulate("click");
    expect(mockDownloadTextFile.mock.calls).toEqual([
      [
        JSON.stringify({ topics: [{ name: "/foo", datatype: "foo_msgs/Foo" }], frame: { "/foo": [message] } }),
        "fixture.json",
      ],
    ]);

    wrapper.unmount();
  });
});
