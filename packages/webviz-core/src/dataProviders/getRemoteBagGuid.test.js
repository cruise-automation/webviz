// @flow
//
//  Copyright (c) 2019-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.
import fetchMock from "fetch-mock";

import { getRemoteBagGuid } from "./getRemoteBagGuid";

describe("getRemoteBagGuid", () => {
  it("uses the ETag from the remote url", async () => {
    fetchMock.get("http://example.org/bag", {
      headers: { "accept-ranges": "bytes", "content-length": 1234, etag: "my-etag" },
    });
    expect(await getRemoteBagGuid("http://example.org/bag")).toEqual("http://example.org/bag---my-etag");
    fetchMock.restore();
  });
});
