// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import ChevronDownIcon from "@mdi/svg/svg/chevron-down.svg";
import ChevronUpIcon from "@mdi/svg/svg/chevron-up.svg";
import React from "react";
import styled from "styled-components";

import Item from "./Item";
import Icon from "webviz-core/src/components/Icon";

const STitleWrapper = styled.div`
  line-height: 15px;
  flex: 1 1 auto;
`;

type Props = {|
  title: React$Node,
  icon?: ?React$Node,
  isOpen: boolean,
  setIsOpen: (boolean) => void,
  children: React$Node[],
  disableOpenClose: ?boolean,
  dataTest?: string,
|};

export default function ExpandableMenu({
  title,
  children,
  icon,
  isOpen,
  setIsOpen,
  disableOpenClose,
  dataTest,
}: Props) {
  const rootItem = (
    <Item
      icon={icon}
      dataTest={dataTest}
      style={{ height: 28 }}
      onClick={() => {
        if (!disableOpenClose) {
          setIsOpen(!isOpen);
        }
      }}>
      <STitleWrapper>{title}</STitleWrapper>
      {disableOpenClose ? null : <Icon small>{isOpen ? <ChevronUpIcon /> : <ChevronDownIcon />}</Icon>}
    </Item>
  );

  if (!isOpen) {
    return rootItem;
  }

  return (
    <>
      {rootItem}
      {children}
    </>
  );
}
