// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import React from "react";

import { SDisplayName, SName } from "./ItemRow";
import type { TopicItem } from "./types";

type Props = {|
  ...TopicItem,
|};

export default function ItemTopic({ topicName, displayName }: Props) {
  return (
    <div>
      <SDisplayName>{displayName}</SDisplayName>
      {topicName !== displayName && <SName>{topicName}</SName>}
    </div>
  );
}
