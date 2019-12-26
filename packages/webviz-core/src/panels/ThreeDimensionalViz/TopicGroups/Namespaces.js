// @flow
//
//  Copyright (c) 2019-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import React from "react";
import styled from "styled-components";

import DataSourceBadge from "./DataSourceBadge";
import type { NamespaceItem } from "./types";

const SNamespacesBySource = styled.div`
  padding-top: 8px;
`;

const SNamespaceItem = styled.div`
  margin-bottom: 4px;
  display: flex;
  justify-content: space-between;
`;

const SName = styled.div`
  font-size: 12px;
`;

type Props = {|
  topicName: string,
  namespaceItems: NamespaceItem[],
|};

export default function Namespaces({ topicName, namespaceItems }: Props) {
  return (
    <SNamespacesBySource>
      {namespaceItems.map(({ name, displayVisibilityBySource }) => (
        <SNamespaceItem key={name}>
          <SName>{name}</SName>
          <span>
            {Object.keys(displayVisibilityBySource).map((key) => (
              <DataSourceBadge key={key} {...displayVisibilityBySource[key]} isNamespace />
            ))}
          </span>
        </SNamespaceItem>
      ))}
    </SNamespacesBySource>
  );
}
