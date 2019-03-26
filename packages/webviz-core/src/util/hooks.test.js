// @flow
//
//  Copyright (c) 2018-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.
import { mount } from "enzyme";
import * as React from "react";
import withHooks from "react-with-hooks";

import { useConstant, useEventListener } from "./hooks";

describe("hooks", () => {
  describe("useConstant", () => {
    const testVals = { name: "someName" };

    const Test = withHooks(({ setup = () => testVals, dummyProp, teardown }) => {
      const value = useConstant(setup, teardown);
      return (
        <div>
          {value.name}
          {dummyProp}
        </div>
      );
    });

    it("sets the value when component is mounted", () => {
      const App = () => <Test />;
      const el = mount(<App />);
      expect(el.text()).toEqual(testVals.name);
    });

    it("continues to exist during the react life cycle", () => {
      const dummyProp = "test";
      const App = ({ dummyProp }: { dummyProp?: string }) => <Test dummyProp={dummyProp} />;
      const el = mount(<App />);
      el.setProps({ dummyProp });
      expect(el.text()).toEqual(testVals.name + dummyProp);
      el.setProps({ dummyProp: "test2" });
      expect(el.text()).toEqual(`${testVals.name}test2`);
    });

    it("only calls the set up function once when component is mounted", () => {
      const setup = jest.fn(() => testVals);
      const App = () => <Test setup={setup} />;
      const el = mount(<App />);
      expect(setup).toHaveBeenCalledTimes(1);
      el.setProps({ dummyProp: "test2" });
      el.unmount();
      expect(setup).toHaveBeenCalledTimes(1);
    });

    it("calls the optional teardown function with the constant value when component is unmounted", () => {
      const teardown = jest.fn();
      const App = () => <Test teardown={teardown} />;
      const el = mount(<App />);
      el.unmount();
      expect(teardown.mock.calls).toEqual([[testVals]]);
    });
  });

  describe("useEventListener", () => {
    const Test = withHooks(({ target = window, type, enable, handler, dependencies = [] }) => {
      useEventListener(target, type, enable, handler, dependencies);
      return null;
    });

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
});
