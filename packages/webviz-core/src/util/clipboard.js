// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

function fallbackCopy(text: string) {
  const { body } = document;
  if (!body) {
    throw new Error("Could not find body, failed to copy.");
  }
  const el = document.createElement("textarea");
  body.appendChild(el);
  el.value = text;
  el.select();
  document.execCommand("copy");
  body.removeChild(el);
}

export default {
  // Copy a string to the clipboard
  async copy(text: string): Promise<void> {
    // attempt to use the new async clipboard methods. If those are not available or fail, fallback to the old
    // `execCommand` method.
    if (navigator && navigator.clipboard && navigator.clipboard.writeText) {
      try {
        return navigator.clipboard.writeText(text);
      } catch (error) {
        fallbackCopy(text);
      }
    } else {
      fallbackCopy(text);
    }
  },
};
