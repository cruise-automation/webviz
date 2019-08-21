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
import { jsonTreeTheme } from "webviz-core/src/util/globalConstants";

const SObjectDetails = styled.div`
  padding: 12px 0 16px 0;
`;

type Props = {
  interactionData: ?InteractionData,
  linkedGlobalVariables: LinkedGlobalVariables,
  selectedObject: MouseEventObject,
};

export default function ObjectDetails({
  interactionData,
  linkedGlobalVariables,
  selectedObject: { object, instanceIndex },
}: Props) {
  const topic = (interactionData && interactionData.topic) || "";
  if (!topic) {
    // show the original object directly if there is no interaction data. e.g. DrawPolygons
    return (
      <SObjectDetails>
        <Tree
          data={object}
          shouldExpandNode={(markerKeyPath, data, level) => level < 2}
          invertTheme={false}
          theme={{ ...jsonTreeTheme, tree: { margin: 0 } }}
          hideRoot
        />
      </SObjectDetails>
    );
  }

  const originalObject = omit(object, "interactionData");

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
