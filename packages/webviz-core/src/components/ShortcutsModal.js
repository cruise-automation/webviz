// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { flatten } from "lodash";
import React, { useState, useEffect } from "react";
import styled from "styled-components";

import HelpModal from "webviz-core/src/components/HelpModal";
import KeyboardShortcut from "webviz-core/src/components/KeyboardShortcut";
import {
  ARROW_SEEK_BIG_MS,
  ARROW_SEEK_DEFAULT_MS,
  ARROW_SEEK_SMALL_MS,
  ARROW_SEEK_TINY_MS,
} from "webviz-core/src/components/PlaybackControls/sharedHelpers";
import { RenderToBodyPortal } from "webviz-core/src/components/renderToBody";
import { getGlobalHooks } from "webviz-core/src/loadWebviz";
import { type PanelListItem } from "webviz-core/src/panels/PanelList/index";

const STitle = styled.h3`
  margin: 16px 0 8px 0;
`;

type Props = {|
  history: any,
|};

const EXISTING_CONFIG = [
  {
    title: "Global",
    shortcuts: [
      { description: "Open layout menu", keys: ["l"] },
      { description: "Save layouts", keys: ["⌘", "s"] },
      { description: "Import/export layouts", keys: ["⌘", "e"] },
      { description: "Undo changes", keys: ["⌘", "z"] },
      { description: "Redo changes", keys: ["⌘", "⇧", "z"] },
      { description: "Open a file", keys: ["⌘", "o"] },
      { description: "Add a second bag", keys: ["⌘", "⇧", "o"] },
      { description: "Select all panels", keys: ["⌘", "a"] },
      { description: "Show help and resources", keys: ["⇧", "/"] },
      { description: "Show shortcuts", keys: ["⌘", "/"] },
      { description: "Pause or play", keys: ["Space"] },
      { description: `Seek forward ${ARROW_SEEK_DEFAULT_MS}ms`, keys: ["⇢"] },
      { description: `Seek forward ${ARROW_SEEK_SMALL_MS}ms`, keys: ["⇧", "⇢"] },
      { description: `Seek forward ${ARROW_SEEK_TINY_MS}ms`, keys: ["⌘", "⇢"] },
      { description: `Seek forward ${ARROW_SEEK_BIG_MS}ms`, keys: ["⌥", "⇢"] },
      { description: `Seek backward ${ARROW_SEEK_DEFAULT_MS}ms`, keys: ["⇠"] },
      { description: `Seek backward ${ARROW_SEEK_SMALL_MS}ms`, keys: ["⇧", "⇠"] },
      { description: `Seek backward ${ARROW_SEEK_TINY_MS}ms`, keys: ["⌘", "⇠"] },
      { description: `Seek backward ${ARROW_SEEK_BIG_MS}ms`, keys: ["⌥", "⇠"] },
    ],
  },
  {
    title: "Panel",
    shortcuts: [
      { description: "Hold while hovering over a panel to view panel shortcuts", keys: ["~"] },
      { description: "Hold to lock panel in full screen", keys: ["~", "⇧"] },
    ],
  },
];
export type ShortcutConfig = {| description: string, keys: string[] |};
type PerPanelShortcuts = {| title: string, shortcuts: ShortcutConfig[] |};

export default function ShortcutsModal({ history }: Props) {
  const [perPanelShortcuts, setPerPanelShortcuts] = useState<PerPanelShortcuts[]>(EXISTING_CONFIG);
  useEffect(() => {
    getGlobalHooks()
      .importHooksAsync()
      .then(() => {
        const panelsByCategory = getGlobalHooks().panelsByCategory();

        const allPanels = ((flatten(Object.values(panelsByCategory)): any): PanelListItem<any>[]).filter(Boolean);
        const shortcutsConfig: PerPanelShortcuts[] = allPanels
          .map(({ title, component }) => {
            const shortcuts = ((component.shortcuts: any): ShortcutConfig[]);
            return shortcuts ? { title, shortcuts } : undefined;
          })
          .filter(Boolean);
        return setPerPanelShortcuts([...EXISTING_CONFIG, ...shortcutsConfig]);
      });
  }, []);

  return (
    <RenderToBodyPortal>
      <HelpModal
        rootStyle={{ maxWidth: 480, minWidth: 320 }}
        onRequestClose={() => history.push(`/${window.location.search}`)}>
        <h2>Keyboard shortcuts</h2>
        {perPanelShortcuts.map(({ title, shortcuts }) => (
          <React.Fragment key={title}>
            <STitle>{title}</STitle>
            {shortcuts.map(({ description, keys }) => (
              <React.Fragment key={description}>
                <KeyboardShortcut description={description} keys={keys} />
              </React.Fragment>
            ))}
          </React.Fragment>
        ))}
      </HelpModal>
    </RenderToBodyPortal>
  );
}
