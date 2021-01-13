// @flow
//
//  Copyright (c) 2020-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.
import { createRosDatatypesFromFrame, inferDatatypes } from "./datatypes";

const unknown = { type: "unknown", isArray: false };

describe("inferDatatypes", () => {
  it("handles times", () => {
    expect(inferDatatypes(unknown, { sec: 0, nsec: 0 })).toEqual({
      isArray: false,
      type: "message",
      object: {
        sec: { isArray: false, type: "float64" },
        nsec: { isArray: false, type: "float64" },
      },
    });
  });

  it("handles empty arrays", () => {
    expect(inferDatatypes(unknown, { arr: [] })).toEqual({
      isArray: false,
      type: "message",
      object: { arr: { isArray: true, type: "unknown" } },
    });
  });

  it("handles non-empty arrays", () => {
    expect(inferDatatypes(unknown, { arr: [1] })).toEqual({
      isArray: false,
      type: "message",
      object: { arr: { isArray: true, type: "float64" } },
    });
  });

  it("handles mixtures of empty and non-empty arrays", () => {
    const value = {
      thingsWithArrays: [{ arr: [] }, { arr: [] }, { arr: [1] }],
    };
    expect(inferDatatypes(unknown, value)).toEqual({
      isArray: false,
      type: "message",
      object: {
        thingsWithArrays: {
          isArray: true,
          type: "message",
          object: { arr: { type: "float64", isArray: true } },
        },
      },
    });
  });

  it("is robust against nulls", () => {
    const value = { arr: [null, 1], val: null };
    expect(inferDatatypes(unknown, value)).toEqual({
      isArray: false,
      type: "message",
      object: { arr: { isArray: true, type: "float64" }, val: { isArray: false, type: "unknown" } },
    });
  });

  it("handles typed arrays", () => {
    const value = { arr: new Int8Array([1, 2, 3]) };
    expect(inferDatatypes(unknown, value)).toEqual({
      isArray: false,
      type: "message",
      object: { arr: { isArray: true, type: "float64" } },
    });
  });
});

const makeMessage = (message) => ({ receiveTime: { sec: 0, nsec: 0 }, topic: "", message });

