// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.
import { storiesOf } from "@storybook/react";
import React from "react";
import { SDFGenerator } from "regl-worldview";
import { createGlobalStyle } from "styled-components";

import { ICON_CHAR_BY_TYPE } from "webviz-core/src/panels/ThreeDimensionalViz/constants";

// $FlowFixMe - Flow doesn't understand !!file-loader import syntax
import MaterialDesignIconsWoff from "!!file-loader!@mdi/font/fonts/materialdesignicons-webfont.woff";

const ALPHABET = (() => {
  const start = 32; // SPACE
  const end = 125; // "}"
  return new Array(end - start + 1).fill().map((_, i) => String.fromCodePoint(start + i));
})();

const GlobalStyle = createGlobalStyle`
  @font-face {
    font-family: "Material Design Icons";
    src: url("${MaterialDesignIconsWoff}") format("woff");
    font-weight: normal;
    font-style: normal;
  }
`;

storiesOf("<3DViz>/SDFGenerator", module)
  .addParameters({ screenshot: { delay: 2500 } })
  .add("default with icons", () => {
    const resolution = 40;
    const atlasConfigs = [
      {
        fontSize: resolution,
        fontFamily: "sans-serif",
        charSet: new Set(ALPHABET),
      },
      {
        fontSize: resolution,
        fontFamily: "Material Design Icons",
        charSet: new Set(Object.values(ICON_CHAR_BY_TYPE)),
      },
    ];

    return (
      <div style={{ margin: 16 }}>
        <GlobalStyle />
        <SDFGenerator atlasConfigs={atlasConfigs} />
      </div>
    );
  });
