// @flow
//
//  Copyright (c) 2019-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import DatabaseIcon from "@mdi/svg/svg/database.svg";
import * as React from "react";
import styled from "styled-components";

import ChildToggle from "webviz-core/src/components/ChildToggle";
import Icon from "webviz-core/src/components/Icon";
import { useMessagePipeline } from "webviz-core/src/components/MessagePipeline";
import SpinningLoadingIcon from "webviz-core/src/components/SpinningLoadingIcon";
import { colors } from "webviz-core/src/util/sharedStyleConstants";
import { showHelpModalOpenSource } from "webviz-core/src/util/showHelpModalOpenSource";

const SConnectionPicker = styled.div`
  padding: 1em;
  background: ${colors.GRAY2};
  pointer-events: auto;
  border-radius: 4px;
  line-height: 1.4;
`;

export function TinyConnectionPicker({
  inputDescription,
  defaultIsOpen = false,
}: {|
  inputDescription: React.Node,
  defaultIsOpen?: boolean,
|}) {
  const showSpinner = useMessagePipeline(React.useCallback(({ playerState }) => playerState.showSpinner, []));
  const [isOpen, setIsOpen] = React.useState<boolean>(defaultIsOpen);

  const onToggle = React.useCallback(() => setIsOpen((open) => !open), []);

  return (
    <ChildToggle
      position="below"
      isOpen={isOpen}
      onToggle={onToggle}
      dataTest="open-connection-picker"
      style={{ height: 18 }}>
      <Icon tooltip="Sources" small fade active={isOpen}>
        {showSpinner ? <SpinningLoadingIcon /> : <DatabaseIcon />}
      </Icon>
      <SConnectionPicker>
        {inputDescription}
        <div style={{ marginTop: "1em", whiteSpace: "nowrap" }}>
          To connect different sources, see the{" "}
          <a href="#" onClick={showHelpModalOpenSource}>
            help page
          </a>
          .
        </div>
      </SConnectionPicker>
    </ChildToggle>
  );
}
