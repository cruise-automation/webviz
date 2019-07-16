// @flow
//
//  Copyright (c) 2018-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import React, { type Node } from "react";

import Button from "webviz-core/src/components/Button";
import Icon from "webviz-core/src/components/Icon";

type Props = {
  tooltip: string,
  onClick: () => void,
  icon: Node,
  id?: string,
};

// $FlowFixMe - flow doesn't have a definition for React.memo
export default React.memo(function IconButton(props: Props) {
  const { tooltip, onClick, id, icon } = props;
  return (
    <Button id={id} tooltip={tooltip} style={{ width: 32, height: 32, padding: 0 }} onClick={onClick}>
      <Icon small>{icon}</Icon>
    </Button>
  );
});
