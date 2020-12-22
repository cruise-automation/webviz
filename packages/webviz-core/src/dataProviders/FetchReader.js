// @flow
//
//  Copyright (c) 2019-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.
import { Readable } from "stream";

// A node.js-style readable stream wrapper for the Streams API:
// https://developer.mozilla.org/en-US/docs/Web/API/Streams_API
export default class FetchReader extends Readable {
  _response: any;
  _reader: ReadableStreamReader;
  _controller: AbortController;
  _aborted: boolean = false;
  _url: string;

  constructor(url: string, options: ?RequestOptions) {
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
        const requestId = data.headers.get("x-request-id");
        this.emit(
          "error",
          new Error(`Bad response status code (${data.status}): ${this._url}. x-request-id: ${requestId}`)
        );
      });
      return undefined;
    }

    // The fetch succeeded, but there might still be an error streaming.
    try {
      // When a stream is closed or errors, any reader it is locked to is released.
      // If the getReader method is called on an already locked stream, an exception will be thrown.
      // This is caused by server-side errors, but we should catch it anyway.
      this._reader = data.body.getReader();
    } catch (err) {
      setImmediate(() => {
        this.emit("error", new Error(`Request succeeded, but failed to stream: ${this._url}`));
      });
      return undefined;
    }

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
          // Flow doesn't know that value is only undefined when value done is true.
          if (value != null) {
            this.push(Buffer.from(value.buffer));
          }
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
