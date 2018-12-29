// @flow
//
//  Copyright (c) 2018-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { action } from "@storybook/addon-actions";
import { storiesOf } from "@storybook/react";
import React from "react";

import Modal from "webviz-core/src/components/Modal";
import TextContent from "webviz-core/src/components/TextContent";

storiesOf("<Modal>", module).add("basic", () => (
  <Modal onRequestClose={() => action("close")}>
    <div style={{ padding: 20 }}>
      <TextContent>
        <a href="https://google.com" target="_blank" rel="noopener noreferrer">
          link
        </a>
        <div>this is a floating, fixed position modal</div>
        <div>you can press escape or click outside of the modal to fire the close action</div>
      </TextContent>
    </div>
  </Modal>
));
