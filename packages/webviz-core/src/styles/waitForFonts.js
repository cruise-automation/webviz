// @flow
//
//  Copyright (c) 2018-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

// Workaround for code using measureText during initial render. Even if the font data is available
// immediately (because we use a data: url), Chrome doesn't parse/load it until it's "used" on the
// page, which we can trigger by adding a dummy element with some text.
//
// Without waiting, initial measureText calls have the wrong result, and the font sometimes doesn't
// appear in screenshot tests.

export default function waitForFonts(callback: () => void) {
  // $FlowFixMe - doesn't understand document.fonts.
  Promise.all([document.fonts.load("10pt 'Inter UI'"), document.fonts.load("10pt 'Roboto Mono'")]).then(() => {
    callback();
  });
}
