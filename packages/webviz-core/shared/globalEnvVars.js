// @flow
//
//  Copyright (c) 2020-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

module.exports = {
  inIntegrationTestServer: Boolean(process.env.IN_INTEGRATION_TEST_SERVER),
  showTestOutput: Boolean(process.env.SHOW_TEST_OUTPUT),
  tempVideosDirectory:
    process.env.TEMP_VIDEOS_DIRECTORY ||
    require("child_process")
      .execSync("git rev-parse --show-toplevel") // repo root
      .toString()
      .trim(),
};
