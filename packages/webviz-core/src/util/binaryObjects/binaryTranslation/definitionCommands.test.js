// @flow
//
//  Copyright (c) 2020-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.
import BinaryMessageWriter, { DefinitionCommand } from "webviz-core/src/util/binaryObjects/binaryTranslation";

describe("definitionCommands", () => {
  let writer: BinaryMessageWriter;

  beforeEach(async () => {
    writer = new BinaryMessageWriter();
    await writer.initialize();
  });

  it("optimize commands for MarkerArray", () => {
    writer.registerDefinitions({
      "std_msgs/Header": {
        fields: [
          { type: "uint32", name: "seq" },
          { type: "time", name: "stamp" },
          { type: "string", name: "frame_id" },
        ],
      },
      "geometry_msgs/Point": {
        fields: [{ type: "float64", name: "x" }, { type: "float64", name: "y" }, { type: "float64", name: "z" }],
      },
      "geometry_msgs/Quaternion": {
        fields: [
          { type: "float64", name: "x" },
          { type: "float64", name: "y" },
          { type: "float64", name: "z" },
          { type: "float64", name: "w" },
        ],
      },
      "geometry_msgs/Pose": {
        fields: [
          { type: "geometry_msgs/Point", name: "position", isComplex: true },
          { type: "geometry_msgs/Quaternion", name: "orientation", isComplex: true },
        ],
      },
      "geometry_msgs/Vector3": {
        fields: [{ type: "float64", name: "x" }, { type: "float64", name: "y" }, { type: "float64", name: "z" }],
      },
      "std_msgs/ColorRGBA": {
        fields: [
          { type: "float32", name: "r" },
          { type: "float32", name: "g" },
          { type: "float32", name: "b" },
          { type: "float32", name: "a" },
        ],
      },
      "visualization_msgs/Marker": {
        fields: [
          { type: "std_msgs/Header", name: "header", isComplex: true },
          { type: "string", name: "ns" },
          { type: "int32", name: "id" },
          { type: "int32", name: "type" },
          { type: "int32", name: "action" },
          { type: "geometry_msgs/Pose", name: "pose", isComplex: true },
          { type: "geometry_msgs/Vector3", name: "scale", isComplex: true },
          { type: "std_msgs/ColorRGBA", name: "color", isComplex: true },
          { type: "duration", name: "lifetime" },
          { type: "bool", name: "frame_locked" },
          { type: "geometry_msgs/Point", name: "points", isArray: true },
          { type: "std_msgs/ColorRGBA", name: "colors", isArray: true },
          { type: "string", name: "text" },
          { type: "string", name: "mesh_resource" },
          { type: "bool", name: "mesh_use_embedded_materials" },
        ],
      },
      "visualization_msgs/MarkerArray": {
        fields: [{ type: "visualization_msgs/Marker", name: "markers", isArray: true }],
      },
    });

    expect(writer.getDefinitionCommands("visualization_msgs/MarkerArray")).toStrictEqual([
      // First command is for the Marker Array itself
      DefinitionCommand.DYNAMIC_ARRAY,

      // Read header.sec and header.stamp
      DefinitionCommand.READ_FIXED_SIZE_DATA,

      // Read header.frame_id
      DefinitionCommand.READ_STRING,

      // Read ns
      DefinitionCommand.READ_STRING,

      // Read id, type, action, pose, scale, color, duration and frame_locked together
      DefinitionCommand.READ_FIXED_SIZE_DATA,

      // Read points
      DefinitionCommand.READ_DYNAMIC_SIZE_DATA,

      // Read colors
      DefinitionCommand.READ_DYNAMIC_SIZE_DATA,

      // Read text
      DefinitionCommand.READ_STRING,

      // Read mesh_resource
      DefinitionCommand.READ_STRING,

      // Read mesh_use_embedded_materials
      DefinitionCommand.READ_FIXED_SIZE_DATA,
    ]);
  });
});
