// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import PlusIcon from "@mdi/svg/svg/plus.svg";
import React, { useCallback, useState, useEffect, useContext } from "react";
import styled from "styled-components";

import KeyboardFocusIndex from "./KeyboardFocusIndex";
import { SBrowseButton } from "./QuickAddTopic";
import TopicGroupCreate from "./TopicGroupCreate";
import { KeyboardContext } from "./TopicGroups";
import type { TopicGroupConfig } from "./types";
import Icon from "webviz-core/src/components/Icon";
import Modal from "webviz-core/src/components/Modal";
import { RenderToBodyComponent } from "webviz-core/src/components/renderToBody";
import { colors } from "webviz-core/src/util/sharedStyleConstants";

const SCreateGroupButtonWrapper = styled.div`
  display: flex;
  align-items: center;
  padding: ${({ isEmptyStateCreate }) => (isEmptyStateCreate ? "0px" : "4px")};
  background-color: ${({ highlighted }) => (highlighted ? colors.HOVER_BACKGROUND_COLOR : "unset")};
`;

type Props = {|
  availableTopicNames: string[],
  displayNameByTopic: { [topicName: string]: string },
  isEmptyStateCreate?: boolean,
  keyboardFocusIndex: number,
  onAddGroup: (newTopicGroup: TopicGroupConfig) => void,
  testShowAddView?: boolean,
|};

export default function CreateGroupButton({
  availableTopicNames,
  isEmptyStateCreate,
  displayNameByTopic,
  keyboardFocusIndex,
  onAddGroup,
}: Props) {
  const [showModal, setShowModal] = useState(false);
  const { focusIndex, setFocusIndex, focusItemOp, onFocusOnContainer, setFocusItemOp } = useContext(KeyboardContext);
  const highlighted = focusIndex !== -1 && focusIndex === keyboardFocusIndex;

  useEffect(
    () => {
      // Open the add modal upon pressing `Enter` key
      if (highlighted && focusItemOp && focusItemOp === "Enter") {
        setShowModal(true);
        setFocusItemOp(undefined);
      }
    },
    [focusItemOp, highlighted, setFocusItemOp, showModal]
  );

  const onCloseModal = useCallback(
    () => {
      setShowModal(false);
      onFocusOnContainer();
    },
    [onFocusOnContainer]
  );

  return (
    <SCreateGroupButtonWrapper
      isEmptyStateCreate={isEmptyStateCreate}
      className={`focus-item-${keyboardFocusIndex}`}
      role="option"
      highlighted={highlighted}
      onMouseEnter={() => {
        if (!highlighted) {
          setFocusIndex(keyboardFocusIndex);
        }
      }}>
      <KeyboardFocusIndex highlighted={highlighted} keyboardFocusIndex={keyboardFocusIndex} />
      {showModal && (
        <RenderToBodyComponent>
          <Modal
            onRequestClose={onCloseModal}
            contentStyle={{
              maxHeight: "calc(100vh - 200px)",
              minHeight: 300,
              maxWidth: 800,
              display: "flex",
              flexDirection: "column",
            }}>
            <TopicGroupCreate
              availableTopicNames={availableTopicNames}
              displayNameByTopic={displayNameByTopic}
              onAddGroup={onAddGroup}
              onCloseModal={onCloseModal}
            />
          </Modal>
        </RenderToBodyComponent>
      )}
      <SBrowseButton
        style={{ marginLeft: isEmptyStateCreate ? 0 : 12 }}
        className="test-add-group-button"
        onClick={() => setShowModal(true)}>
        <Icon small>
          <PlusIcon />
        </Icon>
        New group
      </SBrowseButton>
    </SCreateGroupButtonWrapper>
  );
}
