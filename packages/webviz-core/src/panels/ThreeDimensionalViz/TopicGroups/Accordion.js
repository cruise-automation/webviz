// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import ChevronRightIcon from "@mdi/svg/svg/chevron-right.svg";
import React, { type Node, useState, useRef, useLayoutEffect } from "react";
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
  transition: max-height 0.4s ease;
`;

type Props = {|
  defaultActive?: boolean,
  headerContent?: Node,
  dataTest?: string,
  renderHeader?: ({ active: boolean, onToggle: () => void }) => Node,
  children: Node,
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

export default function Accordion({ dataTest, defaultActive, renderHeader, headerContent, children }: Props) {
  const [active, setActive] = useState<boolean>(!!defaultActive);
  const [bodyHeight, setBodyHeight] = useState<number>(0);
  const bodyRef = useRef<?HTMLDivElement>(undefined);

  // Render the body content first and compute the new height.
  // To make animation for nested accordion work, we add 1000px extra to maxHeight so that when children accordion is expanded,
  // the parent accordion can hold the expanded children (since the active state for the parent doesn't change when children
  // accordion changes, the bodyHeight won't change).
  useLayoutEffect(() => setBodyHeight(active ? (bodyRef.current?.scrollHeight || 0) + 1000 : 0), [active]);

  function onToggle() {
    setActive(!active);
  }

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
      <SBody ref={bodyRef} style={{ maxHeight: bodyHeight }}>
        {active && children}
      </SBody>
    </SAccordion>
  );
}
