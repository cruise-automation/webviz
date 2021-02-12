// @flow
//
//  Copyright (c) 2019-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

export const MISSING_CORS_ERROR_TITLE = "Often this is due to missing CORS headers on the requested URL";

export function corsError(url: string): string {
  return `${MISSING_CORS_ERROR_TITLE}: ${url}

First of all, be aware that redirects don't work with CORS. So you'll have to point to the resource directly. So ?remote-bag-url=https%3A%2F%2Fopen-source-webviz-ui.s3.amazonaws.com%2Fdemo.bag will work (note the URL encoded using "encodeURIComponent"), but pointing to a server that then redirects to a URL like that will NOT work.

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

You can also have your own server to host files, but be aware that it has to support both range requests and CORS, which can be quite complicated to set up. So we recommend hosting your bag files in a cloud provider like S3 or GCS. However, other people have made this work; see e.g. this comment on how to set up Flask: https://github.com/cruise-automation/webviz/issues/247#issuecomment-621175154

`;
}
