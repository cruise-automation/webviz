// @flow
//
//  Copyright (c) 2018-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.
import { renderHook } from "react-hooks-testing-library";

import useCleanup from "./useCleanup";

describe("useCleanup", () => {
  class Example {
    destroyed: boolean;
    constructor() {
      this.destroyed = false;
    }
    destroy() {
      this.destroyed = true;
    }
  }

  it("calls the teardown function when component is unmounted", () => {
    const value = new Example();
    const { unmount } = renderHook(() => useCleanup(() => value.destroy()));
    expect(value.destroyed).toBe(false);
    unmount();
    expect(value.destroyed).toBe(true);
  });
});
