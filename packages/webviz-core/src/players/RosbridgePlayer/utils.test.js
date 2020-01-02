// @flow
//
//  Copyright (c) 2019-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.
import { messageDetailsToRosDatatypes, sanitizeMessage, type RoslibTypedef } from "./utils";

describe("RosbridgePlayer utils", () => {
  describe("messageDetailsToRosDatatypes", () => {
    it("transforms the roslibjs format into our own", () => {
      const roslibjsTypedefs: RoslibTypedef[] = [
        {
          fieldtypes: ["std_msgs/Header", "byte", "string", "string", "string", "string", "uint32", "string"],
          fieldnames: ["header", "level", "name", "msg", "file", "function", "line", "topics"],
          examples: ["{}", "0", "", "", "", "", "0", "[]"],
          // For now we don't parse the constants yet.
          // TODO(JP): Actually parse the constants.
          constnames: ["DEBUG", "ERROR", "FATAL", "INFO", "WARN"],
          constvalues: ["1", "8", "16", "2", "4"],
          type: "rosgraph_msgs/Log",
          fieldarraylen: [-1, -1, -1, -1, -1, -1, -1, 0],
        },
        {
          fieldtypes: ["uint32", "time", "string"],
          fieldnames: ["seq", "stamp", "frame_id"],
          constnames: [],
          examples: ["0", "{}", ""],
          constvalues: [],
          type: "std_msgs/Header",
          fieldarraylen: [-1, -1, -1],
        },
        // The "time" field should be skipped.
        {
          fieldtypes: ["int32", "int32"],
          fieldnames: ["secs", "nsecs"],
          constnames: [],
          examples: ["0", "0"],
          constvalues: [],
          type: "time",
          fieldarraylen: [-1, -1],
        },
        // The "duration" field should be skipped.
        {
          fieldtypes: ["int32", "int32"],
          fieldnames: ["secs", "nsecs"],
          constnames: [],
          examples: ["0", "0"],
          constvalues: [],
          type: "duration",
          fieldarraylen: [-1, -1],
        },
      ];
      expect(messageDetailsToRosDatatypes(roslibjsTypedefs)).toEqual({
        "rosgraph_msgs/Log": {
          fields: [
            { isComplex: true, name: "header", type: "std_msgs/Header" },
            { name: "level", type: "int8" },
            { name: "name", type: "string" },
            { name: "msg", type: "string" },
            { name: "file", type: "string" },
            { name: "function", type: "string" },
            { name: "line", type: "uint32" },
            { isArray: true, name: "topics", type: "string" },
          ],
        },
        "std_msgs/Header": {
          fields: [
            { name: "seq", type: "uint32" },
            { name: "stamp", type: "time" },
            { name: "frame_id", type: "string" },
          ],
        },
      });
    });
  });

  describe("sanitizeMessage", () => {
    it("translates 'secs' and 'nsecs' into 'sec' and 'nsec'", () => {
      const message = { stamp: { secs: 1, nsecs: 2 }, not_a_stamp: { secs: 1, nsecs: 2, something_else: 3 } };
      sanitizeMessage(message);
      expect(message).toEqual({ stamp: { sec: 1, nsec: 2 }, not_a_stamp: { secs: 1, nsecs: 2, something_else: 3 } });
    });

    // See https://github.com/RobotWebTools/roslibjs/issues/349
    it("paves over a bug in CBOR encoding", () => {
      const message = {
        stamp: { "115,101,99,115": 1, "110,115,101,99,115": 2 },
        not_a_stamp: { "115,101,99,115": 1, "110,115,101,99,115": 2, something_else: 3 },
      };
      sanitizeMessage(message);
      expect(message).toEqual({
        stamp: { sec: 1, nsec: 2 },
        not_a_stamp: { "115,101,99,115": 1, "110,115,101,99,115": 2, something_else: 3 },
      });
    });
  });
});
