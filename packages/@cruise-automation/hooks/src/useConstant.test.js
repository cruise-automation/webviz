// @flow
//
//  Copyright (c) 2018-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.
import { mount } from "enzyme";
import * as React from "react";

import useConstant from "./useConstant";

type Props = {
  setup: () => { name: string },
  dummyProp: any,
  teardown: () => void,
};

describe("useConstant", () => {
  const testVals = { name: "someName" };

  const Test = ({ setup = () => testVals, dummyProp, teardown }: Props) => {
    const value = useConstant(setup, teardown);
    return (
      <div>
        {value && value.name}
        {dummyProp}
      </div>
    );
  };

  Test.defaultProps = {
    setup: () => testVals,
    dummyProp: "",
    teardown: () => {},
  };

  it("sets the value when component is mounted", () => {
    const el = mount(<Test />);
    expect(el.text()).toEqual(testVals.name);
  });

  it("continues to exist during the react life cycle", () => {
    const dummyProp = "test";
    const el = mount(<Test dummyProp={dummyProp} />);
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
