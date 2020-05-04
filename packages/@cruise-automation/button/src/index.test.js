// @flow
//
//  Copyright (c) 2018-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { mount } from "enzyme";
import React from "react";

import Button from ".";

describe("<Button />", () => {
  it("fires click callback", (done) => {
    const el = mount(<Button onClick={() => done()}>hello</Button>);
    el.simulate("click");
  });

  it("fires onMouseUp callback", (done) => {
    const el = mount(<Button onMouseUp={() => done()}>hello</Button>);
    el.simulate("mouseUp");
  });

  it("fires onMouseLeave callback", (done) => {
    const el = mount(<Button onMouseLeave={() => done()}>hello</Button>);
    el.simulate("mouseLeave");
  });

  it("fires onFocus callback", (done) => {
    const el = mount(<Button onFocus={() => done()}>hello</Button>);
    el.simulate("focus");
  });

  it("accepts custom class name", (done) => {
    const el = mount(
      <Button className="foo" onClick={done}>
        hello
      </Button>
    );
    expect(el.hasClass("foo")).toBe(true);
    done();
    el.unmount();
  });

  it("accepts custom id", () => {
    const el = mount(<Button id="button-1">hello</Button>);
    expect(el.find("#button-1").exists()).toBe(true);
    el.unmount();
  });

  it("applies bulma-style classes", () => {
    const el = mount(
      <Button small primary warning danger>
        hello
      </Button>
    );
    const classes = el.getDOMNode().classList;
    expect(classes).toContain("is-small");
    expect(classes).toContain("is-primary");
    expect(classes).toContain("is-warning");
    expect(classes).toContain("is-danger");
    el.unmount();
  });

  it("delayed button click event does not fire on click", (done: any) => {
    const fail = () => done("Should not have called click callback");
    const el = mount(
      <Button delay={1000} onClick={fail}>
        hello
      </Button>
    );
    el.simulate("click");
    setImmediate(() => {
      el.unmount();
      done();
    });
  });

  it("delays click callback when mouse is down", (done) => {
    let clicked = false;
    const onClick = (e) => {
      clicked = true;
      expect(e).toBeTruthy();
      done();
      el.unmount(); // eslint-disable-line no-use-before-define
    };
    const el = mount(
      <Button delay={10} onClick={onClick} progressClassName="foo">
        hello
      </Button>
    );
    el.simulate("mouseDown");
    expect(clicked).toBe(false);
  });

  it("can control mousedown via external calls", (done: any) => {
    const onClick = () => {
      el.unmount(); // eslint-disable-line no-use-before-define
      done();
    };
    const el = mount(
      <Button delay={10} onClick={onClick}>
        testing
      </Button>
    );
    el.instance().onMouseDown(({ persist: () => {} }: any));
  });

  it("unmounting cancels done callback", (done: any) => {
    const el = mount(
      <Button delay={1} onClick={() => done("Should not call done callback")}>
        testing
      </Button>
    );
    el.instance().onMouseDown(({ persist: () => {} }: any));
    setImmediate(() => {
      el.unmount();
      done();
    });
  });
});
