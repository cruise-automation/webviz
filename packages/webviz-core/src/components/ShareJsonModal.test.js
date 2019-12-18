// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { mount } from "enzyme";
import React from "react";

import ShareJsonModal from "./ShareJsonModal";

describe("<ShareJsonModal />", () => {
  it("fires change callback with new valid json contents", (done) => {
    const pass = (value) => {
      expect(value).toEqual({ id: "foo" });
      done();
    };
    const wrapper = mount(
      <div data-modalcontainer="true">
        <ShareJsonModal onRequestClose={() => {}} value={{}} onChange={pass} noun="layout" />
      </div>
    );
    const newValue = btoa(JSON.stringify({ id: "foo" }));
    wrapper.find(".textarea").simulate("change", { target: { value: newValue } });
    wrapper
      .find("Button[children='Apply']")
      .first()
      .simulate("click");
    expect(wrapper.find(".is-danger").exists()).toBe(false);
  });

  it("fires no change callback and shows error if bad input is used", (done) => {
    const fail = () => {
      // $FlowFixMe - flow doesn't seem to understand error callback for `done`.
      done("Change callback was fired unexpectedly");
    };
    const wrapper = mount(
      <div data-modalcontainer="true">
        <ShareJsonModal onRequestClose={() => {}} value={{}} onChange={fail} noun="layout" />
      </div>
    );
    const newValue = "asdlkfjasdf";
    wrapper.find(".textarea").simulate("change", { target: { value: newValue } });
    wrapper
      .find("Button[children='Apply']")
      .first()
      .simulate("click");
    expect(wrapper.find(".is-danger").exists()).toBe(true);
    done();
  });

  it("fires no error when resetting an actual layout to default", (done) => {
    const pass = (value) => {
      expect(value.layout).toEqual("RosOut!cuuf9u");
      done();
    };
    const wrapper = mount(
      <div data-modalcontainer="true">
        <ShareJsonModal onRequestClose={() => {}} value={{}} onChange={pass} noun="layout" />
      </div>
    );
    const newValue = btoa(
      JSON.stringify({
        layout: "RosOut!cuuf9u",
        savedProps: {},
        globalVariables: {},
      })
    );
    wrapper.find(".textarea").simulate("change", { target: { value: newValue } });
    wrapper
      .find("Button[children='Apply']")
      .first()
      .simulate("click");
    expect(wrapper.find(".is-danger").exists()).toBe(false);
  });
});
