// @flow
//
//  Copyright (c) 2020-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { $WEBVIZ_SOURCE_2 } from "webviz-core/src/util/globalConstants";

// TODO(Audrey): opaque type for node keys: https://flow.org/en/docs/types/opaque-types/
export default function generateNodeKey({
  topicName,
  name,
  namespace,
  isFeatureColumn,
}: {|
  topicName?: ?string,
  name?: ?string,
  namespace?: ?string,
  isFeatureColumn?: boolean,
|}): string {
  const prefixedTopicName = topicName ? (isFeatureColumn ? `${$WEBVIZ_SOURCE_2}${topicName}` : topicName) : undefined;
  if (namespace) {
    if (prefixedTopicName) {
      return `ns:${prefixedTopicName}:${namespace}`;
    }
    throw new Error(
      "Incorrect input for generating the node key. If a namespace is present, then the topicName must be present"
    );
  }
  if (prefixedTopicName) {
    return `t:${prefixedTopicName}`;
  }
  if (name) {
    return isFeatureColumn ? `name_2:${name}` : `name:${name}`;
  }

  throw new Error(`Incorrect input for generating the node key. Either topicName or name must be present.`);
}
