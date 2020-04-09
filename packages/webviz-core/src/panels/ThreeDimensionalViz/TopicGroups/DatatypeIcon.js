// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import TBoxIcon from "@mdi/svg/svg/alpha-t-box.svg";
import React from "react";

import Icon from "webviz-core/src/components/Icon";
import { getGlobalHooks } from "webviz-core/src/loadWebviz";

export default function DatatypeIcon({ datatype }: { datatype: ?string }) {
  const ICON_BY_DATATYPE = getGlobalHooks().perPanelHooks().ThreeDimensionalViz.iconsByDatatype;

  const TopicIcon = (datatype && ICON_BY_DATATYPE[datatype]) || TBoxIcon;
  return (
    <Icon tooltip={datatype} fade small style={{ cursor: "unset" }} clickable={!!datatype}>
      <TopicIcon />
    </Icon>
  );
}
