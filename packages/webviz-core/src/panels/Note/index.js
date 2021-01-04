// @flow
//
//  Copyright (c) 2019-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import React, { useCallback } from "react";
import { hot } from "react-hot-loader/root";
import styled from "styled-components";

import helpContent from "./index.help.md";
import Flex from "webviz-core/src/components/Flex";
import Panel from "webviz-core/src/components/Panel";
import PanelToolbar from "webviz-core/src/components/PanelToolbar";
import type { SaveConfig } from "webviz-core/src/types/panels";

const STextArea = styled.textarea`
  width: 100%;
  height: 100%;
  resize: none;
  border: none;
  margin: 0;
  padding: 4px 6px;
  &:focus {
    background: rgba(255, 255, 255, 0.1);
  }
`;

type Config = { noteText: string };
type Props = { config: Config, saveConfig: SaveConfig<Config> };
function Note({ config, saveConfig }: Props) {
  const onChangeText = useCallback((event: SyntheticInputEvent<HTMLTextAreaElement>) => {
    saveConfig({ noteText: event.target.value });
  }, [saveConfig]);

  return (
    <Flex col style={{ height: "100%" }}>
      <PanelToolbar helpContent={helpContent} floating />
      <STextArea placeholder="Enter note here" value={config.noteText} onChange={onChangeText} />
    </Flex>
  );
}
Note.panelType = "Note";
Note.defaultConfig = { noteText: "" };

export default hot(Panel<Config>(Note));
