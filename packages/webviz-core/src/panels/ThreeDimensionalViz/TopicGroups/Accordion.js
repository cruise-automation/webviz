// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import ChevronRightIcon from "@mdi/svg/svg/chevron-right.svg";
import React, { type Node } from "react";
import styled from "styled-components";

import Icon from "webviz-core/src/components/Icon";

const SAccordion = styled.div`
  display: flex;
  flex-direction: column;
`;

export const SHeader = styled.div`
  display: flex;
  align-items: center;
`;
const SHeaderContent = styled.div`
  display: flex;
  flex-direction: row;
  align-items: center;
  cursor: pointer;
`;

const SBody = styled.div`
  overflow: hidden;
`;

type Props = {|
  active?: boolean,
  children: Node,
  dataTest?: string,
  headerContent?: Node,
  onToggle: () => void,
  renderHeader?: ({ active: boolean, onToggle: () => void }) => Node,
|};

export function ExpandIcon({
  active,
  dataTest,
  onToggle,
}: {
  active: boolean,
  dataTest: ?string,
  onToggle: () => void,
}) {
  return (
    <Icon {...(dataTest ? { dataTest } : undefined)} small fade onClick={onToggle}>
      <ChevronRightIcon style={{ transform: active ? "rotate(90deg)" : "none", transition: "transform 0.4s ease" }} />
    </Icon>
  );
}

export default function Accordion({
  dataTest,
  onToggle,
  active = false,
  renderHeader,
  headerContent,
  children,
}: Props) {
  return (
    <SAccordion>
      <SHeader>
        {!renderHeader && (
          <SHeaderContent onClick={onToggle}>
            <ExpandIcon dataTest={dataTest} active={active} onToggle={onToggle} />
            {headerContent}
          </SHeaderContent>
        )}
      </SHeader>
      {renderHeader && renderHeader({ active, onToggle })}
      <SBody>{active && children}</SBody>
    </SAccordion>
  );
}
