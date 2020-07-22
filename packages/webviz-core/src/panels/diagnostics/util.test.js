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
  getNodesByLevel,
  getSortedNodes,
  computeDiagnosticInfo,
  LEVELS,
  MAX_STRING_LENGTH,
} from "./util";

const okMap = new Map();
okMap.set("|watchdog|status|", {
  status: { level: 0, name: "status", message: "Watchdog is in degraded state 0", hardware_id: "watchdog", values: [] },
  stamp: { sec: 1547062465, nsec: 999879954 },
  id: "|watchdog|status|",
  displayName: "watchdog: status",
});
okMap.set("|mctm_logger|MCTM Logger|", {
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
});

const warnMap = new Map();
warnMap.set("|camera_front_left_40/camera_ground_rendering|status|", {
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
});

const errorMap = new Map();
errorMap.set("|usrr_rear_left_center/usrr_segmentation_node|status|", {
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
});

const buffer = {
  diagnosticsById: new Map(),
  diagnosticsByLevel: {
    [LEVELS.OK]: okMap,
    [LEVELS.WARN]: warnMap,
    [LEVELS.ERROR]: errorMap,
    [LEVELS.STALE]: new Map(),
  },
  sortedAutocompleteEntries: [],
  diagnosticsInOrderReceived: [],
};

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

  describe("getNodesByLevel", () => {
    it("removes leading slash from hardware_id if present", () => {
      expect(getNodesByLevel(buffer, LEVELS.STALE)).toStrictEqual([]);
      expect(getNodesByLevel(buffer, LEVELS.ERROR)).toStrictEqual([
        errorMap.get("|usrr_rear_left_center/usrr_segmentation_node|status|"),
      ]);
      expect(getNodesByLevel(buffer, LEVELS.OK)).toStrictEqual([
        okMap.get("|watchdog|status|"),
        okMap.get("|mctm_logger|MCTM Logger|"),
      ]);
      expect(getNodesByLevel(buffer, LEVELS.WARN)).toStrictEqual([
        warnMap.get("|camera_front_left_40/camera_ground_rendering|status|"),
      ]);
    });
  });

  describe("getSortedNodes", () => {
    it("sorts nodes that match hardware ID, if present", () => {
      const nodes = getNodesByLevel(buffer, LEVELS.OK);
      expect(getSortedNodes(nodes, "", [])).toStrictEqual([
        okMap.get("|mctm_logger|MCTM Logger|"),
        okMap.get("|watchdog|status|"),
      ]);
      expect(getSortedNodes(nodes, "watchdog", [])).toStrictEqual([okMap.get("|watchdog|status|")]);
      expect(getSortedNodes(nodes, "mctm_logger", [])).toStrictEqual([okMap.get("|mctm_logger|MCTM Logger|")]);
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
