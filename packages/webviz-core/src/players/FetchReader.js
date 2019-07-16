// @flow
//
//  Copyright (c) 2019-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.
import { Readable } from "stream";

// a node.js style readable stream wrapper for the htm5 stream api:
// https://developer.mozilla.org/en-US/docs/Web/API/Streams_API
export default class FetchReader extends Readable {
  _response: any;
  _reader: ReadableStreamReader;
  _controller: AbortController;
  _aborted: boolean = false;
  _url: string;

  constructor(url: string, options: ?Object) {
    super();
    this._url = url;
    this._controller = new AbortController();
    this._response = fetch(url, { ...options, signal: this._controller.signal });
  }

  // you can only call getReader once on a response body
  // so keep a local copy of the reader and return it after the first call to get a reader
  async _getReader(): Promise<?ReadableStreamReader> {
    if (this._reader) {
      return this._reader;
    }
    let data;
    try {
      data = await this._response;
    } catch (err) {
      setImmediate(() => {
        this.emit("error", new Error(`Request failed, fetch failed: ${this._url}`));
      });
      return undefined;
    }
    if (!data) {
      setImmediate(() => {
        this.emit("error", new Error(`Request failed, no data: ${this._url}`));
      });
      return undefined;
    }
    if (!`${data.status}`.startsWith("2")) {
      setImmediate(() => {
        this.emit("error", new Error(`Bad response status code (${data.status}): ${this._url}`));
      });
      return undefined;
    }
    this._reader = data.body.getReader();
    return this._reader;
  }

  _read() {
    this._getReader().then((reader) => {
      // if no reader is returned then we've encountered an error
      if (!reader) {
        return;
      }
      reader
        .read()
        .then(({ done, value }) => {
          // no more to read, signal stream is finished
          if (done) {
            return this.push(null);
          }
          this.push(Buffer.from((value: any)));
        })
        .catch((err) => {
          // canceling the xhr request causes the promise to reject
          if (this._aborted) {
            return this.push(null);
          }
          this.emit("error", err);
        });
    });
  }

  // aborts the xhr request if user calls stream.destroy()
  _destroy() {
    this._aborted = true;
    this._controller.abort();
  }
}
