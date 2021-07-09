// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { first, sortBy } from "lodash";
import * as React from "react";
import Tree from "react-json-tree";
import styled from "styled-components";

import GlobalVariableLink from "./GlobalVariableLink/index";
import { jsonTreeTheme } from "webviz-core/src/util/globalConstants";

// Sort the keys of objects to make their presentation more predictable
const PREFERRED_OBJECT_KEY_ORDER = [
  "id",
  "ns",
  "type",
  "action",
  "header",
  "lifetime",
  "color",
  "colors",
  "pose",
  "points",
].reverse();

const SObjectDetails = styled.div`
  padding: 12px 0 16px 0;
`;

type Props = $ReadOnly<{|
  selectedObject: any,
  topic?: ?string,
|}>;

function ObjectDetails({ selectedObject, topic }: Props) {
  if (!topic) {
    // show the original object directly if there is no interaction data. e.g. DrawPolygons
    return (
      <SObjectDetails>
        <Tree
          data={selectedObject}
          shouldExpandNode={(markerKeyPath, data, level) => level < 2}
          invertTheme={false}
          theme={{ ...jsonTreeTheme, tree: { margin: 0 } }}
          hideRoot
        />
      </SObjectDetails>
    );
  }

  const sortedDataObject = Object.fromEntries(
    sortBy(Object.keys(selectedObject), (key) => -PREFERRED_OBJECT_KEY_ORDER.indexOf(key)).map((key) => [
      key,
      selectedObject[key],
    ])
  );

  return (
    <SObjectDetails>
      <Tree
        data={sortedDataObject}
        shouldExpandNode={() => false}
        invertTheme={false}
        theme={{ ...jsonTreeTheme, tree: { margin: 0 } }}
        hideRoot
        getItemString={(type, data, itemType, itemString) => <span>{itemString}</span>}
        labelRenderer={(markerKeyPath: string[], p1, p2, hasChildren: boolean) => {
          const label = first(markerKeyPath);
          if (!hasChildren) {
            return <span style={{ padding: "0 4px" }}>{label}</span>;
          }

          let objectForPath = sortedDataObject;
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

export default ObjectDetails;
