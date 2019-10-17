// @flow
//
//  Copyright (c) 2018-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { mount } from "enzyme";
import React, { useImperativeHandle } from "react";

import useAbortable from "./useAbortable";

type ResolvablePromise<T> = Promise<T> & {
  resolve: (T) => void,
};

function signal<T>(): ResolvablePromise<T> {
  let outerResolve;
  // $FlowFixMe - flow does not like this
  const result: ResolvablePromise<T> = new Promise((resolve) => {
    outerResolve = resolve;
  });
  // $FlowFixMe - flow does not like this
  result.resolve = outerResolve;
  return result;
}

describe("useAbortable", () => {
  beforeEach(() => {
    // Suppress "test was not wrapped in act" error which is kind of hard to fix with this hook.
    jest.spyOn(console, "error").mockReturnValue();
  });

  const Test = React.forwardRef((props, ref) => {
    const { action, cleanup } = props;
    const [value, abort] = useAbortable("pending", action, cleanup || (() => {}), [action]);
    useImperativeHandle(ref, () => ({
      abort: () => abort(),
    }));
    return <div>{value}</div>;
  });

  it("works...", async () => {
    const ref = React.createRef();
    const done = signal();
    const action = async () => {
      setImmediate(done.resolve);
      return "done";
    };
    const App = () => <Test ref={ref} action={action} cleanup={() => {}} />;
    const el = mount(<App />);
    expect(el.text()).toEqual("pending");
    await done;
    expect(el.text()).toEqual("done");
  });

  it("can abort", async () => {
    const ref = React.createRef();
    const wait = signal();
    const done = signal();
    const cleanedup = signal();
    const action = async (controller) => {
      await wait;
      expect(controller.signal.aborted).toBe(true);
      setImmediate(done.resolve);
      return "done";
    };
    const cleanup = (value) => {
      cleanedup.resolve(value);
    };
    const App = () => <Test ref={ref} action={action} cleanup={cleanup} />;
    const el = mount(<App />);
    expect(el.text()).toEqual("pending");
    const { current } = ref;
    if (!current) {
      // appease flow
      throw new Error("Current ref for mounted component is missing");
    }
    current.abort();
    wait.resolve();
    await done;
    expect(el.text()).toEqual("pending");
    el.unmount();
    const value = await cleanedup;
    expect(value).toEqual("done");
  });

  it("runs cleanup on unmount", async () => {
    const ref = React.createRef();
    const wait = signal();
    const done = signal();
    const cleanedup = signal();
    const action = async () => {
      await wait;
      setImmediate(done.resolve);
      return "done";
    };
    const cleanup = (value) => {
      cleanedup.resolve(value);
    };
    const App = () => <Test ref={ref} action={action} cleanup={cleanup} />;
    const el = mount(<App />);
    expect(el.text()).toEqual("pending");
    wait.resolve();
    await done;
    expect(el.text()).toEqual("done");
    el.unmount();
    const value = await cleanedup;
    expect(value).toEqual("done");
  });

  it("cancels previous controller when changing args", async () => {
    const ref = React.createRef();
    const wait1 = signal();
    const wait2 = signal();
    const done1 = signal();
    const done2 = signal();
    const checkpoint = signal();
    const action1 = async (controller) => {
      await wait1;
      expect(controller.signal.aborted).toBe(false);
      checkpoint.resolve();
      await wait2;
      expect(controller.signal.aborted).toBe(true);
      setImmediate(done1.resolve);
      return "done1";
    };
    const cleanup1 = jest.fn();
    const App = ({ action }) => <Test ref={ref} action={action} cleanup={cleanup1} />;
    const el = mount(<App action={action1} />);
    expect(el.text()).toEqual("pending");
    wait1.resolve();
    await checkpoint;
    const action2 = async (controller) => {
      await done1;
      expect(controller.signal.aborted).toBe(false);
      done2.resolve();
    };

    el.setProps({ action: action2, cleanup: () => {} });
    wait2.resolve();
    await done1;
    expect(cleanup1).toHaveBeenCalledTimes(1);
    expect(cleanup1).toHaveBeenCalledWith("done1");
    await done2;
  });
});
