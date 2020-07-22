// @flow
//
//  Copyright (c) 2019-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.
import SortIcon from "@mdi/svg/svg/sort-variant.svg";
import React, { useCallback } from "react";
import { useSelector, useDispatch } from "react-redux";

import { setPlaybackConfig } from "webviz-core/src/actions/panels";
import Dropdown from "webviz-core/src/components/Dropdown";
import Icon from "webviz-core/src/components/Icon";
import NoHeaderTopicsButton from "webviz-core/src/components/NoHeaderTopicsButton";

const BUTTON_STYLE = {
  display: "flex",
  alignItems: "center",
  paddingLeft: 0,
};

const messageOrderLabel = {
  receiveTime: "Receive Time",
  headerStamp: "Header Stamp",
};

export default function MessageOrderControls() {
  const messageOrder = useSelector((state) => state.panels.playbackConfig.messageOrder);
  const dispatch = useDispatch();
  const setMessageOrder = useCallback(
    (newMessageOrder) => {
      dispatch(setPlaybackConfig({ messageOrder: newMessageOrder }));
    },
    [dispatch]
  );

  const orderText = messageOrderLabel[messageOrder];
  const dropdownButton = (
    <>
      <Icon small>
        <SortIcon />
      </Icon>
      &nbsp;
      {orderText}
    </>
  );
  const tooltip = `Order messages by ${orderText.toLowerCase()}`;
  const noHeaderTopicsButton = messageOrder === "headerStamp" ? <NoHeaderTopicsButton /> : null;
  return (
    <>
      <div>
        <Dropdown
          position="above"
          value={messageOrder}
          text={dropdownButton}
          onChange={setMessageOrder}
          tooltip={tooltip}
          btnStyle={BUTTON_STYLE}>
          <span value={"receiveTime"}>{messageOrderLabel.receiveTime}</span>
          <span value={"headerStamp"}>{messageOrderLabel.headerStamp}</span>
        </Dropdown>
      </div>
      {noHeaderTopicsButton}
    </>
  );
}
