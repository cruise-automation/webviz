// @flow
//
//  Copyright (c) 2019-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import yaml from "js-yaml/dist/js-yaml";

export default {
  parse<T>(str: string): T {
    return yaml.safeLoad(str);
  },
  stringify(obj: any, options: any = {}): string {
    // do not quote 'y' and 'yes' for older yaml versions
    return yaml
      .safeDump(obj, { noCompatMode: true, ...options })
      .replace(/^- - /gm, "\n- - ")
      .trim();
  },
};
