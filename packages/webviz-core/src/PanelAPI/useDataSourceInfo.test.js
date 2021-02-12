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

describe("useDataSourceInfo", () => {
  const topics = [{ name: "/foo", datatype: "Foo" }];
  const messages = [
    {
      topic: "/foo",
      receiveTime: { sec: 1, nsec: 2 },
      message: {},
    },
    {
      topic: "/foo",
      receiveTime: { sec: 5, nsec: 6 },
      message: {},
    },
  ];
  const datatypes = {
    Foo: { fields: [] },
  };

  // Create a helper component that exposes the results of the hook in a Jest mock function
  function createTest() {
    function Test() {
      return Test.renderFn(PanelAPI.useDataSourceInfo());
    }
    Test.renderFn = jest.fn().mockImplementation(() => null);
    return Test;
  }

  it("returns data from MessagePipelineContext", () => {
    const Test = createTest();
    const root = mount(
      <MockMessagePipelineProvider
        topics={topics}
        datatypes={datatypes}
        capabilities={["hello"]}
        messages={[messages[0]]}
        startTime={{ sec: 0, nsec: 1 }}>
        <Test />
      </MockMessagePipelineProvider>
    );
    expect(Test.renderFn.mock.calls).toEqual([
      [
        {
          topics: [{ name: "/foo", datatype: "Foo" }],
          datatypes: { Foo: { fields: [] } },
          capabilities: ["hello"],
          startTime: { sec: 0, nsec: 1 },
          playerId: "1",
        },
      ],
    ]);
    root.unmount();
  });

  it("doesn't change when messages change", () => {
    const Test = createTest();
    const root = mount(
      <MockMessagePipelineProvider
        topics={topics}
        datatypes={datatypes}
        capabilities={["hello"]}
        messages={[messages[0]]}
        startTime={{ sec: 0, nsec: 1 }}>
        <Test />
      </MockMessagePipelineProvider>
    );
    expect(Test.renderFn.mock.calls).toEqual([
      [
        {
          topics: [{ name: "/foo", datatype: "Foo" }],
          datatypes: { Foo: { fields: [] } },
          capabilities: ["hello"],
          startTime: { sec: 0, nsec: 1 },
          playerId: "1",
        },
      ],
    ]);
    Test.renderFn.mockClear();

    root.setProps({ messages: [messages[1]] });
    expect(Test.renderFn).toHaveBeenCalledTimes(0);

    root.setProps({ topics: [...topics, { name: "/bar", datatype: "Bar" }] });
    expect(Test.renderFn.mock.calls).toEqual([
      [
        {
          topics: [{ name: "/bar", datatype: "Bar" }, { name: "/foo", datatype: "Foo" }],
          datatypes: { Foo: { fields: [] } },
          capabilities: ["hello"],
          startTime: { sec: 0, nsec: 1 },
          playerId: "1",
        },
      ],
    ]);

    root.unmount();
  });
});
