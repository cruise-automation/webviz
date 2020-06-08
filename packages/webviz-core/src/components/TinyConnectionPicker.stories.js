// @flow
//
//  Copyright (c) 2019-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { storiesOf } from "@storybook/react";
import * as React from "react";

import { MockMessagePipelineProvider } from "webviz-core/src/components/MessagePipeline";
import { TinyConnectionPicker } from "webviz-core/src/components/TinyConnectionPicker";

storiesOf("<TinyConnectionPicker>", module).add("default", () => {
  return (
    <MockMessagePipelineProvider>
      <div style={{ padding: 8, textAlign: "right", width: "100%" }}>
        <TinyConnectionPicker
          defaultIsOpen
          inputDescription={
            <>
              Using local bag file <code>only-a-cube.bag</code>.
            </>
          }
        />
      </div>
    </MockMessagePipelineProvider>
  );
});
