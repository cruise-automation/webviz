// @flow
//
//  Copyright (c) 2018-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import MessageCollector from "./MessageCollector";
import type { Marker } from "webviz-core/src/types/Messages";

const makeMarker = (namespace: string, id: string): Marker => {
  const result = {
    header: {
      stamp: { sec: 100, nsec: 100 },
      frame_id: "foo",
    },
    type: 1,
    id,
    action: 0,
    ns: namespace,
    name: `${namespace}/${id}`,
    lifetime: { sec: 0, nsec: 0 },
    pose: {
      position: { x: 0, y: 0, z: 0 },
      orientation: { x: 0, y: 0, z: 0, w: 0 },
    },
    color: { r: 0, g: 0, b: 0, a: 0 },
    scale: { x: 0, y: 0, z: 0 },
  };
  return result;
};

describe("MessageCollector", () => {
  it("returns an empty array on initialization", () => {
    const collector = new MessageCollector();
    expect(collector.getMessages()).toHaveLength(0);
  });

  it("returns all collected messages", () => {
    const collector = new MessageCollector();
    const marker = makeMarker("ns", "foo");
    collector.addMarker("/topic", marker);
    expect(collector.getMessages()).toHaveLength(1);
    expect(collector.getMessages()).toEqual([marker]);
    collector.addMessage("/topic", { name: "baz", foo: "bar" });
    expect(collector.getMessages()).toHaveLength(2);
  });

  it("keeps reference to marker around forever if it does not have an expire time", () => {
    const collector = new MessageCollector();
    const marker = makeMarker("ns", "foo");
    collector.setClock({ sec: 100, nsec: 100 });
    collector.addMarker("/topic", marker);
    expect(collector.getMessages()).toHaveLength(1);
    collector.setClock({ sec: 100, nsec: 200 });
    expect(collector.getMessages()).toHaveLength(1);
    collector.setClock({ sec: 100000, nsec: 200 });
    expect(collector.getMessages()).toHaveLength(1);
  });

  it("flushes all messages and non-lifetime markers", () => {
    const collector = new MessageCollector();
    const marker = makeMarker("ns", "foo");
    const lifetimeMarker = makeMarker("", "baz");
    lifetimeMarker.lifetime = { sec: 0, nsec: 1 };
    collector.setClock({ sec: 100, nsec: 100 });
    collector.addMarker("/topic", marker);
    collector.addMarker("/topic2", lifetimeMarker);
    collector.addMessage("/bar", { baz: true });
    expect(collector.getMessages()).toHaveLength(3);
    collector.flush();
    expect(collector.getMessages()).toEqual([lifetimeMarker]);
  });

  it("expires marker if lifetime is exceeded", () => {
    const collector = new MessageCollector();
    const marker = makeMarker("ns", "foo");
    marker.header.stamp = { sec: 100, nsec: 90 };
    const lifetimeNanos = 5000000;
    marker.lifetime = { sec: 0, nsec: lifetimeNanos };

    collector.setClock({ sec: 100, nsec: 100 });
    collector.addMarker("/topic", marker);
    expect(collector.getMessages()).toHaveLength(1);

    collector.setClock({ sec: 100, nsec: 100 + lifetimeNanos });
    expect(collector.getMessages()).toHaveLength(1);

    collector.setClock({ sec: 100, nsec: 100 + lifetimeNanos + 1 });
    expect(collector.getMessages()).toHaveLength(0);

    collector.addMarker("/topic", marker);
    collector.setClock({ sec: 10000000, nsec: 100 });
    expect(collector.getMessages()).toHaveLength(0);
  });

  it("flushes existing messages w/o lifetime when decayTime in Topic Settings starts coming in, expires them accordingly", () => {
    const collector = new MessageCollector();
    collector.setClock({ sec: 100, nsec: 10 });
    collector.addMessage("/topic", { name: "foo", foo: "bar" });
    expect(collector.getMessages()).toHaveLength(1);

    collector.setClock({ sec: 100, nsec: 30 });
    collector.addMessage("/topic", { name: "foo", foo: "baz", lifetime: { sec: 100, nsec: 10 } });
    expect(collector.getMessages()).toHaveLength(1);

    const fooBatMsg = { name: "foo", foo: "bat", lifetime: { sec: 100, nsec: 20 } };
    collector.setClock({ sec: 100, nsec: 31 });
    collector.addMessage("/topic", fooBatMsg);
    expect(collector.getMessages()).toHaveLength(2);

    collector.setClock({ sec: 200, nsec: 41 });
    expect(collector.getMessages()).toHaveLength(1);
    expect(collector.getMessages()[0]).toEqual(fooBatMsg);

    collector.setClock({ sec: 200, nsec: 52 });
    expect(collector.getMessages()).toHaveLength(0);
  });

  it("expires potential existing messages with decay times when decay time is reset to 0", () => {
    const collector = new MessageCollector();
    collector.setClock({ sec: 100, nsec: 10 });
    collector.addMessage("/topic", { name: "foo", foo: "bar", lifetime: { sec: 100, nsec: 15 } });
    expect(collector.getMessages()).toHaveLength(1);

    collector.setClock({ sec: 100, nsec: 20 });
    collector.addMessage("/topic", { name: "foo", foo: "baz", lifetime: { sec: 100, nsec: 20 } });
    expect(collector.getMessages()).toHaveLength(2);

    const fooBatMessage = { name: "foo", foo: "bat" };
    collector.setClock({ sec: 100, nsec: 30 });
    collector.addMessage("/topic", fooBatMessage);
    expect(collector.getMessages()).toHaveLength(1);
    expect(collector.getMessages()[0]).toEqual(fooBatMessage);
  });

  it("overwrites non-marker messages based on name", () => {
    const collector = new MessageCollector();
    const message = { name: "foo" };
    collector.addMessage("/foo", message);
    expect(collector.getMessages()).toEqual([{ name: "foo" }]);
    collector.addMessage("/foo", message);
    expect(collector.getMessages()).toEqual([{ name: "foo" }]);
  });
});
