// @flow
//
//  Copyright (c) 2020-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.
import fs from "fs";
import rmfr from "rmfr";
import uuid from "uuid";

import globalEnvVars from "./globalEnvVars";

export function makeTempDirectory() {
  const tmpDir = `${globalEnvVars.tempVideosDirectory}/__video-recording-tmp-${uuid.v4()}__`;
  fs.mkdirSync(tmpDir);
  return tmpDir;
}

// Executes the function passing in a new temp directory that will be automatically cleaned up afterwards.
export async function withTempDirectory<T>(fn: (*) => Promise<T>): Promise<T> {
  const tmpDir = makeTempDirectory();
  try {
    return await fn(tmpDir);
  } catch (error) {
    throw error;
  } finally {
    rmfr(tmpDir);
  }
}
