// @flow
//
//  Copyright (c) 2018-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { getDisplayName } from "./util";

describe("diagnostics", () => {
  describe("getDisplayName", () => {
    it("leaves old formatted diagnostic messages alone", () => {
      expect(getDisplayName("my_hardware_id", "my_hardware_id: foo")).toBe("my_hardware_id: foo");
    });

    it("appends hardware id to diagnostic message for new formatted messages", () => {
      expect(getDisplayName("my_hardware_id", "foo")).toBe("my_hardware_id: foo");
    });
  });
});
