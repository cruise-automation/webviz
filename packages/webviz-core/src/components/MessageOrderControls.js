// @flow
//
//  Copyright (c) 2020-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.
import React, { useCallback, memo } from "react";
import { useSelector, useDispatch } from "react-redux";

import { setPlaybackConfig } from "webviz-core/src/actions/panels";
import Dropdown from "webviz-core/src/components/Dropdown";
import NoHeaderTopicsButton from "webviz-core/src/components/NoHeaderTopicsButton";
import { defaultPlaybackConfig } from "webviz-core/src/reducers/panels";

const messageOrderLabel = {
  receiveTime: "Receive time",
  headerStamp: "Header stamp",
};

export default memo<{}>(function MessageOrderControls() {
  const messageOrder = useSelector((state) => state.persistedState.panels.playbackConfig.messageOrder);
  const dispatch = useDispatch();
  const setMessageOrder = useCallback((newMessageOrder) => {
    dispatch(setPlaybackConfig({ messageOrder: newMessageOrder }));
  }, [dispatch]);

  const orderText = messageOrderLabel[messageOrder] || defaultPlaybackConfig.messageOrder;
  const tooltip = `Order messages by ${orderText.toLowerCase()}`;
  const noHeaderTopicsButton = messageOrder === "headerStamp" ? <NoHeaderTopicsButton /> : null;
  return (
    <>
      <Dropdown
        position="above"
        value={messageOrder}
        text={orderText}
        onChange={setMessageOrder}
        tooltip={tooltip}
        menuStyle={{ width: "125px" }}
        btnStyle={{ marginLeft: 0, marginRight: "8px", height: "28px" }}>
        <span value={"receiveTime"}>{messageOrderLabel.receiveTime}</span>
        <span value={"headerStamp"}>{messageOrderLabel.headerStamp}</span>
      </Dropdown>
      {noHeaderTopicsButton}
    </>
  );
});
