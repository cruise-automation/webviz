// @flow
//
//  Copyright (c) 2019-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import FetchReader from "webviz-core/src/dataProviders/FetchReader";
import type { FileReader, FileStream } from "webviz-core/src/util/CachedFilelike";

const corsError = `Often this is due to missing CORS headers on the requested URL.

First of all, be aware that redirects don't work with CORS. So you'll have to point to the resource directly. So https://webviz.io/try/?remote-bag-url=https%3A%2F%2Fopen-source-webviz-ui.s3.amazonaws.com%2Fdemo.bag will work (note the URL encoded using "encodeURIComponent"), but pointing to a server that then redirects to a URL like that will NOT work.

If your data is sensitive, you can generate a signed S3 url, and use that directly with ?remote-bag-url=. That URL will then only work for a limited time period, and you can have a server that only signs URLs for authenticated users.

Then, be sure to set up your CORS configuration something like this (Terraform S3 example):

cors_rule {
  allowed_methods = ["GET", "HEAD"]
  allowed_origins = ["https://webviz.io"]
  allowed_headers = ["*"]
  expose_headers  = ["ETag", "Content-Type", "Accept-Ranges", "Content-Length"]
}

And here's a GCS example (also using Terraform):

cors {
  origin = ["https://webviz.io"]
  method = ["GET", "HEAD", "OPTIONS"]
  response_header = ["ETag", "Content-Length", "Accept-Ranges", "Range"]
}

You can also have your own server to host files, but be aware that it has to support both range requests and CORS, which can be quite complicated to set up. So we recommend hosting your bag files in a cloud provider like S3 or GCS.

`;

// A file reader that reads from a remote HTTP URL, for usage in the browser (not for node.js).
export default class BrowserHttpReader implements FileReader {
  _url: string;

  constructor(url: string) {
    this._url = url;
  }

  async open() {
    let response;
    try {
      // Make a GET request and then immediately cancel it. This is more robust than a HEAD request,
      // since the server might not accept HEAD requests (e.g. when using S3 presigned URLs that
      // only work for one particular method like GET).
      // Note that we cannot use `range: "bytes=0-1"` or so, because then we can't get the actual
      // file size without making Content-Range a CORS header, therefore making all this a bit less
      // robust.
      const controller = new AbortController();
      response = await fetch(this._url, { signal: controller.signal });
      controller.abort();
    } catch (error) {
      throw new Error(`Fetching remote file failed. ${corsError} ${error}`);
    }
    if (!response || !response.ok) {
      throw new Error(`Fetching remote file failed. ${corsError} Status code: ${response.status}.`);
    }
    if (response.headers.get("accept-ranges") !== "bytes") {
      throw new Error(`Remote file does not support HTTP Range Requests. ${corsError}`);
    }
    const size = response.headers.get("content-length");
    if (!size) {
      throw new Error(`Remote file is missing file size. ${corsError}`);
    }
    return { size: parseInt(size), identifier: response.headers.get("etag") || response.headers.get("last-modified") };
  }

  fetch(offset: number, length: number): FileStream {
    const headers = new Headers({ range: `bytes=${offset}-${offset + (length - 1)}` });
    // $FlowFixMe - Flow doesn't understand that this *does* have the right type.
    return new FetchReader(this._url, { headers });
  }

  recordBytesPerSecond(bytesPerSecond: number): void {}
}
