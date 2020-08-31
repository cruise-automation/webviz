// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { mount } from "enzyme";
import { last } from "lodash";
import * as React from "react";
import { act } from "react-dom/test-utils";

import { FrameCompatibilityDEPRECATED } from "./FrameCompatibility";
import { datatypes, messages } from "./FrameCompatibilityFixture";
import { MockMessagePipelineProvider } from "webviz-core/src/components/MessagePipeline";

describe("FrameCompatibilityDEPRECATED", () => {
  it("passes in messages per frame", () => {
    const fooMsg1 = {
      topic: "/foo",
      receiveTime: { sec: 100, nsec: 0 },
      message: { index: 0 },
    };
    const fooMsg2 = {
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
    const MyComponentWithFrame = FrameCompatibilityDEPRECATED(MyComponent, ["/some/topic"]);
    const topics = [{ name: "/some/topic", datatype: "some/topic" }, { name: "/foo", datatype: "foo_msgs/Foo" }];
    const ref = React.createRef();
    const provider = mount(
      <MockMessagePipelineProvider messages={[messages[0]]} datatypes={datatypes} topics={topics}>
        <MyComponentWithFrame ref={ref} topics={topics} />
      </MockMessagePipelineProvider>
    );
    expect(last(childFn.mock.calls)[0].frame).toEqual({ "/some/topic": [messages[0]] });

    // Make sure that we don't send `messages[0]` when receiving a new frame.
    provider.setProps({ messages: [messages[1], fooMsg1] });
    expect(last(childFn.mock.calls)[0].frame).toEqual({ "/some/topic": [messages[1]] });

    // setSubscriptions should add new topics while remaining subscribed to old topics
    if (!ref.current) {
      throw new Error("missing ref");
    }
    act(() => ref.current.setSubscriptions(["/foo"]));
    provider.setProps({ messages: [messages[2], fooMsg2] });
    expect(last(childFn.mock.calls)[0].frame).toEqual({ "/some/topic": [messages[2]], "/foo": [fooMsg2] });
  });
});
