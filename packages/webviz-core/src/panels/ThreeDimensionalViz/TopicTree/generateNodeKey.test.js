// @flow
//
//  Copyright (c) 2020-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import generateNodeKey from "./generateNodeKey";

describe("generateNodeKey", () => {
  it("throws an error when no topicName or name are provided", () => {
    expect(() => generateNodeKey({})).toThrow();
  });

  it("prioritizes topicName over name", () => {
    expect(generateNodeKey({ topicName: "/foo", name: "Foo" })).toEqual("t:/foo");
  });

  it("creates a namespace node", () => {
    expect(generateNodeKey({ topicName: "/foo", namespace: "a" })).toEqual("ns:/foo:a");
  });

  it("creates a name node", () => {
    expect(generateNodeKey({ name: "Foo" })).toEqual("name:Foo");
  });
  it("generates key for bag2 group", () => {
    expect(generateNodeKey({ name: "Foo", isFeatureColumn: true })).toEqual("name_2:Foo");
  });
  it("generates key for bag2 topic", () => {
    expect(generateNodeKey({ topicName: "/foo", name: "Foo", isFeatureColumn: true })).toEqual(
      "t:/webviz_source_2/foo"
    );
  });
  it("generates key for bag2 namespace", () => {
    expect(generateNodeKey({ topicName: "/foo", namespace: "ns1", isFeatureColumn: true })).toEqual(
      "ns:/webviz_source_2/foo:ns1"
    );
  });
});
