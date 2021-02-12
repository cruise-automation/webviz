// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import PerformanceMeasuringClient from "./performanceMeasuringClient";
import Database from "webviz-core/src/util/indexeddb/Database";

describe("performanceMeasuringClient", () => {
  let onPlaybackFinished, onPlaybackError;
  beforeEach(() => {
    window.indexedDB.databases = () => {
      const dbs = [];
      // until indexedDB.databases() lands in the spec, get the databases on the fake by reaching into it
      // eslint-disable-next-line no-underscore-dangle
      for (const [_, db] of global.indexedDB._databases) {
        dbs.push(db);
      }
      return dbs;
    };
    onPlaybackFinished = jest.fn();
    onPlaybackError = jest.fn();
    window.addEventListener("playbackFinished", (e) => {
      onPlaybackFinished(e.detail);
    });
    window.addEventListener("playbackError", (e) => {
      onPlaybackError(e.detail);
    });
  });
  it("emits a 'finishedPlayback' event when finished", async () => {
    const perfClient = new PerformanceMeasuringClient();
    perfClient.start({ bagLengthMs: 1 });
    await perfClient.finish();
    expect(onPlaybackFinished).toHaveBeenCalled();
    expect(onPlaybackError).not.toHaveBeenCalled();
  });
  it("emits an error event when encountered", () => {
    const perfClient = new PerformanceMeasuringClient();
    perfClient.start({ bagLengthMs: 1 });
    const error = new Error("playback_error");
    perfClient.onError(error);
    expect(onPlaybackFinished).not.toHaveBeenCalled();
    expect(onPlaybackError).toHaveBeenCalledWith(error.toString());
  });
  it("collects IndexedDB stats", async () => {
    const db = await Database.open("dummy-db", 1, (openedDb) => {
      openedDb.createObjectStore("bar", { keyPath: "key" });
    });
    for (let i = 0; i < 10; i++) {
      await db.put("bar", { key: i, data: new Uint8Array(10) });
    }
    const perfClient = new PerformanceMeasuringClient();
    perfClient.start({ bagLengthMs: 1 });
    await perfClient.finish();
    const stats = onPlaybackFinished.mock.calls[0][0];
    expect(stats.idb).toEqual(
      expect.objectContaining({
        dbs: [
          {
            name: "dummy-db",
            version: 1,
            objectStoreRowCounts: [{ name: "bar", rowCount: 10 }],
          },
        ],
      })
    );
  });
});
