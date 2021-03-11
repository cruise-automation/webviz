// @flow
//
//  Copyright (c) 2020-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import React from "react";
import styled from "styled-components";

import { type Save3DConfig } from "../index";
import Switch from "webviz-core/src/components/Switch";
import { logEventAction, getEventInfos } from "webviz-core/src/util/logEvent";
import { colors } from "webviz-core/src/util/sharedStyleConstants";

type Props = {|
  enabled: boolean,
  saveConfig: Save3DConfig,
|};

const SDiffModeWrapper = styled.div`
  display: flex;
  padding: 8px 8px 8px 16px;
  height: 42px;
  align-items: center;
`;

const SDiffModeIcon = styled.div`
  display: flex;
  margin: 0 30px 0 auto;
  width: 20px;
  height: 20px;
`;

const STitle = styled.div`
  font-size: 13px;
  line-height: 1.4;
  user-select: none;
  vertical-align: middle;
  margin-left: 8px;
`;

function DiffModeIconEnabled() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" version="1.1" height="100%" width="100%" viewBox="0 0 300 200">
      <defs>
        <circle r="100" id="circle_left" cy="100" cx="100" />
        <circle r="100" id="circle_right" cy="100" cx="200" />
        <mask id="mask_left">
          <use xlinkHref="#circle_right" fill="white" />
        </mask>
      </defs>
      <g>
        <use xlinkHref="#circle_left" strokeWidth="1.5" stroke="none" fill={colors.DIFF_MODE_SOURCE_1} />
        <use xlinkHref="#circle_right" strokeWidth="1.5" stroke="none" fill={colors.DIFF_MODE_SOURCE_2} />
        <use xlinkHref="#circle_left" id="center" fill={colors.DIFF_MODE_SOURCE_BOTH} mask="url(#mask_left)" />
      </g>
    </svg>
  );
}

export default function DiffModeSettings({ enabled, saveConfig }: Props) {
  const updateDiffModeFlag = () => {
    saveConfig({ diffModeEnabled: !enabled });
    logEventAction(getEventInfos()["3D_PANEL.DIFF_MODE_TOGGLED"], {
      enabled: !enabled,
    });
  };

  return (
    <SDiffModeWrapper>
      <Switch onChange={updateDiffModeFlag} isChecked={enabled} />
      <STitle>Show diff</STitle>
      <SDiffModeIcon>{enabled && <DiffModeIconEnabled />}</SDiffModeIcon>
    </SDiffModeWrapper>
  );
}
