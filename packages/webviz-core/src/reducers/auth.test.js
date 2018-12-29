// @flow
//
//  Copyright (c) 2018-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { createStore } from "redux";
import { spy } from "sinon";

import rootReducer from "webviz-core/src/reducers";
import sentry from "webviz-core/src/util/sentry";

describe("auth reducer", () => {
  beforeEach(() => {
    spy(sentry, "setUserContext");
  });

  afterEach(() => {
    sentry.setUserContext.restore();
  });

  it("does nothing when there is no username in initial state", () => {
    createStore(rootReducer);
    expect(sentry.setUserContext.called).toBe(false);
  });

  it("sets user context if a username is provided to the store", () => {
    createStore(rootReducer, { auth: { username: "foo" } });
    expect(sentry.setUserContext.called).toBe(true);
    expect(sentry.setUserContext.getCall(0).args[0]).toEqual({ username: "foo" });
  });
});
