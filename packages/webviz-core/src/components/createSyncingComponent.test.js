// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { mount } from "enzyme";
import React from "react";

import delay from "webviz-core/shared/delay";
import tick from "webviz-core/shared/tick";
import createSyncingComponent from "webviz-core/src/components/createSyncingComponent";

describe("createSyncingComponent", () => {
  const IdentitySyncingComponent = createSyncingComponent("IdentitySyncingComponent", (dataItems) => dataItems);

  // since all tests use the same syncing component, allow time to ensure everything has updated
  // after unmounting at the end of each test
  afterEach(async () => {
    await tick();
  });

  it("returns data that was passed in to just the component itself", async () => {
    const childFn = jest.fn().mockReturnValue(null);
    const wrapper = mount(<IdentitySyncingComponent data={{ some: "data" }}>{childFn}</IdentitySyncingComponent>);
    await tick();
    expect(childFn.mock.calls).toEqual([[[{ some: "data" }]]]);
    wrapper.unmount();
  });

  it("cleans up data after unmounting", async () => {
    const wrapper1 = mount(<IdentitySyncingComponent data={{ component: 1 }}>{() => null}</IdentitySyncingComponent>);
    await tick();
    wrapper1.unmount();
    await tick();

    const childFn = jest.fn().mockReturnValue(null);
    const wrapper2 = mount(<IdentitySyncingComponent data={{ component: 2 }}>{childFn}</IdentitySyncingComponent>);
    await tick();
    expect(childFn.mock.calls).toEqual([[[{ component: 2 }]]]);
    wrapper2.unmount();
  });

  it("returns data passed to other components as well", async () => {
    const wrapper1 = mount(<IdentitySyncingComponent data={{ component: 1 }}>{() => null}</IdentitySyncingComponent>);
    await tick();

    const childFn = jest.fn().mockReturnValue(null);
    const wrapper2 = mount(<IdentitySyncingComponent data={{ component: 2 }}>{childFn}</IdentitySyncingComponent>);
    await tick();
    expect(childFn.mock.calls).toEqual([[[{ component: 1 }, { component: 2 }]]]);

    wrapper1.unmount();
    wrapper2.unmount();
  });

  it("rerenders other components when changing data", async () => {
    const childFn1 = jest.fn().mockReturnValue(null);
    const wrapper1 = mount(<IdentitySyncingComponent data={{ component: 1 }}>{childFn1}</IdentitySyncingComponent>);
    await tick();

    const childFn2 = jest.fn().mockReturnValue(null);
    const wrapper2 = mount(<IdentitySyncingComponent data={{ component: 2 }}>{childFn2}</IdentitySyncingComponent>);
    await tick();

    wrapper1.setProps({ data: { component: 1, different: "data" } });
    await delay(1000);

    expect(childFn1.mock.calls).toEqual([
      [[{ component: 1 }]],
      [[{ component: 1, different: "data" }, { component: 2 }]],
    ]);
    expect(childFn2.mock.calls).toEqual([
      [[{ component: 1 }, { component: 2 }]],
      [[{ component: 1, different: "data" }, { component: 2 }]],
    ]);

    wrapper1.unmount();
    wrapper2.unmount();
  });
});
