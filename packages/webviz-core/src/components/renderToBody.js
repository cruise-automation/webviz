// @flow
//
//  Copyright (c) 2018-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import * as React from "react";
import { render, unmountComponentAtNode } from "react-dom";

export default function renderToBody(element: React.Element<*>) {
  const container = document.createElement("div");
  container.dataset.modalcontainer = "true";
  if (!document.body) {
    throw new Error("document.body not found"); // appease flow
  }
  document.body.appendChild(container);

  render(element, container);

  return {
    remove() {
      unmountComponentAtNode(container);
      if (!document.body) {
        throw new Error("document.body not found"); // appease flow
      }
      document.body.removeChild(container);
    },
  };
}
