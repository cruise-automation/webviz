// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import CircleIcon from "@mdi/svg/svg/circle.svg";
import { mount } from "enzyme";
import React from "react";

import Icon from "./Icon";

describe("<Icon />", () => {
  it("renders simple icon", () => {
    const wrapper = mount(
      <Icon>
        <CircleIcon />
      </Icon>
    );
    const iconTag = wrapper.find("svg");
    expect(iconTag.length).toBe(1);
  });

  it("stops click event with custom handler", (done: (any) => void) => {
    const Container = () => (
      <div onClick={() => done("should not bubble")}>
        <Icon onClick={() => done()}>
          <CircleIcon />
        </Icon>
      </div>
    );
    const wrapper = mount(<Container />);
    wrapper.find(".icon").simulate("click");
  });

  it("does not prevent click by default", (done: (any) => void) => {
    const Container = () => (
      <div onClick={() => done()}>
        <Icon>
          <CircleIcon />
        </Icon>
      </div>
    );
    const wrapper = mount(<Container />);
    wrapper.find(".icon").simulate("click");
  });
});
