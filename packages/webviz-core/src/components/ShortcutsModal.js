// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import * as React from "react";
import styled from "styled-components";

import HelpModal from "webviz-core/src/components/HelpModal";
import KeyboardShortcut from "webviz-core/src/components/KeyboardShortcut";
import { RenderToBodyComponent } from "webviz-core/src/components/renderToBody";

const STitle = styled.h3`
  margin: 16px 0 8px 0;
`;

type Props = {|
  history: any,
|};

const COMMAND = "⌘";
const SHIFT = "⇧";

export default function ShortcutsModal({ history }: Props) {
  return (
    <RenderToBodyComponent>
      <HelpModal
        rootStyle={{ maxWidth: 480, minWidth: 320 }}
        onRequestClose={() => history.push(`/${window.location.search}`)}>
        <h2>Keyboard shortcuts</h2>
        <STitle>Global</STitle>
        <KeyboardShortcut description="Save layouts" keys={[COMMAND, "s"]} />
        <KeyboardShortcut description="Import/export layouts" keys={[COMMAND, "e"]} />
        <KeyboardShortcut description="Undo changes" keys={[COMMAND, "z"]} />
        <KeyboardShortcut description="Redo changes" keys={[COMMAND, SHIFT, "z"]} />
        <KeyboardShortcut description="Open a file" keys={[COMMAND, "o"]} />
        <KeyboardShortcut description="Add a second bag" keys={[COMMAND, SHIFT, "o"]} />
        <KeyboardShortcut description="Select all panels" keys={[COMMAND, "a"]} />
        <KeyboardShortcut description="Show help and resources" keys={[SHIFT, "/"]} />
        <KeyboardShortcut description="Show shortcuts" keys={[COMMAND, "/"]} />
        <KeyboardShortcut description="Pause or play" keys={["Space"]} />
        <KeyboardShortcut description="Seek forward 100ms" keys={["⇢"]} />
        <KeyboardShortcut description="Seek backward 100ms" keys={["⇠"]} />

        <STitle>Panel</STitle>
        <KeyboardShortcut description="Hovering over a panel to view panel shortcut" keys={["~"]} />
        <KeyboardShortcut description="Hold to lock panel in full screen" keys={["~", SHIFT]} />
      </HelpModal>
    </RenderToBodyComponent>
  );
}
