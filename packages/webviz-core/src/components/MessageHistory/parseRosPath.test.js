// @flow
//
//  Copyright (c) 2018-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import parseRosPath from "./parseRosPath";

describe("parseRosPath", () => {
  it("parses valid strings", () => {
    expect(parseRosPath("/some0/nice_topic.with[99].stuff[0]")).toEqual({
      topicName: "/some0/nice_topic",
      messagePath: [
        { type: "name", name: "with" },
        { type: "slice", start: 99, end: 99 },
        { type: "name", name: "stuff" },
        { type: "slice", start: 0, end: 0 },
      ],
      modifier: null,
    });
    expect(parseRosPath("/some0/nice_topic.with[99].stuff[0].@derivative")).toEqual({
      topicName: "/some0/nice_topic",
      messagePath: [
        { type: "name", name: "with" },
        { type: "slice", start: 99, end: 99 },
        { type: "name", name: "stuff" },
        { type: "slice", start: 0, end: 0 },
      ],
      modifier: "derivative",
    });
  });

  it("parses slices", () => {
    expect(parseRosPath("/topic.foo[0].bar")).toEqual({
      topicName: "/topic",
      messagePath: [{ type: "name", name: "foo" }, { type: "slice", start: 0, end: 0 }, { type: "name", name: "bar" }],
      modifier: null,
    });
    expect(parseRosPath("/topic.foo[1:3].bar")).toEqual({
      topicName: "/topic",
      messagePath: [{ type: "name", name: "foo" }, { type: "slice", start: 1, end: 3 }, { type: "name", name: "bar" }],
      modifier: null,
    });
    expect(parseRosPath("/topic.foo[1:].bar")).toEqual({
      topicName: "/topic",
      messagePath: [
        { type: "name", name: "foo" },
        { type: "slice", start: 1, end: Infinity },
        { type: "name", name: "bar" },
      ],
      modifier: null,
    });
    expect(parseRosPath("/topic.foo[:10].bar")).toEqual({
      topicName: "/topic",
      messagePath: [{ type: "name", name: "foo" }, { type: "slice", start: 0, end: 10 }, { type: "name", name: "bar" }],
      modifier: null,
    });
    expect(parseRosPath("/topic.foo[:].bar")).toEqual({
      topicName: "/topic",
      messagePath: [
        { type: "name", name: "foo" },
        { type: "slice", start: 0, end: Infinity },
        { type: "name", name: "bar" },
      ],
      modifier: null,
    });
  });

  it("parses filters", () => {
    expect(parseRosPath("/topic.foo{bar=='baz'}.a{bar==\"baz\"}.b{bar==3}.c{bar==false}.d[:]{bar==true}")).toEqual({
      topicName: "/topic",
      messagePath: [
        { type: "name", name: "foo" },
        {
          type: "filter",
          name: "bar",
          value: "baz",
          nameLoc: "/topic.foo{".length,
          valueLoc: "/topic.foo{bar==".length,
        },
        { type: "name", name: "a" },
        {
          type: "filter",
          name: "bar",
          value: "baz",
          nameLoc: "/topic.foo{bar=='baz'}.a{".length,
          valueLoc: "/topic.foo{bar=='baz'}.a{bar==".length,
        },
        { type: "name", name: "b" },
        {
          type: "filter",
          name: "bar",
          value: 3,
          nameLoc: "/topic.foo{bar=='baz'}.a{bar==\"baz\"}.b{".length,
          valueLoc: "/topic.foo{bar=='baz'}.a{bar==\"baz\"}.b{bar==".length,
        },
        { type: "name", name: "c" },
        {
          type: "filter",
          name: "bar",
          value: false,
          nameLoc: "/topic.foo{bar=='baz'}.a{bar==\"baz\"}.b{bar==3}.c{".length,
          valueLoc: "/topic.foo{bar=='baz'}.a{bar==\"baz\"}.b{bar==3}.c{bar==".length,
        },
        { type: "name", name: "d" },
        { type: "slice", start: 0, end: Infinity },
        {
          type: "filter",
          name: "bar",
          value: true,
          nameLoc: "/topic.foo{bar=='baz'}.a{bar==\"baz\"}.b{bar==3}.c{bar==false}.d[:]{".length,
          valueLoc: "/topic.foo{bar=='baz'}.a{bar==\"baz\"}.b{bar==3}.c{bar==false}.d[:]{bar==".length,
        },
      ],
      modifier: null,
    });
  });

  it("parses filters with global variables", () => {
    expect(parseRosPath("/topic.foo{bar==$}.a{bar==$my_var_1}")).toEqual({
      topicName: "/topic",
      messagePath: [
        { type: "name", name: "foo" },
        {
          type: "filter",
          name: "bar",
          value: { variableName: "" },
          nameLoc: "/topic.foo{".length,
          valueLoc: "/topic.foo{bar==".length,
        },
        { type: "name", name: "a" },
        {
          type: "filter",
          name: "bar",
          value: {
            variableName: "my_var_1",
          },
          nameLoc: "/topic.foo{bar==$}.a{".length,
          valueLoc: "/topic.foo{bar==$}.a{bar==".length,
        },
      ],
      modifier: null,
    });
  });

  it("parses unfinished strings", () => {
    expect(parseRosPath("/")).toEqual({ topicName: "/", messagePath: [], modifier: null });
    expect(parseRosPath("/topic.")).toEqual({
      topicName: "/topic",
      messagePath: [{ type: "name", name: "" }],
      modifier: null,
    });
    expect(parseRosPath("/topic.hi.")).toEqual({
      topicName: "/topic",
      messagePath: [{ type: "name", name: "hi" }, { type: "name", name: "" }],
      modifier: null,
    });
    expect(parseRosPath("/topic.hi.@")).toEqual({
      topicName: "/topic",
      messagePath: [{ type: "name", name: "hi" }],
      modifier: "",
    });
    expect(parseRosPath("/topic.foo{}")).toEqual({
      topicName: "/topic",
      messagePath: [
        { type: "name", name: "foo" },
        {
          type: "filter",
          name: "",
          value: "",
          nameLoc: "/topic.foo{".length,
          valueLoc: "/topic.foo{".length,
        },
      ],
      modifier: null,
    });
    expect(parseRosPath("/topic.foo{bar}")).toEqual({
      topicName: "/topic",
      messagePath: [
        { type: "name", name: "foo" },
        {
          type: "filter",
          name: "bar",
          value: "",
          nameLoc: "/topic.foo{".length,
          valueLoc: "/topic.foo{".length,
        },
      ],
      modifier: null,
    });
    expect(parseRosPath("/topic.foo{==1}")).toEqual({
      topicName: "/topic",
      messagePath: [
        { type: "name", name: "foo" },
        {
          type: "filter",
          name: "",
          value: 1,
          nameLoc: "/topic.foo{".length,
          valueLoc: "/topic.foo{==".length,
        },
      ],
      modifier: null,
    });
  });

  it("returns undefined for invalid strings", () => {
    expect(parseRosPath("blah")).toBeUndefined();
    expect(parseRosPath("100")).toBeUndefined();
    expect(parseRosPath("[100]")).toBeUndefined();
    expect(parseRosPath("blah.blah")).toBeUndefined();
    expect(parseRosPath("/topic.no.2d.arrays[0][1]")).toBeUndefined();
    expect(parseRosPath("/topic.foo[].bar")).toBeUndefined();
    expect(parseRosPath("/topic.foo[bar]")).toBeUndefined();
    expect(parseRosPath("/topic.foo{bar==}")).toBeUndefined();
    expect(parseRosPath("/topic.foo{bar==baz}")).toBeUndefined();
  });
});
