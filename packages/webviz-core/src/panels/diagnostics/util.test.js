// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import {
  getDiagnosticId,
  getDisplayName,
  getDiagnosticsByLevel,
  getSortedDiagnostics,
  computeDiagnosticInfo,
  LEVELS,
  MAX_STRING_LENGTH,
} from "./util";

const watchdogStatus = {
  status: {
    level: 0,
    name: "status",
    message: "Watchdog is in degraded state 0",
    hardware_id: "watchdog",
    values: [],
  },
  stamp: { sec: 1547062465, nsec: 999879954 },
  id: "|watchdog|status|",
  displayName: "watchdog: status",
};
const mctmLogger = {
  status: {
    level: 0,
    name: "MCTM Logger",
    message: "No triggers since launch!",
    hardware_id: "mctm_logger",
    values: [],
  },
  stamp: { sec: 1547062466, nsec: 1674890 },
  id: "|mctm_logger|MCTM Logger|",
  displayName: "mctm_logger: MCTM Logger",
};
const okMap = new Map([
  ["watchdog", new Map([["status", watchdogStatus]])],
  ["mctm_logger", new Map([["MCTM Logger", mctmLogger]])],
]);

const cameraStatus = {
  status: {
    level: 1,
    name: "status",
    message:
      "Ground rendering using lidar_aligned frame. This is okay for playing back an old bag but NOT okay on the car.",
    hardware_id: "camera_front_left_40/camera_ground_rendering",
    values: [],
  },
  stamp: { sec: 1547062466, nsec: 37309350 },
  id: "|camera_front_left_40/camera_ground_rendering|status|",
  displayName: "camera_front_left_40/camera_ground_rendering: status",
};
const warnMap = new Map([["camera_front_left_40/camera_ground_rendering", new Map([["status", cameraStatus]])]]);

const usrrStatus = {
  status: {
    level: 2,
    name: "status",
    message:
      "Error processing raw radar from: USRR Segmentation Node: car velocity exceeds threshold for Usrr Segmentation.",
    hardware_id: "usrr_rear_left_center/usrr_segmentation_node",
    values: [],
  },
  stamp: { sec: 1547062466, nsec: 98998486 },
  id: "|usrr_rear_left_center/usrr_segmentation_node|status|",
  displayName: "usrr_rear_left_center/usrr_segmentation_node: status",
};
const errorMap = new Map([["usrr_rear_left_center/usrr_segmentation_node", new Map([["status", usrrStatus]])]]);

const buffer = {
  diagnosticsByNameByTrimmedHardwareId: new Map([...okMap, ...warnMap, ...errorMap]),
  sortedAutocompleteEntries: [],
};

describe("diagnostics", () => {
  describe("getDiagnosticId", () => {
    it("removes leading slash from hardware_id if present", () => {
      expect(getDiagnosticId("foo", "bar")).toBe("|foo|bar|");
      expect(getDiagnosticId("/foo", "bar")).toBe("|foo|bar|");
      expect(getDiagnosticId("//foo", "bar")).toBe("|/foo|bar|");
      expect(getDiagnosticId("foo", "/bar")).toBe("|foo|/bar|");
    });

    it("doesn't add an extra pipe when no name is provided", () => {
      expect(getDiagnosticId("foo")).toBe("|foo|");
      expect(getDiagnosticId("/foo")).toBe("|foo|");
      expect(getDiagnosticId("//foo")).toBe("|/foo|");
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

  describe("getDiagnosticsByLevel", () => {
    it("removes leading slash from hardware_id if present", () => {
      expect(getDiagnosticsByLevel(buffer)).toStrictEqual({
        [LEVELS.STALE]: [],
        [LEVELS.ERROR]: [usrrStatus],
        [LEVELS.OK]: [watchdogStatus, mctmLogger],
        [LEVELS.WARN]: [cameraStatus],
      });
    });
  });

  describe("getSortedDiagnostics", () => {
    it("sorts nodes that match hardware ID, if present", () => {
      const nodes = getDiagnosticsByLevel(buffer)[LEVELS.OK];
      expect(getSortedDiagnostics(nodes, "", [])).toStrictEqual([mctmLogger, watchdogStatus]);
      expect(getSortedDiagnostics(nodes, "watchdog", [])).toStrictEqual([watchdogStatus]);
      expect(getSortedDiagnostics(nodes, "mctm_logger", [])).toStrictEqual([mctmLogger]);
    });

    it("returns filtered nodes ordered by match quality", () => {
      const hardwareIdFilter = "123456";
      const prefixDiagnostic = { ...mctmLogger, displayName: "123456asdfg", id: "1" };
      const subsequenceDiagnostic = { ...mctmLogger, displayName: "1a2s3d4fg5h6", id: "2" };
      const subsequenceButPinnedDiagnostic = { ...mctmLogger, displayName: "12asdfg3456", id: "3" };
      const notSubsequenceDiagnostic = { ...mctmLogger, displayName: "12345", id: "4" };
      expect(
        getSortedDiagnostics(
          [subsequenceButPinnedDiagnostic, notSubsequenceDiagnostic, subsequenceDiagnostic, prefixDiagnostic],
          hardwareIdFilter,
          ["3"]
        )
      ).toEqual([prefixDiagnostic, subsequenceDiagnostic]);
    });
  });

  describe("computeDiagnosticInfo", () => {
    it("trims extremely long value strings", () => {
      expect(
        computeDiagnosticInfo(
          {
            name: "example name",
            hardware_id: "example hardware_id",
            level: 0,
            message: "example message",
            values: [{ key: "example key", value: new Array(10000).join("x") }],
          },
          { sec: 1, nsec: 0 }
        )
      ).toEqual({
        displayName: "example hardware_id: example name",
        id: "|example hardware_id|example name|",
        stamp: { sec: 1, nsec: 0 },
        status: {
          hardware_id: "example hardware_id",
          level: 0,
          message: "example message",
          name: "example name",
          values: [{ key: "example key", value: `${new Array(MAX_STRING_LENGTH - 2).join("x")}...` }],
        },
      });
    });
  });
});
