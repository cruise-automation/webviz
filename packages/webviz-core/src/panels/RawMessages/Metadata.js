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
import type { Message } from "webviz-core/src/players/types";
import clipboard from "webviz-core/src/util/clipboard";
import { formatTimeRaw } from "webviz-core/src/util/time";

const SMetadata = styled.div`
  margin-top: 4px;
  font-size: 11px;
  line-height: 1.3;
  color: #aaa;
`;
type Props = {
  data: any,
  diffData: any,
  diff: any,
  link: ?string,
  message: Message,
  diffMessage: ?Message,
};

function CopyMessageButton({ text, onClick }) {
  return (
    <a onClick={onClick} href="#" style={{ textDecoration: "none" }}>
      <Icon tooltip="Copy entire message to clipboard" style={{ position: "relative", top: -1 }}>
        <ClipboardOutlineIcon style={{ verticalAlign: "middle" }} />
      </Icon>{" "}
      {text}
    </a>
  );
}

export default function Metadata({ data, diffData, diff, link, message, diffMessage }: Props) {
  const onClickCopy = useCallback(
    (dataToCopy) => (e: SyntheticMouseEvent<HTMLSpanElement>) => {
      e.stopPropagation();
      e.preventDefault();
      const dataWithoutLargeArrays = cloneDeepWith(dataToCopy, (value) => {
        if (typeof value === "object" && value.buffer) {
          return "<buffer>";
        }
      });
      clipboard.copy(JSON.stringify(dataWithoutLargeArrays, null, 2) || "");
    },
    []
  );
  return (
    <SMetadata>
      {!diffMessage &&
        (link ? (
          <a style={{ color: "inherit" }} target="_blank" rel="noopener noreferrer" href={link}>
            {message.datatype}
          </a>
        ) : (
          message.datatype
        ))}
      {message.receiveTime && `${diffMessage ? " base" : ""} @ ${formatTimeRaw(message.receiveTime)} ROS `}
      <CopyMessageButton onClick={onClickCopy(data)} text="Copy msg" />

      {diffMessage && diffMessage.receiveTime && (
        <>
          <div>
            {`diff @ ${formatTimeRaw(diffMessage.receiveTime)} ROS `}
            <CopyMessageButton onClick={onClickCopy(diffData)} text="Copy msg" />
          </div>
          <CopyMessageButton onClick={onClickCopy(diff)} text="Copy diff of msgs" />
        </>
      )}
    </SMetadata>
  );
}
