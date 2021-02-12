// @flow
//
//  Copyright (c) 2019-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.
import { addTopicPrefix, cartesianProduct, joinTopics, makeTopicCombos } from "webviz-core/src/util/topicUtils";

describe("topicUtil", () => {
  describe("joinTopics", () => {
    it("joins topics with a single /", () => {
      expect(joinTopics("/foo", "bar")).toEqual("/foo/bar");
      expect(joinTopics("/foo", "/bar")).toEqual("/foo/bar");
      expect(joinTopics("/foo", "/bar")).toEqual("/foo/bar");
      expect(joinTopics("//foo", "bar", "/baz")).toEqual("/foo/bar/baz");
      expect(joinTopics("/foo", "////bar", "baz")).toEqual("/foo/bar/baz");
    });
  });

  describe("addTopicPrefix", () => {
    it("works for arrays of topics", () => {
      expect(addTopicPrefix(["foo"], "prefix")).toEqual([`/prefix/foo`]);
      expect(addTopicPrefix(["//foo/bar"], "prefix")).toEqual([`/prefix/foo/bar`]);
      expect(addTopicPrefix(["foo", "bar"], "prefix")).toEqual([`/prefix/foo`, `/prefix/bar`]);
      expect(addTopicPrefix(["/foo", "//bar"], "prefix")).toEqual([`/prefix/foo`, `/prefix/bar`]);
    });
  });

  describe("makeTopicCombos", () => {
    it("makes combinations", () => {
      expect(makeTopicCombos(["foo"], ["bar", "qux"])).toEqual(["/foo/bar", "/foo/qux"]);
      expect(makeTopicCombos(["foo", "bar"], ["qux"])).toEqual(["/foo/qux", "/bar/qux"]);
      expect(makeTopicCombos(["foo"], ["bar", "qux"])).toEqual(["/foo/bar", "/foo/qux"]);
      expect(makeTopicCombos(["foo", "bar"], ["cool", "beans"])).toEqual([
        "/foo/cool",
        "/foo/beans",
        "/bar/cool",
        "/bar/beans",
      ]);
    });
  });

  describe("cartesianProduct", () => {
    it("works", () => {
      expect(cartesianProduct([["foo"], ["bar"]])).toEqual([["foo", "bar"]]);
      expect(cartesianProduct([["foo"], ["bar", "qux"]])).toEqual([["foo", "bar"], ["foo", "qux"]]);
      expect(cartesianProduct([["foo"], ["bar", "qux"]])).toEqual([["foo", "bar"], ["foo", "qux"]]);
      expect(cartesianProduct([["foo", "bar"], ["cool", "beans"]])).toEqual([
        ["foo", "cool"],
        ["foo", "beans"],
        ["bar", "cool"],
        ["bar", "beans"],
      ]);
    });
  });
});
