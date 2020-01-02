// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { storiesOf } from "@storybook/react";
import React from "react";
import TestUtils from "react-dom/test-utils";
import { withScreenshot } from "storybook-chrome-screenshot";

import { importPanelLayout } from "webviz-core/src/actions/panels";
import ShareJsonModal from "webviz-core/src/components/ShareJsonModal";

const onLayoutChange = (layout: any, isFromUrl: boolean = false) => {
  importPanelLayout(layout, { isFromUrl });
};

storiesOf("<ShareJsonModal>", module)
  .addDecorator(withScreenshot())
  .add("standard", () => <ShareJsonModal onRequestClose={() => {}} value="" onChange={() => {}} noun="layout" />)
  .add("submitting invalid layout", () => (
    <div
      data-modalcontainer="true"
      ref={(el) => {
        if (el) {
          // $FlowFixMe
          const textarea: HTMLTextAreaElement = el.querySelector("textarea");
          textarea.value = "{";
          TestUtils.Simulate.change(textarea);
          setTimeout(() => {
            // $FlowFixMe
            el.querySelector(".test-apply").click();
          }, 10);
        }
      }}>
      <ShareJsonModal onRequestClose={() => {}} value={""} onChange={onLayoutChange} noun="layout" />
    </div>
  ));
