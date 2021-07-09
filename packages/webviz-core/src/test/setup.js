// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import "babel-polyfill";
// Node has a TextDecoder in util, but it doesn't support the ascii encoding used in binary message
// rewriting.
import { TextDecoder } from "text-encoding";
import UrlSearchParams from "url-search-params";
import util from "util";
import ws from "ws";

import MemoryStorage from "./MemoryStorage";

process.env.WASM_LZ4_ENVIRONMENT = "NODE";

function noOp() {}

if (typeof window.URL.createObjectURL === "undefined") {
  Object.defineProperty(window.URL, "createObjectURL", { value: noOp });
}

if (typeof window !== "undefined") {
  // make sure window.localStorage exists
  window.localStorage = window.localStorage || new MemoryStorage();

  global.requestAnimationFrame = window.requestAnimationFrame =
    global.requestAnimationFrame || ((cb) => setTimeout(cb, 0));

  global.cancelAnimationFrame = window.cancelAnimationFrame = global.cancelAnimationFrame || ((id) => clearTimeout(id));
  global.TextDecoder = TextDecoder;
  // polyfill URLSearchParams in jsdom
  window.URLSearchParams = UrlSearchParams;
}

// Disallow console.error and console.warn in tests. This should only be called
// from libraries anyway, since for user-code we should be using `Logger`, which
// automatically gets silenced on tests.
// $FlowFixMe - Flow doesn't like that we're overwriting this.
console.error = function(message) {
  // $FlowFixMe
  fail(message); // eslint-disable-line
};
// $FlowFixMe - Flow doesn't like that we're overwriting this.
console.warn = function(message) {
  // We'll have to update these methods, but for now we just ignore their
  // warning messages.
  if (message.includes("https://fb.me/react-unsafe-component-lifecycles")) {
    return;
  }
  // $FlowFixMe
  fail(message); // eslint-disable-line
};

// you can import fakes from fake-indexeddb and attach them to the jsdom global
// https://github.com/dumbmatter/fakeIndexedDB#use
global.indexedDB = require("fake-indexeddb");
global.IDBIndex = require("fake-indexeddb/lib/FDBIndex");
global.IDBCursor = require("fake-indexeddb/lib/FDBCursor");
global.IDBObjectStore = require("fake-indexeddb/lib/FDBObjectStore");
global.IDBTransaction = require("fake-indexeddb/lib/FDBTransaction");
global.IDBDatabase = require("fake-indexeddb/lib/FDBDatabase");
global.IDBKeyRange = require("fake-indexeddb/lib/FDBKeyRange");

// monkey-patch global websocket
global.WebSocket = global.WebSocket || ws;

// $FlowFixMe - Flow does not recognize that `TextEncoder` has been in the util module since v8.3.0.
global.TextEncoder = util.TextEncoder;

if (global.FinalizationRegistry == null) {
  global.FinalizationRegistry = class {
    register() {}
  };
}

// Override lazy load components
require("../hooksImporter").testSetup();

// Set logEvent up with a default implementation
require("webviz-core/src/util/logEvent").resetLogEventForTests();
