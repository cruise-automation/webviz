// @flow
//
//  Copyright (c) 2019-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import React, { useCallback, useState } from "react";
import { useDrop } from "react-dnd";
import { MosaicDragType } from "react-mosaic-component";
import { useDispatch } from "react-redux";
import styled from "styled-components";

import { savePanelConfigs } from "webviz-core/src/actions/panels";
import EmptyBoxSvg from "webviz-core/src/assets/emptyBox.svg";
import ChildToggle from "webviz-core/src/components/ChildToggle";
import Menu from "webviz-core/src/components/Menu";
import PanelList, { type PanelSelection } from "webviz-core/src/panels/PanelList";
import cssColors from "webviz-core/src/styles/colors.module.scss";
import { selectPanelOutput } from "webviz-core/src/util/layout";
import { colors } from "webviz-core/src/util/sharedStyleConstants";

const SDropTarget = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  flex-direction: column;
  width: 100%;
  height: 100%;
  background-color: ${({ isOver }) => (isOver ? cssColors.textDisabled : "transparent")};
  border: ${({ isOver }) => (isOver ? `1px solid ${cssColors.textMuted}` : "none")};
`;

const SEmptyStateText = styled.div`
  font-size: 16px;
  margin: 16px 72px;
  text-align: center;
  line-height: 1.5;
  color: rgba(247, 247, 243, 0.3);
`;

const SPickAPanelText = styled.div`
  cursor: pointer;
  text-decoration: underline;
  transition: color 0.1s;

  &:hover {
    color: ${colors.TEXTL1};
  }
`;

type Props = {|
  mosaicId: ?string,
  tabId: ?string,
  onChangeLayout: (string) => void,
|};

export const EmptyDropTarget = ({ mosaicId, tabId, onChangeLayout }: Props) => {
  const dispatch = useDispatch();
  const [showPanelList, setShowPanelList] = useState(false);
  const toggleShowPanelList = useCallback(() => setShowPanelList((show) => !show), []);

  const [{ isOver }, drop] = useDrop({
    accept: MosaicDragType.WINDOW,
    drop: (item, monitor) => {
      if (monitor.getItem().mosaicId === mosaicId) {
        return {
          tabId,
        };
      }
    },
    collect: (monitor, props) => ({
      isOver: monitor.isOver(),
    }),
  });

  const onPanelSelect = useCallback(
    ({ type, config, relatedConfigs }: PanelSelection) => {
      const { changePanelPayload, saveConfigsPayload } = selectPanelOutput(type, null, {
        config,
        relatedConfigs,
      });
      // i.e. there is only one panel in the layout.
      if (typeof changePanelPayload.layout === "string") {
        onChangeLayout(changePanelPayload.layout);
        dispatch(savePanelConfigs(saveConfigsPayload));
      }
      window.ga("send", "event", "Panel", "Select", type);
    },
    [dispatch, onChangeLayout]
  );

  return (
    <SDropTarget ref={drop} isOver={isOver} data-test="empty-drop-target">
      <EmptyBoxSvg />
      <SEmptyStateText>
        Nothing here yet.
        <br />
        <ChildToggle
          position="below"
          onToggle={toggleShowPanelList}
          isOpen={showPanelList}
          style={{ display: "inline-flex" }}>
          <SPickAPanelText data-test="pick-a-panel">Pick a panel</SPickAPanelText>
          <Menu>
            <PanelList onPanelSelect={onPanelSelect} />
          </Menu>
        </ChildToggle>{" "}
        {" or drag one in to get started."}
      </SEmptyStateText>
    </SDropTarget>
  );
};
