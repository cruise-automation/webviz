// @flow
//
//  Copyright (c) 2021-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import * as React from "react";

import type { TransformElement } from ".";
import useArbitraryPreloadedMessageDataItems from "webviz-core/src/components/MessagePathSyntax/useArbitraryPreloadedMessageDataItems";
import { quaternionFromRpy } from "webviz-core/src/util/quaternionFromEuler";

export function parseUrdf(urdf: string): TransformElement[] {
  const ret = [];
  const joints = new DOMParser().parseFromString(urdf, "text/xml").getElementsByTagName("joint");
  for (const joint of joints) {
    if (joint.getAttribute("type") !== "fixed") {
      continue;
    }
    const childFrame = joint.getElementsByTagName("child")[0].getAttribute("link");
    const parentFrame = joint.getElementsByTagName("parent")[0].getAttribute("link");
    const originNode = joint.getElementsByTagName("origin")[0];
    const xyz = originNode.getAttribute("xyz");
    const rpy = originNode.getAttribute("rpy");
    if (!childFrame || !parentFrame || !xyz || !rpy) {
      continue;
    }
    const [x, y, z] = xyz.split(" ").map(Number);
    const [roll, pitch, yaw] = rpy.split(" ").map(Number);
    const pose = { position: { x, y, z }, orientation: quaternionFromRpy({ roll, pitch, yaw }) };
    ret.push({ childFrame, parentFrame, pose });
  }
  return ret;
}

export default function useStaticTransformsData(staticTransformPath: ?string): TransformElement[] {
  const dataItems = useArbitraryPreloadedMessageDataItems(staticTransformPath || "");
  return React.useMemo(() => {
    if (!dataItems || !dataItems?.[0]?.value) {
      return [];
    }
    return parseUrdf((dataItems[0].value: any));
  }, [dataItems]);
}
