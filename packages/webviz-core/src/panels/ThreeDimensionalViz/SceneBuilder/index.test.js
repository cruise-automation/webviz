// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.
import SceneBuilder from "webviz-core/src/panels/ThreeDimensionalViz/SceneBuilder";

describe("SceneBuilder", () => {
  it("on setFrame, modified topics rendered", () => {
    const builder = new SceneBuilder();
    builder.setTopics([{ name: "a", datatype: "A" }]);

    builder.setFrame({ a: [] });

    expect(builder.topicsToRender).toContain("a");
  });

  it("on setFrame, only specified topics rendered", () => {
    const builder = new SceneBuilder();
    builder.setTopics([{ name: "a", datatype: "A" }]);

    builder.setFrame({ b: [] });

    expect(builder.topicsToRender.size).toBe(0);
  });

  it("on setFrame, same instance, nothing rendered", () => {
    const builder = new SceneBuilder();
    builder.setTopics([{ name: "a", datatype: "A" }]);
    const frame = { a: [] };
    builder.setFrame(frame);
    // check that we're set up properly with one topic rendered
    expect(builder.topicsToRender.size).toBe(1);
    builder.render();

    builder.setFrame(frame);

    expect(builder.topicsToRender.size).toBe(0);
  });

  it("on setFrame, same value different instance, topics rendered", () => {
    const builder = new SceneBuilder();
    builder.setTopics([{ name: "a", datatype: "A" }]);
    const frame1 = { a: [] };
    const frame2 = { a: [] };
    builder.setFrame(frame1);
    builder.render();

    builder.setFrame(frame2);

    expect(builder.topicsToRender.size).toBe(1);
  });

  it("on setFrame, latest value saved", () => {
    const builder = new SceneBuilder();
    builder.setTopics([{ name: "a", datatype: "A" }]);
    const messages1 = [];
    const messages2 = [];
    builder.setFrame({ a: messages1 });
    builder.setFrame({ a: messages2 });

    expect(builder.lastSeenMessages.a).not.toBe(messages1);
    expect(builder.lastSeenMessages.a).toBe(messages2);
  });

  it("on setFrame, messages are saved", () => {
    const builder = new SceneBuilder();
    const messagesValue = [];
    builder.setTopics([{ name: "a", datatype: "A" }]);

    builder.setFrame({ a: messagesValue });

    expect(builder.lastSeenMessages.a).toBe(messagesValue);
  });

  it("on setFrame, old messages not clobbered", () => {
    const builder = new SceneBuilder();
    const messagesValue = [];
    builder.setTopics([{ name: "a", datatype: "A" }, { name: "b", datatype: "B" }]);
    builder.setFrame({ a: messagesValue });

    builder.setFrame({ b: messagesValue });

    // a survives even though it's only included in the first setFrame
    expect(builder.lastSeenMessages.a).toBe(messagesValue);
  });

  it("on setFrame, unrendered messages saved", () => {
    const builder = new SceneBuilder();
    const messagesValue = [];
    builder.setTopics([{ name: "a", datatype: "A" }]);

    builder.setFrame({ b: messagesValue });

    expect("b" in builder.lastSeenMessages).toBe(true);
  });

  it("on render, topics to render cleared", () => {
    const builder = new SceneBuilder();
    builder.setTopics([{ name: "a", datatype: "A" }]);
    builder.setFrame({ a: [] });
    // to make sure we're set up right, check that one topic should be rendered
    expect(builder.topicsToRender.size).toBe(1);

    builder.render();

    expect(builder.topicsToRender.size).toBe(0);
  });
});
