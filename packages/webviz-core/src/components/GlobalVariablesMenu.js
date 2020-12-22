// @flow
//
//  Copyright (c) 2020-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.
import EarthIcon from "@mdi/svg/svg/earth.svg";
import React, { useState, useCallback, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import styled, { css } from "styled-components";

import { SLinkUnderline } from "webviz-core/shared/styledComponents";
import { type AddPanelPayload, addPanel } from "webviz-core/src/actions/panels";
import ChildToggle from "webviz-core/src/components/ChildToggle";
import Flex from "webviz-core/src/components/Flex";
import GlobalVariablesTable, {
  ANIMATION_RESET_DELAY_MS,
  isActiveElementEditable,
  makeFlashAnimation,
} from "webviz-core/src/components/GlobalVariablesTable";
import { WrappedIcon } from "webviz-core/src/components/Icon";
import Menu from "webviz-core/src/components/Menu";
import HelpButton from "webviz-core/src/components/PanelToolbar/HelpButton";
import useGlobalVariables from "webviz-core/src/hooks/useGlobalVariables";
import GlobalVariables from "webviz-core/src/panels/GlobalVariables";
import helpContent from "webviz-core/src/panels/GlobalVariables/index.help.md";
import inScreenshotTests from "webviz-core/src/stories/inScreenshotTests";
import logEvent, { getEventTags, getEventNames } from "webviz-core/src/util/logEvent";
import { colors } from "webviz-core/src/util/sharedStyleConstants";

const STitleBar = styled.div`
  display: flex;
  padding: 16px;
  align-items: center;
`;

const STitle = styled.div`
  flex: 1 1;
  font-size: 14px;
`;

const SActions = styled.div`
  display: flex;
  flex-wrap: nowrap;
  align-items: center;

  > * {
    margin-left: 8px;
  }
`;

const AnimationDuration = 3;
const IconFlashKeyframes = makeFlashAnimation(
  css`
    opacity: 0.5;
    color: ${colors.LIGHT};
  `,
  css`
    opacity: 1;
    color: ${colors.BLUE};
  `
);
const IconFlashAnimation = css`
  animation: ${IconFlashKeyframes} ${AnimationDuration}s ease-out;
  animation-fill-mode: forwards;
`;

const SAnimatedIcon = styled(WrappedIcon)`
  color: ${colors.LIGHT};
  transition: all ${AnimationDuration}s;
  ${({ animate, skipAnimation }) => (animate && !skipAnimation ? IconFlashAnimation : "none")};
`;

type Props = {|
  defaultIsOpen?: boolean, // Only for testing
  skipAnimation?: boolean, // Only for testing
|};

function GlobalVariablesMenu(props: Props) {
  const { defaultIsOpen, skipAnimation = inScreenshotTests() } = props;
  const [hasChangedVariable, setHasChangedVariable] = useState<boolean>(false);
  const [isOpen, setIsOpen] = useState<boolean>(defaultIsOpen || false);
  const onToggle = useCallback(() => {
    setHasChangedVariable(false);
    setIsOpen((open) => !open);
  }, []);

  const dispatch = useDispatch();
  const layout = useSelector((state) => state.persistedState.panels.layout);
  const addPanelToLayout = useCallback(() => {
    setIsOpen((open) => !open);
    dispatch(addPanel(({ type: GlobalVariables.panelType, layout, tabId: null }: AddPanelPayload)));

    logEvent({ name: getEventNames().PANEL_ADD, tags: { [getEventTags().PANEL_TYPE]: GlobalVariables.panelType } });
  }, [dispatch, layout]);

  const { globalVariables } = useGlobalVariables();
  useEffect(() => {
    setHasChangedVariable(!skipAnimation && !isActiveElementEditable());
    const timerId = setTimeout(() => setHasChangedVariable(false), ANIMATION_RESET_DELAY_MS);
    return () => clearTimeout(timerId);
  }, [globalVariables, skipAnimation]);

  return (
    <ChildToggle position="below" onToggle={onToggle} isOpen={isOpen} dataTest="open-global-variables">
      <Flex center>
        <SAnimatedIcon
          medium
          fade
          active={isOpen}
          animate={hasChangedVariable}
          skipAnimation={skipAnimation || isOpen}
          style={{ transition: "all 1s ease-out" }}
          tooltip="Global variables">
          <EarthIcon />
        </SAnimatedIcon>
      </Flex>
      <Menu>
        <STitleBar>
          <STitle>Global variables</STitle>
          <SActions>
            <SLinkUnderline onClick={addPanelToLayout}>Add panel to layout</SLinkUnderline>
            <HelpButton iconStyle={{ width: "18px", height: "18px" }}>{helpContent}</HelpButton>
          </SActions>
        </STitleBar>
        <hr />
        <GlobalVariablesTable />
      </Menu>
    </ChildToggle>
  );
}

export default GlobalVariablesMenu;