describe("createRosDatatypesFromFrame", () => {
  it("handles times", () => {
    const topics = [{ name: "/t1", datatype: "time" }];
    const frame = { "/t1": [makeMessage({ sec: 0, nsec: 0 })] };
    expect(createRosDatatypesFromFrame(topics, frame)).toEqual({
      time: {
        fields: [
          { name: "sec", isComplex: false, type: "float64", isArray: false },
          { name: "nsec", isComplex: false, type: "float64", isArray: false },
        ],
      },
    });
  });

  it("handles arrays", () => {
    const topics = [{ name: "/t1", datatype: "foo" }];
    const frame = {
      "/t1": [
        makeMessage({
          thingsWithArrays: [{ arr: [] }, { arr: [] }, { arr: [1] }],
        }),
      ],
    };
    expect(createRosDatatypesFromFrame(topics, frame)).toEqual({
      foo: {
        fields: [{ name: "thingsWithArrays", isComplex: true, type: "test_msgs/t1/auto_0", isArray: true }],
      },
      "test_msgs/t1/auto_0": {
        fields: [{ name: "arr", isComplex: false, type: "float64", isArray: true }],
      },
    });
  });

  it("creates duplicate types when present in multiple places", () => {
    const topics = [{ name: "/t1", datatype: "bar" }];
    const frame = { "/t1": [makeMessage({ hasFoo1: { foo: 0 }, hasFoo2: { foo: 0 } })] };
    expect(createRosDatatypesFromFrame(topics, frame)).toEqual({
      bar: {
        fields: [
          { name: "hasFoo1", isComplex: true, isArray: false, type: "test_msgs/t1/auto_0" },
          { name: "hasFoo2", isComplex: true, isArray: false, type: "test_msgs/t1/auto_1" },
        ],
      },
      "test_msgs/t1/auto_0": {
        fields: [{ name: "foo", isComplex: false, type: "float64", isArray: false }],
      },
      "test_msgs/t1/auto_1": {
        fields: [{ name: "foo", isComplex: false, type: "float64", isArray: false }],
      },
    });
  });

  it("merges heterogeneous data", () => {
    const topics = [{ name: "/t1", datatype: "foo" }];
    const frame = { "/t1": [makeMessage({ bar: 1 }), makeMessage({ baz: 1 })] };
    expect(createRosDatatypesFromFrame(topics, frame)).toEqual({
      foo: {
        fields: [
          { name: "bar", isComplex: false, isArray: false, type: "float64" },
          { name: "baz", isComplex: false, isArray: false, type: "float64" },
        ],
      },
    });
  });

  it("throws when fields change type", () => {
    const topics = [{ name: "/t1", datatype: "foo" }];
    const frame = { "/t1": [makeMessage({ bar: 1 }), makeMessage({ bar: "str" })] };
    expect(() => createRosDatatypesFromFrame(topics, frame)).toThrow("Type mismatch");
  });

  it("classifies marker metadata as a json field", () => {
    const topics = [{ name: "/t1", datatype: "fake_msgs/MarkerWithMetadata" }];
    const frame = {
      "/t1": [
        makeMessage({
          header: 0,
          ns: 0,
          id: 0,
          type: 0,
          action: 0,
          pose: 0,
          scale: 0,
          color: 0,
          lifetime: 0,
          frame_locked: 0,
          points: 0,
          colors: 0,
          text: 0,
          mesh_resource: 0,
          mesh_use_embedded_materials: 0,
          metadata: {},
        }),
      ],
    };
    expect(createRosDatatypesFromFrame(topics, frame)).toEqual({
      "fake_msgs/MarkerWithMetadata": {
        fields: [
          { name: "header", type: "float64", isArray: false, isComplex: false },
          { name: "ns", type: "float64", isArray: false, isComplex: false },
          { name: "id", type: "float64", isArray: false, isComplex: false },
          { name: "type", type: "float64", isArray: false, isComplex: false },
          { name: "action", type: "float64", isArray: false, isComplex: false },
          { name: "pose", type: "float64", isArray: false, isComplex: false },
          { name: "scale", type: "float64", isArray: false, isComplex: false },
          { name: "color", type: "float64", isArray: false, isComplex: false },
          { name: "lifetime", type: "float64", isArray: false, isComplex: false },
          { name: "frame_locked", type: "float64", isArray: false, isComplex: false },
          { name: "points", type: "float64", isArray: false, isComplex: false },
          { name: "colors", type: "float64", isArray: false, isComplex: false },
          { name: "text", type: "float64", isArray: false, isComplex: false },
          { name: "mesh_resource", type: "float64", isArray: false, isComplex: false },
          { name: "mesh_use_embedded_materials", type: "float64", isArray: false, isComplex: false },
          { name: "metadata", type: "json", isArray: false, isComplex: false },
        ],
      },
    });
  });

  it("classifies marker metadataByIndex as a json field", () => {
    const topics = [{ name: "/t1", datatype: "fake_msgs/MarkerWithMetadata" }];
    const frame = {
      "/t1": [
        makeMessage({
          header: 0,
          ns: 0,
          id: 0,
          type: 0,
          action: 0,
          pose: 0,
          scale: 0,
          color: 0,
          lifetime: 0,
          frame_locked: 0,
          points: 0,
          colors: 0,
          text: 0,
          mesh_resource: 0,
          mesh_use_embedded_materials: 0,
          metadataByIndex: [],
        }),
      ],
    };
    expect(createRosDatatypesFromFrame(topics, frame)).toEqual({
      "fake_msgs/MarkerWithMetadata": {
        fields: [
          { name: "header", type: "float64", isArray: false, isComplex: false },
          { name: "ns", type: "float64", isArray: false, isComplex: false },
          { name: "id", type: "float64", isArray: false, isComplex: false },
          { name: "type", type: "float64", isArray: false, isComplex: false },
          { name: "action", type: "float64", isArray: false, isComplex: false },
          { name: "pose", type: "float64", isArray: false, isComplex: false },
          { name: "scale", type: "float64", isArray: false, isComplex: false },
          { name: "color", type: "float64", isArray: false, isComplex: false },
          { name: "lifetime", type: "float64", isArray: false, isComplex: false },
          { name: "frame_locked", type: "float64", isArray: false, isComplex: false },
          { name: "points", type: "float64", isArray: false, isComplex: false },
          { name: "colors", type: "float64", isArray: false, isComplex: false },
          { name: "text", type: "float64", isArray: false, isComplex: false },
          { name: "mesh_resource", type: "float64", isArray: false, isComplex: false },
          { name: "mesh_use_embedded_materials", type: "float64", isArray: false, isComplex: false },
          { name: "metadataByIndex", type: "json", isArray: false, isComplex: false },
        ],
      },
    });
  });

  it("does not classify any old metadata field as JSON", () => {
    const topics = [{ name: "/t1", datatype: "fake_msgs/HasMetadata" }];
    const frame = { "/t1": [makeMessage({ metadata: {} })] };
    expect(createRosDatatypesFromFrame(topics, frame)).toEqual({
      "fake_msgs/HasMetadata": {
        fields: [{ name: "metadata", type: "test_msgs/t1/auto_0", isArray: false, isComplex: true }],
      },
      "test_msgs/t1/auto_0": { fields: [] },
    });
  });
});
