//  Copyright (c) 2018-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.
import { mount } from "enzyme";
import * as React from "react";

import useEventListener from "./useEventListener";

describe("useEventListener", () => {
  const Test = ({ target = window, type, enable, handler, dependencies = [] }) => {
    useEventListener(target, type, enable, handler, dependencies);
    return null;
  };

  const handler = jest.fn();
  const target = {};

  beforeEach(() => {
    target.addEventListener = jest.fn();
    target.removeEventListener = jest.fn();
  });

  it("follows a sequence for registering and unregistering handlers during react life cycle", () => {
    const el = mount(<Test type="keyup" enable handler={handler} target={target} />);
    expect(target.addEventListener.mock.calls).toEqual([["keyup", handler]]);
    el.setProps({ type: "keydown" });
    expect(target.removeEventListener.mock.calls).toEqual([["keyup", handler]]);
    expect(target.addEventListener.mock.calls).toEqual([["keyup", handler], ["keydown", handler]]);
    el.unmount();
    expect(target.removeEventListener.mock.calls).toEqual([["keyup", handler], ["keydown", handler]]);
  });

  it("doesn't register the handler if enable is false", () => {
    mount(<Test type="keyup" enable={false} handler={handler} target={target} />);
    expect(target.addEventListener).toHaveBeenCalledTimes(0);
  });

  it("updates when target changes", () => {
    const target1 = {};

    target1.addEventListener = jest.fn();
    target1.removeEventListener = jest.fn();

    const el = mount(<Test type="keyup" enable handler={handler} target={target} />);
    el.setProps({ target: target1 });
    expect(target1.addEventListener).toHaveBeenCalledWith("keyup", handler);
  });

  it("updates when type changes", () => {
    const handler1 = jest.fn();
    const el = mount(<Test type="keyup" enable handler={handler} target={target} />);
    expect(target.addEventListener).toHaveBeenCalledWith("keyup", handler);
    el.setProps({ type: "mousedown", handler: handler1 });
    expect(target.addEventListener).toHaveBeenCalledWith("mousedown", handler1);
  });

  it("updates when enable changes", () => {
    const el = mount(<Test type="keyup" enable={false} handler={handler} target={target} />);
    el.setProps({ enable: true });
    expect(target.addEventListener.mock.calls).toEqual([["keyup", handler]]);
  });
  it("updates when dependency changes", () => {
    const el = mount(<Test type="keyup" enable handler={handler} target={target} dependencies={["any-depdency"]} />);
    el.setProps({ dependencies: ["changed-dependencies"] });
    expect(target.addEventListener).toHaveBeenCalledTimes(2);
  });
});
