// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import React from "react";

import { SDisplayName } from "./ItemRow";
import type { TfItem } from "./types";

type Props = {|
  ...TfItem,
|};

export default function ItemTf({ displayName }: Props) {
  return (
    <div>
      <SDisplayName>{displayName}</SDisplayName>
    </div>
  );
}
