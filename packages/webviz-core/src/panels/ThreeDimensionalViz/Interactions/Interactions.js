// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import CursorDefault from "@mdi/svg/svg/cursor-default.svg";
import * as React from "react";
import { type MouseEventObject } from "regl-worldview";
import styled from "styled-components";

import GeneralInfo from "./GeneralInfo";
import LinkedGlobalVariableList from "./LinkedGlobalVariableList";
import PointCloudDetails from "./PointCloudDetails";
import type { InteractionData } from "./types";
import useLinkedGlobalVariables from "./useLinkedGlobalVariables";
import Checkbox from "webviz-core/src/components/Checkbox";
import ExpandingToolbar, { ToolGroup, ToolGroupFixedSizePane } from "webviz-core/src/components/ExpandingToolbar";
import Icon from "webviz-core/src/components/Icon";
import PanelContext from "webviz-core/src/components/PanelContext";
import { decodeAdditionalFields } from "webviz-core/src/panels/ThreeDimensionalViz/commands/PointClouds/selection";
import ObjectDetails from "webviz-core/src/panels/ThreeDimensionalViz/Interactions/ObjectDetails";
import styles from "webviz-core/src/panels/ThreeDimensionalViz/Layout.module.scss";
import { getInstanceObj } from "webviz-core/src/panels/ThreeDimensionalViz/threeDimensionalVizUtils";
import type { SaveConfig, PanelConfig } from "webviz-core/src/types/panels";
import { useChangeDetector } from "webviz-core/src/util/hooks";
import { colors } from "webviz-core/src/util/sharedStyleConstants";

export const SRow = styled.div`
  display: flex;
  align-items: center;
  padding: 0;
  margin: 4px 0;
`;
export const SLabel = styled.label`
  width: ${(props) => (props.width ? `${props.width}px` : "80px")};
  margin: 4px 0;
  font-size: 10px;
`;
export const SValue = styled.div`
  color: ${colors.HIGHLIGHT};
  word-break: break-word;
`;
export const SEmptyState = styled.div`
  color: ${colors.TEXT_MUTED};
  line-height: 1.4;
  margin-bottom: 8px;
`;

export const OBJECT_TAB_TYPE = "Clicked object";
export const LINKED_VARIABLES_TAB_TYPE = "Linked variables";
export type TabType = typeof OBJECT_TAB_TYPE | typeof LINKED_VARIABLES_TAB_TYPE;

type Props = {
  defaultSelectedTab?: ?TabType, // for UI testing
  interactionData: ?InteractionData,
  isDrawing: boolean,
  onClearSelectedObject: () => void,
  selectedObject: ?MouseEventObject,
};

type PropsWithConfig = Props & {
  disableAutoOpenClickedObject: boolean,
  saveConfig: SaveConfig<PanelConfig>,
};

const InteractionsBaseComponent = React.memo<PropsWithConfig>(function InteractionsBaseComponent({
  selectedObject,
  interactionData,
  isDrawing,
  onClearSelectedObject,
  defaultSelectedTab,
  disableAutoOpenClickedObject,
  saveConfig,
}: PropsWithConfig) {
  const [selectedTab, setSelectedTab] = React.useState<?TabType>(defaultSelectedTab);
  const selectedObjectChanged = useChangeDetector([selectedObject], !!selectedObject);
  React.useEffect(
    () => {
      if (!disableAutoOpenClickedObject && !isDrawing) {
        // auto open Object tab if the object changed, the tab is not already open, and the user is not drawing
        if (selectedObjectChanged && selectedTab !== OBJECT_TAB_TYPE) {
          setSelectedTab(OBJECT_TAB_TYPE);
        } else if (!selectedObject && selectedTab === OBJECT_TAB_TYPE) {
          // auto collapse the Object pane when there is no object and auto open is enabled
          setSelectedTab(null);
        }
      }
    },
    [disableAutoOpenClickedObject, selectedObjectChanged, selectedTab, selectedObject, isDrawing]
  );

  const { object } = selectedObject || {};
  const isPointCloud = object && object.type === 102;
  const maybeFullyDecodedObject = React.useMemo(
    () => (isPointCloud ? { ...selectedObject, object: decodeAdditionalFields(object) } : selectedObject),
    [isPointCloud, object, selectedObject]
  );

  const { linkedGlobalVariables } = useLinkedGlobalVariables();
  const instanceObject = selectedObject && getInstanceObj(object, selectedObject.instanceIndex);
  const selectedInteractionData = instanceObject?.interactionData || interactionData;

  return (
    <ExpandingToolbar
      tooltip="Clicked objects and linked variables"
      icon={
        <Icon style={{ color: "white" }}>
          <CursorDefault />
        </Icon>
      }
      className={styles.buttons}
      selectedTab={selectedTab}
      onSelectTab={(newSelectedTab) => {
        if (disableAutoOpenClickedObject && object && !newSelectedTab) {
          // automatically unselect object if the user force close the tab when disableAutoOpenClickedObject is enabled
          onClearSelectedObject();
        }
        setSelectedTab(newSelectedTab);
      }}>
      <ToolGroup name={OBJECT_TAB_TYPE}>
        <ToolGroupFixedSizePane>
          {selectedObject ? (
            <>
              {selectedInteractionData && (
                <GeneralInfo selectedObject={selectedObject} interactionData={selectedInteractionData} />
              )}
              {isPointCloud && (
                <PointCloudDetails selectedObject={maybeFullyDecodedObject} interactionData={selectedInteractionData} />
              )}
              <ObjectDetails selectedObject={maybeFullyDecodedObject} interactionData={selectedInteractionData} />
            </>
          ) : (
            <SEmptyState>Click an object in the 3D view to select it.</SEmptyState>
          )}
          <Checkbox
            label="Open this panel automatically"
            checked={!disableAutoOpenClickedObject}
            onChange={() => saveConfig({ disableAutoOpenClickedObject: !disableAutoOpenClickedObject })}
          />
        </ToolGroupFixedSizePane>
      </ToolGroup>
      <ToolGroup name={LINKED_VARIABLES_TAB_TYPE}>
        <ToolGroupFixedSizePane>
          <LinkedGlobalVariableList linkedGlobalVariables={linkedGlobalVariables} />
        </ToolGroupFixedSizePane>
      </ToolGroup>
    </ExpandingToolbar>
  );
});

// Wrap the Interactions so that we don't rerender every time any part of the PanelContext config changes, but just the
// one value that we care about.
export default function Interactions(props: Props) {
  const { saveConfig, config: { disableAutoOpenClickedObject } = {} } = React.useContext(PanelContext) || {};
  return (
    <InteractionsBaseComponent
      {...props}
      saveConfig={saveConfig}
      disableAutoOpenClickedObject={disableAutoOpenClickedObject}
    />
  );
}
