// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.
import AppsIcon from "@mdi/svg/svg/apps.svg";
import BorderAllIcon from "@mdi/svg/svg/border-all.svg";
import FlagVariantIcon from "@mdi/svg/svg/flag-variant.svg";
import JsonIcon from "@mdi/svg/svg/json.svg";
import ScriptTextOutlineIcon from "@mdi/svg/svg/script-text-outline.svg";
import React, { useState } from "react";

import ChildToggle from "webviz-core/src/components/ChildToggle";
import { ExperimentalFeaturesModal } from "webviz-core/src/components/ExperimentalFeatures";
import Flex from "webviz-core/src/components/Flex";
import Icon from "webviz-core/src/components/Icon";
import { openLayoutModal } from "webviz-core/src/components/LayoutModal";
import Menu, { Item } from "webviz-core/src/components/Menu";
import renderToBody from "webviz-core/src/components/renderToBody";
import { ClearBagCacheMenuItem } from "webviz-core/src/util/indexeddb/clearIndexedDb";

type Props = {
  redoLayoutChange: () => void,
  redoStateCount: number,
  undoLayoutChange: () => void,
  undoStateCount: number,
  selectAllPanels: () => void,
};

export default function LayoutMenu({
  redoLayoutChange,
  redoStateCount,
  undoLayoutChange,
  undoStateCount,
  selectAllPanels,
}: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const redoDisabled = redoStateCount === 0;
  const undoDisabled = undoStateCount === 0;

  const mac = navigator.userAgent.includes("Mac OS");
  const cmd = mac ? "⌘" : "ctrl+";
  const shift = mac ? "⇧" : "shift+";

  return (
    <ChildToggle position="below" onToggle={() => setIsOpen(!isOpen)} isOpen={isOpen}>
      <Flex>
        <Icon small fade active={isOpen} tooltip="Config">
          <AppsIcon />
        </Icon>
      </Flex>
      <Menu>
        <Item
          icon={<JsonIcon />}
          onClick={() => {
            setIsOpen(false);
            openLayoutModal();
          }}>
          Import/export layout
        </Item>
        <Item icon={<BorderAllIcon />} onClick={selectAllPanels}>
          Select all panels
        </Item>
        <Item icon="⟲" tooltip={`Undo (${cmd}Z)`} onClick={undoLayoutChange} disabled={undoDisabled}>
          Undo change
          <small>{` (${undoStateCount})`}</small>
        </Item>
        <Item icon="⟳" tooltip={`Redo (${cmd}${shift}Z)`} onClick={redoLayoutChange} disabled={redoDisabled}>
          Redo change
          <small>{` (${redoStateCount})`}</small>
        </Item>
        <Item
          icon={<FlagVariantIcon />}
          onClick={() => {
            setIsOpen(false);
            const modal = renderToBody(<ExperimentalFeaturesModal onRequestClose={() => modal.remove()} />);
          }}>
          Experimental Features
        </Item>
        <ClearBagCacheMenuItem />
        <hr />
        <Item
          icon={<ScriptTextOutlineIcon />}
          onClick={() => window.open("https://github.com/cruise-automation/webviz/blob/master/LICENSE", "_blank")}>
          License
        </Item>
      </Menu>
    </ChildToggle>
  );
}
