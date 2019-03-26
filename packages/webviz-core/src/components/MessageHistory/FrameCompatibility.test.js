// @flow
//
//  Copyright (c) 2018-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { mount } from "enzyme";
import { last } from "lodash";
import * as React from "react";

import { datatypes, messages } from "./fixture";
import { FrameCompatibility } from "webviz-core/src/components/MessageHistory/FrameCompatibility";
import { MockMessagePipelineProvider } from "webviz-core/src/components/MessagePipeline";

describe("FrameCompatibility", () => {
  it("passes in messages per frame", () => {
    const fooMsg1 = {
      op: "message",
      datatype: "foo_msgs/Foo",
      topic: "/foo",
      receiveTime: { sec: 100, nsec: 0 },
      message: { index: 0 },
    };
    const fooMsg2 = {
      op: "message",
      datatype: "foo_msgs/Foo",
      topic: "/foo",
      receiveTime: { sec: 101, nsec: 0 },
      message: { index: 0 },
    };

    const childFn = jest.fn().mockReturnValue(null);
    class MyComponent extends React.Component<any> {
      render() {
        childFn(this.props);
        return null;
      }

      setSubscriptions(topics: string[]) {
        this.props.setSubscriptions(topics);
      }
    }
    const MyComponentWithFrame = FrameCompatibility(MyComponent, { topics: ["/some/topic"] });
    const ref = React.createRef();
    const provider = mount(
      <MockMessagePipelineProvider
        messages={[messages[0]]}
        datatypes={datatypes}
        topics={[{ name: "/some/topic", datatype: "some/topic" }, { name: "/foo", datatype: "foo_msgs/Foo" }]}>
        <MyComponentWithFrame ref={ref} />
      </MockMessagePipelineProvider>
    );
    expect(last(childFn.mock.calls)[0].frame).toEqual({ "/some/topic": [messages[0]] });

    // Make sure that we don't send `messages[0]` when receiving a new frame. Note that we
    // only put `messages[1]`` in the `frame` here, but `<MessageHistory>` will still also
    // contain `messages[0]`.
    provider.setProps({ messages: [messages[1], fooMsg1] });
    expect(last(childFn.mock.calls)[0].frame).toEqual({ "/some/topic": [messages[1]] });

    // setSubscriptions should add new topics while remaining subscribed to old topics
    if (!ref.current) {
      throw new Error("missing ref");
    }
    ref.current.setSubscriptions(["/foo"]);
    provider.setProps({ messages: [messages[2], fooMsg2] });
    expect(last(childFn.mock.calls)[0].frame).toEqual({ "/some/topic": [messages[2]], "/foo": [fooMsg2] });
  });
});
