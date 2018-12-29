// @flow
//
//  Copyright (c) 2018-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { cloneDeep } from "lodash";

import {
  traverseStructure,
  messagePathsForDatatype,
  messagePathStructures,
  validTerminatingStructureItem,
} from "./messagePathsForDatatype";

const datatypes = {
  "pose_msgs/PoseDebug": [
    { name: "header", type: "std_msgs/Header", isArray: false },
    { name: "some_pose", type: "pose_msgs/SomePose", isArray: false },
  ],
  "pose_msgs/SomePose": [
    { name: "header", type: "std_msgs/Header", isArray: false },
    { name: "x", type: "float64", isArray: false },
    { name: "SOME_CONSTANT", type: "float64", isArray: false, isConstant: true, value: 10 }, // Should be ignored.
    { name: "dummy_array", type: "float64", isArray: true },
  ],
  "std_msgs/Header": [
    { name: "seq", type: "uint32", isArray: false },
    { name: "stamp", type: "time", isArray: false },
    { name: "frame_id", type: "string", isArray: false },
  ],
};

describe("messagePathStructures", () => {
  it("parses datatypes into a flat structure", () => {
    expect(messagePathStructures(datatypes)).toEqual({
      "pose_msgs/SomePose": {
        nextByName: {
          dummy_array: {
            next: { primitiveType: "float64", structureType: "primitive", datatype: "pose_msgs/SomePose" },
            structureType: "array",
            datatype: "pose_msgs/SomePose",
          },
          header: {
            nextByName: {
              frame_id: { primitiveType: "string", structureType: "primitive", datatype: "std_msgs/Header" },
              seq: { primitiveType: "uint32", structureType: "primitive", datatype: "std_msgs/Header" },
              stamp: { primitiveType: "time", structureType: "primitive", datatype: "std_msgs/Header" },
            },
            structureType: "message",
            datatype: "std_msgs/Header",
          },
          x: { primitiveType: "float64", structureType: "primitive", datatype: "pose_msgs/SomePose" },
        },
        structureType: "message",
        datatype: "pose_msgs/SomePose",
      },
      "pose_msgs/PoseDebug": {
        nextByName: {
          header: {
            nextByName: {
              frame_id: { primitiveType: "string", structureType: "primitive", datatype: "std_msgs/Header" },
              seq: { primitiveType: "uint32", structureType: "primitive", datatype: "std_msgs/Header" },
              stamp: { primitiveType: "time", structureType: "primitive", datatype: "std_msgs/Header" },
            },
            structureType: "message",
            datatype: "std_msgs/Header",
          },
          some_pose: {
            nextByName: {
              dummy_array: {
                next: { primitiveType: "float64", structureType: "primitive", datatype: "pose_msgs/SomePose" },
                structureType: "array",
                datatype: "pose_msgs/SomePose",
              },
              header: {
                nextByName: {
                  frame_id: { primitiveType: "string", structureType: "primitive", datatype: "std_msgs/Header" },
                  seq: { primitiveType: "uint32", structureType: "primitive", datatype: "std_msgs/Header" },
                  stamp: { primitiveType: "time", structureType: "primitive", datatype: "std_msgs/Header" },
                },
                structureType: "message",
                datatype: "std_msgs/Header",
              },
              x: { primitiveType: "float64", structureType: "primitive", datatype: "pose_msgs/SomePose" },
            },
            structureType: "message",
            datatype: "pose_msgs/SomePose",
          },
        },
        structureType: "message",
        datatype: "pose_msgs/PoseDebug",
      },
      "std_msgs/Header": {
        nextByName: {
          frame_id: { primitiveType: "string", structureType: "primitive", datatype: "std_msgs/Header" },
          seq: { primitiveType: "uint32", structureType: "primitive", datatype: "std_msgs/Header" },
          stamp: { primitiveType: "time", structureType: "primitive", datatype: "std_msgs/Header" },
        },
        structureType: "message",
        datatype: "std_msgs/Header",
      },
    });
  });

  it("caches when passing in the same datatypes", () => {
    expect(messagePathStructures(datatypes)).toBe(messagePathStructures(datatypes));
    expect(messagePathStructures(cloneDeep(datatypes))).not.toBe(messagePathStructures(datatypes));
  });
});

