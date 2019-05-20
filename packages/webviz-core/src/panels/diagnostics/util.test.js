// @flow
//
//  Copyright (c) 2018-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { getDiagnosticId, getDisplayName } from "./util";

describe("diagnostics", () => {
  describe("getDiagnosticId", () => {
    it("removes leading slash from hardware_id if present", () => {
      expect(getDiagnosticId({ hardware_id: "foo", name: "bar", level: 0 })).toBe("|foo|bar|");
      expect(getDiagnosticId({ hardware_id: "/foo", name: "bar", level: 0 })).toBe("|foo|bar|");
      expect(getDiagnosticId({ hardware_id: "//foo", name: "bar", level: 0 })).toBe("|/foo|bar|");
      expect(getDiagnosticId({ hardware_id: "foo", name: "/bar", level: 0 })).toBe("|foo|/bar|");
    });
  });

  describe("getDisplayName", () => {
    it("leaves old formatted diagnostic messages alone", () => {
      expect(getDisplayName("my_hardware_id", "my_hardware_id: foo")).toBe("my_hardware_id: foo");
    });

    it("appends hardware id to diagnostic message for new formatted messages", () => {
      expect(getDisplayName("my_hardware_id", "foo")).toBe("my_hardware_id: foo");
    });
  });
});
