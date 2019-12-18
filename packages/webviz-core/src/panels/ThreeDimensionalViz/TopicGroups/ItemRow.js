// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import React from "react";
import styled from "styled-components";

import { ITEM_TYPES } from "./constants";
import ItemMap from "./ItemMap";
import ItemTf from "./ItemTf";
import ItemTopic from "./ItemTopic";
import type { TopicRowItem } from "./types";
import { colors } from "webviz-core/src/util/colors";

const SItemRow = styled.div`
  padding: 8px;
  &:hover {
    cursor: pointer;
    background-color: ${colors.HOVER_BACKGROUND_COLOR};
  }
`;

export const SDisplayName = styled.div`
  color: ${colors.LIGHT};
  font-size: 14px;
  margin-bottom: 4px;
`;

export const SName = styled.div`
  color: ${colors.LIGHT2};
  font-size: 10px;
`;

type Props = {
  item: TopicRowItem,
};

export default function ItemRow({ item }: Props) {
  return (
    <SItemRow>
      {item.type === ITEM_TYPES.TOPIC && <ItemTopic {...item} />}
      {item.type === ITEM_TYPES.MAP && <ItemMap {...item} />}
      {item.type === ITEM_TYPES.TF && <ItemTf {...item} />}
    </SItemRow>
  );
}