describe("messagePathsForDatatype", () => {
  it("returns all possible message paths when not passing in `validTypes`", () => {
    expect(messagePathsForDatatype("pose_msgs/PoseDebug", datatypes)).toEqual([
      "",
      ".header",
      ".header.frame_id",
      ".header.seq",
      ".header.stamp",
      ".some_pose",
      ".some_pose.dummy_array",
      ".some_pose.dummy_array[:]",
      ".some_pose.header",
      ".some_pose.header.frame_id",
      ".some_pose.header.seq",
      ".some_pose.header.stamp",
      ".some_pose.x",
    ]);
  });

  it("returns an array of possible message paths for the given `validTypes`", () => {
    expect(messagePathsForDatatype("pose_msgs/PoseDebug", datatypes, ["float64"])).toEqual([
      ".some_pose.dummy_array[:]",
      ".some_pose.x",
    ]);
  });

  it("does not suggest hashes with multiple values when setting `noMultiSlices`", () => {
    expect(messagePathsForDatatype("pose_msgs/PoseDebug", datatypes, ["float64"], /* noMultiSlices*/ true)).toEqual([
      ".some_pose.dummy_array[0]",
      ".some_pose.x",
    ]);
  });
});

describe("validTerminatingStructureItem", () => {
  it("is invalid for empty structureItem", () => {
    expect(validTerminatingStructureItem()).toEqual(false);
  });

  it("works for strutureType", () => {
    expect(
      validTerminatingStructureItem({ structureType: "message", nextByName: {}, datatype: "" }, ["message"])
    ).toEqual(true);
    expect(
      validTerminatingStructureItem({ structureType: "message", nextByName: {}, datatype: "" }, ["array"])
    ).toEqual(false);
  });

  it("works for primitiveType", () => {
    expect(
      validTerminatingStructureItem({ structureType: "primitive", primitiveType: "time", datatype: "" }, ["time"])
    ).toEqual(true);
    expect(
      validTerminatingStructureItem({ structureType: "primitive", primitiveType: "time", datatype: "" }, ["uint32"])
    ).toEqual(false);
  });
});

describe("traverseStructure", () => {
  it("returns whether the path is valid for the structure, plus some metadata", () => {
    const structure = messagePathStructures(datatypes)["pose_msgs/PoseDebug"];

    // Valid:
    expect(
      traverseStructure(structure, [{ type: "name", name: "some_pose" }, { type: "name", name: "x" }])
      // $FlowFixMe
    ).toEqual({ valid: true, msgPathPart: undefined, structureItem: structure.nextByName.some_pose.nextByName.x });
    expect(
      traverseStructure(structure, [
        { type: "name", name: "some_pose" },
        { type: "name", name: "dummy_array" },
        { type: "slice", start: 50, end: 100 },
      ])
    ).toEqual({
      valid: true,
      msgPathPart: undefined,
      // $FlowFixMe
      structureItem: structure.nextByName.some_pose.nextByName.dummy_array.next,
    });
    expect(
      traverseStructure(structure, [
        { type: "name", name: "some_pose" },
        { type: "filter", name: "x", value: 10, nameLoc: 123 },
        { type: "name", name: "dummy_array" },
        { type: "slice", start: 50, end: 100 },
      ])
    ).toEqual({
      valid: true,
      msgPathPart: undefined,
      // $FlowFixMe
      structureItem: structure.nextByName.some_pose.nextByName.dummy_array.next,
    });
    expect(traverseStructure(structure, [{ type: "name", name: "some_pose" }])).toEqual({
      valid: true,
      msgPathPart: undefined,
      structureItem: structure.nextByName.some_pose,
    });

    // Invalid:
    expect(
      traverseStructure(structure, [
        { type: "name", name: "some_pose" },
        { type: "filter", name: "y", value: 10, nameLoc: 123 },
      ])
    ).toEqual({
      valid: false,
      msgPathPart: { name: "y", nameLoc: 123, type: "filter", value: 10 },
      structureItem: messagePathStructures(datatypes)["pose_msgs/SomePose"],
    });
  });
});
