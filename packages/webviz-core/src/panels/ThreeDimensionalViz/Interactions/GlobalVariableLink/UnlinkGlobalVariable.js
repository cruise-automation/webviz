// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { isEqual } from "lodash";
import * as React from "react";

import { getPath } from "../interactionUtils";
import useLinkedGlobalVariables, { type LinkedGlobalVariable } from "../useLinkedGlobalVariables";
import { SPath, SGlobalVariableForm, GlobalVariableName } from "./index";
import Button from "webviz-core/src/components/Button";

type Props = {
  linkedGlobalVariable: LinkedGlobalVariable,
  setIsOpen: (boolean) => void,
};
export default function UnlinkGlobalVariable({
  linkedGlobalVariable: { topic, markerKeyPath, name },
  setIsOpen,
}: Props) {
  const { linkedGlobalVariables, setLinkedGlobalVariables } = useLinkedGlobalVariables();
  return (
    <SGlobalVariableForm style={{ marginLeft: 8 }} data-test="unlink-form">
      <p style={{ marginTop: 0, lineHeight: "1.4" }}>
        Unlink <GlobalVariableName name={name} /> from {topic}.<SPath>{getPath(markerKeyPath)}</SPath>?
      </p>
      <Button
        danger
        onClick={() => {
          const newLinkedGlobalVariables = linkedGlobalVariables.filter(
            (linkedGlobalVariable) =>
              !(
                linkedGlobalVariable.topic === topic &&
                isEqual(linkedGlobalVariable.markerKeyPath, markerKeyPath) &&
                linkedGlobalVariable.name === name
              )
          );
          setLinkedGlobalVariables(newLinkedGlobalVariables);
          setIsOpen(false);
        }}>
        Unlink
      </Button>
      <Button onClick={() => setIsOpen(false)}>Cancel</Button>
    </SGlobalVariableForm>
  );
}
