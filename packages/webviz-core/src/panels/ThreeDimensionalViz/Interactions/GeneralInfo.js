// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import * as React from "react";
import { type MouseEventObject } from "regl-worldview";

import GlobalVariableLink, { GlobalVariableName, SP } from "./GlobalVariableLink/index";
import { SRow, SValue, type InteractionData } from "./index";
import TopicLink from "./TopicLink";

type Props = {
  selectedObject: MouseEventObject,
  interactionData: InteractionData,
};

export default function GeneralInfo({ selectedObject, interactionData }: Props) {
  return (
    <SRow>
      <SValue>
        <TopicLink topic={interactionData.topic} />
      </SValue>
      {selectedObject.object.id != null && (
        <SValue>
          <GlobalVariableLink
            highlight
            onlyRenderAddLink
            markerKeyPath={["id"]}
            topic={interactionData.topic}
            variableValue={selectedObject.object.id}
            addLinkTooltip={
              <SP style={{ marginTop: 0 }}>
                Link <code>id</code> with global variable <GlobalVariableName name="id" />
              </SP>
            }
          />
        </SValue>
      )}
    </SRow>
  );
}
