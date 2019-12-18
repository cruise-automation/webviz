// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import LinkPlusIcon from "@mdi/svg/svg/link-plus.svg";
import classNames from "classnames";
import * as React from "react";

import useLinkedGlobalVariables from "../useLinkedGlobalVariables";
import { SGlobalVariableForm, GlobalVariableName } from "./index";
import UnlinkGlobalVariables from "./UnlinkGlobalVariables";
import Button from "webviz-core/src/components/Button";
import ChildToggle from "webviz-core/src/components/ChildToggle";
import Icon from "webviz-core/src/components/Icon";
import useGlobalVariables from "webviz-core/src/hooks/useGlobalVariables";
import colors from "webviz-core/src/styles/colors.module.scss";

type AddToLinkedGlobalVariable = {
  topic: string,
  markerKeyPath: string[],
  variableValue: any,
};

type Props = {
  highlight?: boolean,
  addToLinkedGlobalVariable: AddToLinkedGlobalVariable,
  style?: any,
  tooltip?: React.Node,
};

function getInitialName(markerKeyPath: string[]) {
  return markerKeyPath
    .slice(0, 2)
    .reverse()
    .join("_");
}

export default function LinkToGlobalVariable({
  style = {},
  addToLinkedGlobalVariable: { topic, variableValue, markerKeyPath },
  tooltip,
  highlight,
}: Props) {
  const [isOpen, _setIsOpen] = React.useState<boolean>(false);
  const [name, setName] = React.useState(() => getInitialName(markerKeyPath));

  const setIsOpen = React.useCallback(
    (newValue: boolean) => {
      _setIsOpen(newValue);
      if (newValue) {
        setName(getInitialName(markerKeyPath));
      }
    },
    [markerKeyPath]
  );

  const { setGlobalVariables } = useGlobalVariables();
  const { linkedGlobalVariables, setLinkedGlobalVariables } = useLinkedGlobalVariables();

  const addLink = (ev) => {
    ev.preventDefault();
    setGlobalVariables({ [name]: variableValue });
    const newLinkedGlobalVariables = [...linkedGlobalVariables, { topic, markerKeyPath, name }];
    setLinkedGlobalVariables(newLinkedGlobalVariables);
    setIsOpen(false);
  };

  const highlightIconStyle = highlight ? { color: colors.highlight } : {};

  return (
    <ChildToggle
      dataTest={`link-${name}`}
      position="above"
      onToggle={() => setIsOpen(!isOpen)}
      isOpen={isOpen}
      style={style}>
      <Icon
        className={classNames("link-icon", { highlight })}
        style={highlightIconStyle}
        fade={!highlight}
        tooltip={tooltip || "Link this field to a global variable"}
        tooltipProps={{ placement: "top" }}>
        <LinkPlusIcon />
      </Icon>
      <SGlobalVariableForm onSubmit={addLink} data-test="link-form">
        <p style={{ marginTop: 0, lineHeight: "1.4" }}>
          When linked, clicking a new object from {topic} will update the global variable&nbsp;
          <GlobalVariableName name={name} />.
        </p>
        <UnlinkGlobalVariables name={name} showList />
        <input autoFocus type="text" value={`$${name}`} onChange={(e) => setName(e.target.value.replace(/^\$/, ""))} />
        <p data-test="action-buttons">
          <Button primary={!!name} disabled={!name} onClick={addLink}>
            Add Link
          </Button>
          <Button onClick={() => setIsOpen(false)}>Cancel</Button>
        </p>
      </SGlobalVariableForm>
    </ChildToggle>
  );
}
