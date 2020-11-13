// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import LinkVariantOffIcon from "@mdi/svg/svg/link-variant-off.svg";
import LinkVariantIcon from "@mdi/svg/svg/link-variant.svg";
import React, { useState, useCallback, type Node } from "react";
import styled from "styled-components";

import { type LinkedGlobalVariable } from "../useLinkedGlobalVariables";
import { GlobalVariableName } from "./index";
import ChildToggle from "webviz-core/src/components/ChildToggle";
import Icon from "webviz-core/src/components/Icon";

const SIconWrapper = styled.span`
  .icon {
    /* TODO(Audrey): remove the hard-coded icon style once we clean up 3D panel styles   */
    width: 15px !important;
    height: 15px !important;
    font-size: 15px !important;
  }
  .linked-icon {
    opacity: 1;
    display: inline-block;
  }
  .link-off-icon {
    opacity: 0;
    display: none;
  }
  &:hover {
    .linked-icon {
      opacity: 0;
      display: none;
    }
    .link-off-icon {
      opacity: 1;
      display: inline-block;
    }
  }
`;

type Props = {
  linkedGlobalVariable: LinkedGlobalVariable,
  style?: any,
  children: ({
    setIsOpen: (boolean) => void,
    linkedGlobalVariable: LinkedGlobalVariable,
  }) => Node,
  tooltip?: Node,
};

export default function UnlinkWrapper({ children, linkedGlobalVariable, tooltip }: Props) {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const onToggle = useCallback(() => setIsOpen((open) => !open), []);
  return (
    <>
      <ChildToggle
        dataTest={`unlink-${linkedGlobalVariable.name}`}
        position="above"
        onToggle={onToggle}
        isOpen={isOpen}>
        <SIconWrapper>
          <Icon
            fade
            tooltipProps={{
              contents: tooltip || (
                <span>
                  Unlink this field from <GlobalVariableName name={linkedGlobalVariable.name} />
                </span>
              ),
            }}>
            <LinkVariantOffIcon className="link-off-icon" />
            <LinkVariantIcon className="linked-icon" />
          </Icon>
        </SIconWrapper>
        <span>{children({ setIsOpen, linkedGlobalVariable })}</span>
      </ChildToggle>
      <GlobalVariableName name={linkedGlobalVariable.name} leftPadding />
    </>
  );
}
