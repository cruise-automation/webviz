// @flow

//  Copyright (c) 2018-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

// $FlowFixMe - useState is not yet in the flow definitions.
import { useEventListener } from "@cruise-automation/hooks";
import React, { useState } from "react";
import styled from "styled-components";

import { color } from "./theme";

const StyledNumber = styled.span`
  color: ${color.primary};
  border-bottom: 1px dotted currentColor;
  cursor: ${(props) => (props.vertical ? "ns-resize" : "ew-resize")};
  padding-left: 4px;
  padding-right: 4px;
`;

type Props = {|
  value: number,
  onChange: (number) => void,
  speed?: number,
  vertical?: boolean,
|};

export default function Scrubber({ value, onChange, speed = 1, vertical = false }: Props) {
  const [dragging, setDragging] = useState(false);
  const [start, setStart] = useState({
    value,
    position: { clientX: NaN, clientY: NaN },
  });

  useEventListener(
    window,
    "mousemove",
    dragging,
    (event: MouseEvent) => {
      const delta = vertical ? start.position.clientY - event.clientY : event.clientX - start.position.clientX;
      onChange(start.value + delta * speed);
    },
    []
  );
  useEventListener(
    window,
    "mouseup",
    dragging,
    (event: MouseEvent) => {
      setDragging(false);
    },
    []
  );

  return (
    <StyledNumber
      vertical={vertical}
      onMouseDown={(event) => {
        event.preventDefault();
        setDragging(true);
        setStart({
          value,
          position: { clientX: event.clientX, clientY: event.clientY },
        });
      }}>
      {value.toFixed(1)}
    </StyledNumber>
  );
}
