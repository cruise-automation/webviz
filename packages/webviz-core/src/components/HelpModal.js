// @flow
//
//  Copyright (c) 2018-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import * as React from "react";
import styled from "styled-components";

import Modal from "webviz-core/src/components/Modal";
import TextContent from "webviz-core/src/components/TextContent";
import { getGlobalHooks } from "webviz-core/src/loadWebviz";

const SRoot = styled.div`
  max-width: 650px; // Px value because beyond a certain absolute width the lines become harder to read.
  width: calc(100vw - 30px);
  max-height: calc(100vh - 30px);
  overflow-y: auto;
  padding: 1.5em;
`;

const SFootnote = styled.div`
  opacity: 0.8;
  margin: 1em 0 0;
  font-size: 1.1rem;
`;

type Props = {|
  children: React.Node | string,
  linkTarget?: string,
  onRequestClose: () => void,
|};

function Footnote() {
  const footnote = getGlobalHooks().helpPageFootnote();
  if (!footnote) {
    return null;
  }
  return <SFootnote>{footnote}</SFootnote>;
}

export default function HelpModal(props: Props) {
  return (
    <Modal onRequestClose={props.onRequestClose}>
      <SRoot>
        <TextContent linkTarget={props.linkTarget}>{props.children}</TextContent>
        <Footnote />
      </SRoot>
    </Modal>
  );
}
