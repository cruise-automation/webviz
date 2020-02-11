// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { Icon } from "antd";
import React, { useCallback, useState } from "react";
import styled from "styled-components";

import { SBrowseButton } from "./QuickAddTopic";
import TopicGroupCreate from "./TopicGroupCreate";
import type { TopicGroupConfig } from "./types";
import Modal from "webviz-core/src/components/Modal";
import { RenderToBodyComponent } from "webviz-core/src/components/renderToBody";

const SCreateGroupButtonWrapper = styled.div`
  padding: 4px 4px 4px 16px;
`;

type Props = {|
  availableTopicNames: string[],
  displayNameByTopic: { [topicName: string]: string },
  onAddGroup: (newTopicGroup: TopicGroupConfig) => void,
  testShowAddView?: boolean,
|};

export default function CreateGroupButton({
  availableTopicNames,
  displayNameByTopic,
  onAddGroup,
  testShowAddView,
}: Props) {
  const [showModal, setShowModal] = useState(false);
  const onCloseModal = useCallback(() => setShowModal(false), []);
  return (
    <SCreateGroupButtonWrapper>
      {showModal && (
        <RenderToBodyComponent>
          <Modal
            onRequestClose={() => setShowModal(false)}
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
      <SBrowseButton className="test-add-group-button" onClick={() => setShowModal(true)}>
        <Icon type="plus" style={{ padding: "4px 10px 0 0" }} />
        New Group
      </SBrowseButton>
    </SCreateGroupButtonWrapper>
  );
}
