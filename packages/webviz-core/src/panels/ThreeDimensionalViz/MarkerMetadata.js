// @flow
//
//  Copyright (c) 2018-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.
import * as React from "react";
import JSONTree from "react-json-tree";
import styled from "styled-components";

import colors from "webviz-core/src/styles/colors.module.scss";
import type { BaseMarker } from "webviz-core/src/types/Messages";

const MarkerWrapper = styled.div`
  position: absolute;
  background-color: rgb(22, 17, 35);
  border: 1px solid rgba(255, 255, 255, 0.77);
  bottom: 15px;
  right: 15px;
  padding: 15px;
  border-radius: 4px;
  overflow: auto;
  max-width: 50%;
  max-height: 50%;
`;

type Props = {
  marker: BaseMarker,
};
function MarkerMetadata({ marker }: Props) {
  if (!marker || !marker.customMetadata) {
    return null;
  }
  return (
    <MarkerWrapper>
      <JSONTree
        data={marker.customMetadata}
        hideRoot
        theme={{ base00: colors.panelBackground, tree: { margin: 0 } }}
        invertTheme={false}
      />
    </MarkerWrapper>
  );
}

export default MarkerMetadata;
