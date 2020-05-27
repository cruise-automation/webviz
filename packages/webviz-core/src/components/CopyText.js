// @flow
//
//  Copyright (c) 2019-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.
import ClipboardOutlineIcon from "@mdi/svg/svg/clipboard-outline.svg";
import * as React from "react";
import styled from "styled-components";

import Icon from "webviz-core/src/components/Icon";
import clipboard from "webviz-core/src/util/clipboard";

const SCopyTextWrapper = styled.div`
  display: flex;
  align-items: center;
  cursor: pointer;
  .icon {
    visibility: hidden;
  }
  :hover {
    .icon {
      visibility: visible;
    }
  }
`;

type Props = {|
  copyText: string,
  tooltip: string,
  children: React.Node,
|};

function CopyText({ copyText, tooltip, children }: Props) {
  if (!copyText || !children) {
    return null;
  }
  return (
    <SCopyTextWrapper onClick={() => clipboard.copy(copyText)}>
      {children ? children : copyText}
      <Icon fade style={{ margin: "0 8px", verticalAlign: "middle" }} tooltip={tooltip}>
        <ClipboardOutlineIcon />
      </Icon>
    </SCopyTextWrapper>
  );
}

export default CopyText;
