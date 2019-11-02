// @flow
//
//  Copyright (c) 2018-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.
import { first, omit } from "lodash";
import * as React from "react";
import Tree from "react-json-tree";
import { type MouseEventObject } from "regl-worldview";
import styled from "styled-components";

import GlobalVariableLink from "./GlobalVariableLink/index";
import type { InteractionData } from "./types";
import { type LinkedGlobalVariables } from "./useLinkedGlobalVariables";
import Dropdown from "webviz-core/src/components/Dropdown";
import { jsonTreeTheme } from "webviz-core/src/util/globalConstants";

const SObjectDetails = styled.div`
  padding: 12px 0 16px 0;
`;

type CommonProps = {
  interactionData: ?InteractionData,
  linkedGlobalVariables: LinkedGlobalVariables,
};

type WrapperProps = CommonProps & {
  selectedObject: MouseEventObject,
};

type Props = CommonProps & {
  objectToDisplay: any,
};

export const getInstanceObj = (marker: any, idx: number) => {
  return marker.metadataByIndex && marker.metadataByIndex[idx];
};

export default function ObjectDetailsWrapper({
  interactionData,
  linkedGlobalVariables,
  selectedObject: { object, instanceIndex },
}: WrapperProps) {
  const [showInstance, setShowInstance] = React.useState(true);
  const instanceObject = getInstanceObj(object, instanceIndex);
  const dropdownText = {
    instance: "Show instance object",
    full: "Show full object",
  };

  return instanceObject ? (
    <div>
      <Dropdown
        position="below"
        value={showInstance}
        text={showInstance ? dropdownText.instance : dropdownText.full}
        onChange={setShowInstance}>
        <span value={true}>{dropdownText.instance}</span>
        <span value={false}>{dropdownText.full}</span>
      </Dropdown>
      <ObjectDetails
        interactionData={interactionData}
        linkedGlobalVariables={linkedGlobalVariables}
        objectToDisplay={showInstance ? instanceObject : object}
      />
    </div>
  ) : (
    <ObjectDetails
      interactionData={interactionData}
      linkedGlobalVariables={linkedGlobalVariables}
      objectToDisplay={object}
    />
  );
}

function ObjectDetails({ interactionData, linkedGlobalVariables, objectToDisplay }: Props) {
  const topic = (interactionData && interactionData.topic) || "";
  const originalObject = omit(objectToDisplay, "interactionData");

  if (!topic) {
    // show the original object directly if there is no interaction data. e.g. DrawPolygons
    return (
      <SObjectDetails>
        <Tree
          data={objectToDisplay}
          shouldExpandNode={(markerKeyPath, data, level) => level < 2}
          invertTheme={false}
          theme={{ ...jsonTreeTheme, tree: { margin: 0 } }}
          hideRoot
        />
      </SObjectDetails>
    );
  }

  return (
    <SObjectDetails>
      <Tree
        data={originalObject}
        shouldExpandNode={(markerKeyPath, data, level) => level < 2}
        invertTheme={false}
        theme={{ ...jsonTreeTheme, tree: { margin: 0 } }}
        hideRoot
        getItemString={(type, data, itemType, itemString) => <span>{itemString}</span>}
        labelRenderer={(markerKeyPath: string[], p1, p2, hasChildren: boolean, ...rest) => {
          const label = first(markerKeyPath);
          if (!hasChildren) {
            return <span style={{ padding: "0 4px" }}>{label}</span>;
          }

          let objectForPath = originalObject;
          for (let i = markerKeyPath.length - 1; i >= 0; i--) {
            objectForPath = objectForPath[markerKeyPath[i]];
            if (!objectForPath) {
              break;
            }
          }

          if (objectForPath) {
            return (
              <GlobalVariableLink
                hasNestedValue
                style={{ marginLeft: 4 }}
                label={label}
                markerKeyPath={markerKeyPath}
                topic={topic}
                variableValue={objectForPath}
              />
            );
          }
        }}
        valueRenderer={(label: string, itemValue: any, ...markerKeyPath: string[]) => {
          return (
            <GlobalVariableLink
              style={{ marginLeft: 16 }}
              label={label}
              markerKeyPath={markerKeyPath}
              topic={topic}
              variableValue={itemValue}
            />
          );
        }}
      />
    </SObjectDetails>
  );
}
