// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import React from "react";
import styled from "styled-components";

import { colors, textSize, rounded } from "webviz-core/src/util/sharedStyleConstants";

const SKeyboardShortcut = styled.div`
  padding: 4px 0;
  max-width: 400px;
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const SDescription = styled.div`
  margin-right: 16px;
  max-width: 320px;
`;

const SKeyWrapper = styled.div`
  display: inline-flex;
  flex: none;
  color: ${colors.GRAY};
  border: 1px solid ${colors.DARK9};
  border-radius: ${rounded.SMALL};
  font-size: ${textSize.SMALL};
  font-weight: 500;
  min-width: 20px;
  align-items: center;
  justify-content: center;
`;

const SKey = styled.kbd`
  color: ${colors.GRAY};
  padding: 0 3px;
  font-size: 12px;
  line-height: 1.5;
  :not(:last-child) {
    border-right: 1px solid ${colors.DARK9};
  }
`;

type Props = {
  keys: string[],
  description?: string,
  descriptionMaxWidth?: number,
};

export default function KeyboardShortcut({ keys, description, descriptionMaxWidth }: Props) {
  return (
    <SKeyboardShortcut>
      {description && (
        <SDescription style={descriptionMaxWidth ? { width: descriptionMaxWidth } : {}}>{description}</SDescription>
      )}
      <span>
        {keys.map((key, idx) => (
          <SKeyWrapper key={idx} style={idx < keys.length - 1 ? { marginRight: 4 } : {}}>
            <SKey>{key}</SKey>
          </SKeyWrapper>
        ))}
      </span>
    </SKeyboardShortcut>
  );
}
