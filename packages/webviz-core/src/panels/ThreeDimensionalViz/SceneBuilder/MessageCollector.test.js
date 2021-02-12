// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import MessageCollector from "./MessageCollector";
import type { Interactive } from "webviz-core/src/panels/ThreeDimensionalViz/Interactions/types";
import type { BaseMarker } from "webviz-core/src/types/Messages";

const makeMarker = (namespace: string, id: string): Interactive<BaseMarker> => {
  const originalMessage = {
    header: {
      stamp: { sec: 100, nsec: 100 },
      frame_id: "foo",
    },
    type: 1,
    id,
    action: 0,
    ns: namespace,
    lifetime: { sec: 0, nsec: 0 },
    pose: {
      position: { x: 0, y: 0, z: 0 },
      orientation: { x: 0, y: 0, z: 0, w: 0 },
    },
    color: { r: 0, g: 0, b: 0, a: 0 },
    scale: { x: 0, y: 0, z: 0 },
  };
  return { ...originalMessage, interactionData: { topic: "/topic", originalMessage } };
};

const getName = (marker: BaseMarker): string => `${marker.ns}/${marker.id}`;
const interactive = (message) => ({ ...message, interactionData: { topic: "/topic", originalMessage: message } });

describe("MessageCollector", () => {
  it("returns an empty array on initialization", () => {
    const collector = new MessageCollector();
    expect(collector.getMessages()).toHaveLength(0);
  });

  it("returns all collected messages", () => {
    const collector = new MessageCollector();
    const marker = makeMarker("ns", "foo");
    collector.addMarker(marker, getName(marker));
    expect(collector.getMessages()).toHaveLength(1);
    expect(collector.getMessages()).toEqual([marker]);
    collector.addNonMarker("/topic", interactive({ name: "baz", foo: "bar" }));
    expect(collector.getMessages()).toHaveLength(2);
  });

  it("keeps reference to marker around forever if it does not have an expire time", () => {
    const collector = new MessageCollector();
    const marker = makeMarker("ns", "foo");
    collector.setClock({ sec: 100, nsec: 100 });
    collector.addMarker(marker, getName(marker));
    expect(collector.getMessages()).toHaveLength(1);
    collector.setClock({ sec: 100, nsec: 200 });
    expect(collector.getMessages()).toHaveLength(1);
    collector.setClock({ sec: 100000, nsec: 200 });
    expect(collector.getMessages()).toHaveLength(1);
  });

  it("flushes all messages and non-lifetime markers", () => {
    const collector = new MessageCollector();
    const marker = makeMarker("ns", "foo");
    const lifetimeMarker: Interactive<BaseMarker> = {
      ...makeMarker("", "baz"),
      lifetime: { sec: 0, nsec: 1 },
    };
    const noLifetimeMarker = {
      ...makeMarker("", "fooz"),
      lifetime: undefined,
    };
    collector.setClock({ sec: 100, nsec: 100 });
    collector.addMarker(marker, getName(marker));
    collector.addMarker(lifetimeMarker, getName(lifetimeMarker));
    collector.addNonMarker("/fooz", noLifetimeMarker);
    expect(collector.getMessages()).toHaveLength(3);
    collector.flush();
    expect(collector.getMessages()).toHaveLength(2);
    expect(collector.getMessages()).toEqual([marker, lifetimeMarker]);
  });

  it("expires marker if lifetime is exceeded", () => {
    const collector = new MessageCollector();
    const baseMarker = makeMarker("ns", "foo");
    const lifetimeNanos = 5000000;
    const marker: Interactive<BaseMarker> = {
      ...baseMarker,
      header: { ...baseMarker.header, stamp: { sec: 100, nsec: 90 } },
      lifetime: { sec: 0, nsec: lifetimeNanos },
    };

    collector.setClock({ sec: 100, nsec: 100 });
    collector.addMarker(marker, getName(marker));
    expect(collector.getMessages()).toHaveLength(1);

    collector.setClock({ sec: 100, nsec: 100 + lifetimeNanos });
    expect(collector.getMessages()).toHaveLength(1);

    collector.setClock({ sec: 100, nsec: 100 + lifetimeNanos + 1 });
    expect(collector.getMessages()).toHaveLength(0);

    collector.addMarker(marker, getName(marker));
    collector.setClock({ sec: 10000000, nsec: 100 });
    expect(collector.getMessages()).toHaveLength(0);
  });

  it("flushes existing messages w/o lifetime when decayTime in Topic Settings starts coming in, expires them accordingly", () => {
    const collector = new MessageCollector();
    collector.setClock({ sec: 100, nsec: 10 });
    collector.addNonMarker("/topic", interactive({ name: "foo", foo: "bar" }));
    expect(collector.getMessages()).toHaveLength(1);

    collector.setClock({ sec: 100, nsec: 30 });
    collector.addNonMarker("/topic", interactive({ name: "foo", foo: "baz" }), { sec: 100, nsec: 10 });
    expect(collector.getMessages()).toHaveLength(1);

    const fooBatMsg = interactive({ name: "foo", foo: "bat" });
    collector.setClock({ sec: 100, nsec: 31 });
    collector.addNonMarker("/topic", fooBatMsg, { sec: 100, nsec: 20 });
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
    collector.addNonMarker("/topic", interactive({ name: "foo", foo: "bar" }), { sec: 100, nsec: 15 });
    expect(collector.getMessages()).toHaveLength(1);

    collector.setClock({ sec: 100, nsec: 20 });
    collector.addNonMarker("/topic", interactive({ name: "foo", foo: "baz" }), { sec: 100, nsec: 20 });
    expect(collector.getMessages()).toHaveLength(2);

    const fooBatMessage = interactive({ name: "foo", foo: "bat" });
    collector.setClock({ sec: 100, nsec: 30 });
    collector.addNonMarker("/topic", fooBatMessage);
    expect(collector.getMessages()).toHaveLength(1);
    expect(collector.getMessages()[0]).toEqual(fooBatMessage);
  });

  it("overwrites non-marker messages based on name", () => {
    const collector = new MessageCollector();
    const message = interactive({ name: "foo" });
    collector.addNonMarker("/foo", message);
    expect(collector.getMessages()).toEqual([message]);
    collector.addNonMarker("/foo", message);
    expect(collector.getMessages()).toEqual([message]);
  });

  it("allow multiple messages with the same timestamp", () => {
    const collector = new MessageCollector();
    // Set a lifetime value so the message collector creates a unique key
    // See addNonMarker() implementation in MessageCollector
    const lifetime = { sec: 123, nsec: 456 };
    collector.addNonMarker("/topic", interactive({ name: "foo", foo: "bar" }), lifetime);
    collector.addNonMarker("/topic", interactive({ name: "foo", foo: "bar" }), lifetime);
    expect(collector.getMessages()).toHaveLength(2);
  });
});
