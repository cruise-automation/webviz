// @flow
//
//  Copyright (c) 2018-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

export default {
  // Copy a string to the clipboard
  copy(text: string) {
    const { body } = document;
    if (!body) {
      return;
    }
    const el = document.createElement("textarea");
    body.appendChild(el);
    el.value = text;
    el.select();
    document.execCommand("copy");
    body.removeChild(el);
  },
};
