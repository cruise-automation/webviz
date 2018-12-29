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
import { Provider } from "react-redux";

import { datatypes, messagesWithHeader } from "./fixture";
import { datatypesReceived, frameReceived, topicsReceived } from "webviz-core/src/actions/dataSource";
import { FrameCompatibility } from "webviz-core/src/components/MessageHistory/FrameCompatibility";
import reducer from "webviz-core/src/reducers";
import configureStore from "webviz-core/src/store/configureStore.testing";

describe("FrameCompatibility", () => {
  it("passes in messages per frame", () => {
    const store = configureStore(reducer);
    store.dispatch(datatypesReceived(datatypes));
    store.dispatch(
      topicsReceived([
        { name: "/topic/with/header", datatype: "topic/with/header" },
        { name: "/foo", datatype: "foo_msgs/Foo" },
      ])
    );
    store.dispatch(frameReceived({ "/topic/with/header": [messagesWithHeader[0]] }));

    const fooMsg1 = {
      op: "message",
      datatype: "foo_msgs/Foo",
      topic: "/foo",
      receiveTime: { sec: 100, nsec: 0 },
      message: { index: 0, header: { stamp: { sec: 100, nsec: 0 } } },
    };
    const fooMsg2 = {
      op: "message",
      datatype: "foo_msgs/Foo",
      topic: "/foo",
      receiveTime: { sec: 101, nsec: 0 },
      message: { index: 0, header: { stamp: { sec: 101, nsec: 0 } } },
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
    const MyComponentWithFrame = FrameCompatibility(MyComponent, { topics: ["/topic/with/header"] });
    const ref = React.createRef();
    mount(
      <Provider store={store}>
        <MyComponentWithFrame ref={ref} />
      </Provider>
    );
    expect(last(childFn.mock.calls)[0].frame).toEqual({ "/topic/with/header": [messagesWithHeader[0]] });

    // Make sure that we don't send `messagesWithHeader[0]` when receiving a new frame. Note that we
    // only put `messagesWithHeader[1]`` in the `frame` here, but `<MessageHistory>` will still also
    // contain `messagesWithHeader[0]`.
    store.dispatch(frameReceived({ "/topic/with/header": [messagesWithHeader[1]], "/foo": [fooMsg1] }));
    expect(last(childFn.mock.calls)[0].frame).toEqual({ "/topic/with/header": [messagesWithHeader[1]] });

    // setSubscriptions should add new topics while remaining subscribed to old topics
    if (!ref.current) {
      throw new Error("missing ref");
    }
    ref.current.setSubscriptions(["/foo"]);
    store.dispatch(frameReceived({ "/topic/with/header": [messagesWithHeader[2]], "/foo": [fooMsg2] }));
    expect(last(childFn.mock.calls)[0].frame).toEqual({
      "/topic/with/header": [messagesWithHeader[2]],
      "/foo": [fooMsg2],
    });
  });
});
