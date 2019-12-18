// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

export const KNOWN_LOG_LEVELS: Array<number> = [1, 2, 4, 8, 16];

// map a numeric level to a string
export default function LevelToString(level: number): string {
  switch (level) {
    case 1:
      return "DEBUG";
    case 2:
      return "INFO";
    case 4:
      return "WARN";
    case 8:
      return "ERROR";
    case 16:
      return "FATAL";
    default:
      return "?????";
  }
}
