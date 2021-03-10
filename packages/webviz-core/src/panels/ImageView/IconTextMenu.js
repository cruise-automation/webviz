// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import FormatTextIcon from "@mdi/svg/svg/format-text-rotation-none.svg";
import React from "react";

import { Item, SubMenu } from "webviz-core/src/components/Menu";
import TextField from "webviz-core/src/components/TextField";

export default function IconTextMenu({ value, onChange }: { value: string, onChange: (newVal: string) => void }) {
  return (
    <SubMenu checked={false} text="Icon text template" icon={<FormatTextIcon />}>
      <Item tooltip="Use the template string and metadata fields to configure the icon text, e.g. ${id} (${confidence})">
        <TextField value={value} autoFocus onChange={onChange} placeholder="e.g. `${id} (${confidence})`" />
      </Item>
    </SubMenu>
  );
}
