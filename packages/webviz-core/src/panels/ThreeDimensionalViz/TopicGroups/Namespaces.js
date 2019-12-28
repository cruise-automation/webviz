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
import { colors } from "webviz-core/src/util/colors";

const SNamespacesBySource = styled.div`
  margin-bottom: 8px;
`;

const SNamespaceItem = styled.div`
  padding: 2px 8px 2px 50px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  transition: 0.3s;
  &:hover {
    background-color: ${colors.HOVER_BACKGROUND_COLOR};
  }
`;

const SName = styled.div`
  font-size: 12px;
  color: ${colors.LIGHT2};
`;

type Props = {|
  namespaceItems: NamespaceItem[],
  onToggleNamespace: ({| visible: boolean, dataSourcePrefix: string, namespace: string |}) => void,
  topicName: string,
|};

export default function Namespaces({ onToggleNamespace, topicName, namespaceItems }: Props) {
  return (
    <SNamespacesBySource>
      {namespaceItems.map(({ name, displayVisibilityBySource }) => (
        <SNamespaceItem key={name}>
          <SName>{name}</SName>
          <span>
            {Object.keys(displayVisibilityBySource).map((dataSourcePrefix) => {
              const { visible, available, badgeText, isParentVisible } = displayVisibilityBySource[dataSourcePrefix];
              return (
                <DataSourceBadge
                  available={available}
                  badgeText={badgeText}
                  dataTest={`namespace-${dataSourcePrefix}${topicName}:${name}`}
                  isNamespace
                  isParentVisible={!!isParentVisible}
                  key={dataSourcePrefix}
                  visible={visible}
                  onToggleVisibility={() => {
                    onToggleNamespace({
                      visible: !visible,
                      dataSourcePrefix,
                      namespace: name,
                    });
                  }}
                />
              );
            })}
          </span>
        </SNamespaceItem>
      ))}
    </SNamespacesBySource>
  );
}
