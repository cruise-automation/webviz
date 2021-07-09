// @flow
//
//  Copyright (c) 2020-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

if (process.env.WEBVIZ_IN_DOCKER) {
  module.exports = {
    launch: {
      executablePath: "/usr/bin/google-chrome",
      headless: !process.env.DEBUG_CI,
      args: [
        "--use-gl=swiftshader",
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--headless",
        "--mute-audio",
        "--user-agent=PuppeteerTestingChrome/88.",
        "--disable-gpu", // In CI we don't have GPUs anyway, and on desktops this makes it more stable.
        // Cross-Origin-Opener-Policy disagrees with video-recording page control.
        "--disable-web-security",
        "--disable-features=IsolateOrigins",
        "--disable-site-isolation-trials",
      ],
    },
  };
} else {
  module.exports = { launch: { headless: !process.env.DEBUG_CI } };
}
