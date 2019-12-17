// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import React, { useCallback } from "react";
import styled from "styled-components";

import TopicSelectorWrapper, { type TopicSelectorWrapperProps } from "./TopicSelectorWrapper";

const STopicsContainer = styled.div`
  position: absolute;
  top: 15px;
  left: 15px;
  bottom: 15px;
  z-index: 102;
  max-width: 60%;
`;

type Props = {|
  ...TopicSelectorWrapperProps,
|};

// TODO(Audrey): add TopicSetting from Layout here
function TopicSelector(props: Props) {
  const cancelClick = useCallback((e: SyntheticMouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  return (
    <STopicsContainer onClick={cancelClick}>
      <TopicSelectorWrapper {...props} />
    </STopicsContainer>
  );
}

export default React.memo<Props>(TopicSelector);
