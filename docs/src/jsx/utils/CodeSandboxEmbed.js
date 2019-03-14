// @flow

//  Copyright (c) 2018-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import * as React from "react";

export default function CodeSandboxEmbed({ src }: { src: string }) {
  return (
    <iframe
      src={`${src}?autoresize=1&fontsize=14&hidenavigation=1&module=%2Fsrc%2FExample.js&view=preview`}
      style={{ width: "100%", height: 500, border: 0, borderRadius: 4, overflow: "hidden" }}
      sandbox="allow-modals allow-forms allow-popups allow-scripts allow-same-origin"
    />
  );
}
