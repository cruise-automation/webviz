// @flow
//
//  Copyright (c) 2021-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { storiesOf } from "@storybook/react";
import * as React from "react";

import { CropSelectionOverlayProvider } from "./CropSelectionOverlay";

storiesOf("<CropSelectionOverlay>", module).add("default", () => (
  <CropSelectionOverlayProvider initialShowSelection={true}>
    <div
      style={{
        width: 600,
        height: 400,
        background: "linear-gradient(90deg, rgba(131,58,180,1) 0%, rgba(253,29,29,1) 50%, rgba(252,176,69,1) 100%)",
      }}>
      Content
    </div>
  </CropSelectionOverlayProvider>
));
