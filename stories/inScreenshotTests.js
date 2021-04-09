//  Copyright (c) 2018-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

export default function inScreenshotTests() {
  // Integration tests and screenshot tests are not always in a headless Chrome, so need to check for a custom user
  // agent.
  return navigator.userAgent.includes("PuppeteerTestingChrome");
}
