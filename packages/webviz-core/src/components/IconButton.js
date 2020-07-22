// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import React, { type Node } from "react";

import Button from "webviz-core/src/components/Button";
import Icon from "webviz-core/src/components/Icon";
import colors from "webviz-core/src/styles/colors.module.scss";

type Props = {
  tooltip: string,
  onClick: () => void,
  icon: Node,
  id?: string,
  style?: StyleObj,
  disabled?: boolean,
};

export default React.memo<Props>(function IconButton(props: Props) {
  const { tooltip, onClick, id, icon, style, disabled } = props;
  return (
    <Button
      id={id}
      tooltip={tooltip}
      style={{ width: 32, height: 32, padding: 0, backgroundColor: colors.toolbar, ...style }}
      onClick={onClick}
      disabled={disabled}>
      <Icon small>{icon}</Icon>
    </Button>
  );
});
