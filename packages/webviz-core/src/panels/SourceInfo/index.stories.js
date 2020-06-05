// @flow
//
//  Copyright (c) 2019-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { storiesOf } from "@storybook/react";
import * as React from "react";
import { withScreenshot } from "storycap";
import styled from "styled-components";

import bagFile from "./fixtures/example.bag";
import SourceInfo from "./index";
import PanelSetupWithBag from "webviz-core/src/stories/PanelSetupWithBag";

const SNarrow = styled.div`
  width: 200px;
  height: 100%;
`;

function PanelWithData() {
  return (
    <PanelSetupWithBag
      bagFileUrl={bagFile}
      topics={["/turtle1/pose", "/turtle2/pose", "/turtle1/cmd_vel", "/turtle2/cmd_vel"]}>
      <SourceInfo />
    </PanelSetupWithBag>
  );
}

storiesOf("<SourceInfo>", module)
  .addDecorator(withScreenshot({ delay: 750 }))
  .add("default", () => {
    return <PanelWithData />;
  })
  .add("narrow panel", () => {
    // Ensure there is no overlapping text/unfortunate line breaks when the
    // panel doesn't have much horizontal space
    return (
      <SNarrow>
        <PanelWithData />
      </SNarrow>
    );
  });
