// @flow
//
//  Copyright (c) 2019-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.
import ClipboardOutlineIcon from "@mdi/svg/svg/clipboard-outline.svg";
import { cloneDeepWith } from "lodash";
import React, { useCallback } from "react";
import styled from "styled-components";

import Icon from "webviz-core/src/components/Icon";
import { type MessageHistoryItem } from "webviz-core/src/components/MessageHistory";
import clipboard from "webviz-core/src/util/clipboard";
import { format } from "webviz-core/src/util/time";

export const SMetadata = styled.div`
  margin-top: 4px;
  font-size: 11px;
  color: #aaa;
`;
type Props = { data: any, link: ?string, item: MessageHistoryItem };

export default function Metadata({ data, link, item }: Props) {
  const onClick = useCallback(
    (e: SyntheticMouseEvent<HTMLSpanElement>) => {
      e.stopPropagation();
      e.preventDefault();
      const dataWithoutLargeArrays = cloneDeepWith(data, (value) => {
        if (typeof value === "object" && value.buffer) {
          return "<buffer>";
        }
      });
      clipboard.copy(JSON.stringify(dataWithoutLargeArrays, null, 2) || "");
    },
    [data]
  );
  return (
    <SMetadata>
      <span onClick={onClick}>
        <Icon>
          <ClipboardOutlineIcon style={{ verticalAlign: "middle" }} />{" "}
        </Icon>
      </span>
      {link ? (
        <a style={{ color: "inherit" }} target="_blank" rel="noopener noreferrer" href={link}>
          {item.message.datatype}
        </a>
      ) : (
        item.message.datatype
      )}
      {item.message.receiveTime && ` received at ${format(item.message.receiveTime)}`}
    </SMetadata>
  );
}
