// @flow
//
//  Copyright (c) 2018-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import CodeBracesIcon from "@mdi/svg/svg/code-braces.svg";
import * as React from "react";
import { type CameraState } from "regl-worldview";
import styled from "styled-components";

import cameraStateValidator from "./cameraStateValidator";
import type { ThreeDimensionalVizConfig } from "./index";
import Button from "webviz-core/src/components/Button";
import ExpandingToolbar, { ToolGroup } from "webviz-core/src/components/ExpandingToolbar";
import Flex from "webviz-core/src/components/Flex";
import JsonInput from "webviz-core/src/components/JsonInput";
import { getGlobalHooks } from "webviz-core/src/loadWebviz";
import styles from "webviz-core/src/panels/ThreeDimensionalViz/Layout.module.scss";
import PositionControl from "webviz-core/src/panels/ThreeDimensionalViz/PositionControl";
import colors from "webviz-core/src/styles/colors.module.scss";
import type { SaveConfig } from "webviz-core/src/types/panels";
import clipboard from "webviz-core/src/util/clipboard";

const SRow = styled.div`
  display: flex;
  align-items: center;
`;

const SLabel = styled.label`
  width: 112px;
  margin: 4px 0;
`;
const SValue = styled.span`
  color: ${colors.highlight};
`;

const SPasteBox = styled.div`
  display: flex;
  flex-direction: column;
  width: 240px;
  height: 200px;
`;

type CamaeraStateInfoProps = {
  onAlignXYAxis: () => void,
  cameraState: $Shape<CameraState>,
};

type CameraPositionInfoProps = {
  cameraState: $Shape<CameraState>,
  followOrientation: boolean,
  followTf?: string | false,
  onCameraStateChange: (CameraState) => void,
};

type Props = {
  expanded?: boolean,
  followOrientation: boolean,
  followTf?: string | false,
  onCameraStateChange: (CameraState) => void,
  onExpand: (expanded: boolean) => void,
  saveConfig: SaveConfig<ThreeDimensionalVizConfig>,
  selectedTab: "Position" | "Camera State",
  showPasteBox?: boolean,
} & CamaeraStateInfoProps;

function CameraPositionInfo({
  cameraState,
  onCameraStateChange,
  followOrientation,
  followTf,
}: CameraPositionInfoProps) {
  return (
    <Flex col>
      <PositionControl cameraState={cameraState} onCameraStateChange={onCameraStateChange} />
      {cameraState.perspective && (
        <span className={styles.cameraWarning}>Disable 3D mode to show the camera center point</span>
      )}
      {followTf ? (
        <p>
          Following frame <code>{followTf}</code>
          {followOrientation && " with orientation"}
        </p>
      ) : (
        <p>Locked to map ({getGlobalHooks().perPanelHooks().ThreeDimensionalViz.rootTransformFrame})</p>
      )}
    </Flex>
  );
}

function CamaeraStateInfo({ cameraState, onAlignXYAxis }: CamaeraStateInfoProps) {
  return (
    <>
      {Object.keys(cameraState)
        .sort()
        .map((key) => {
          let val = cameraState[key];
          if (key === "perspective") {
            val = cameraState[key] ? "true" : "false";
          } else if (Array.isArray(cameraState[key])) {
            val = cameraState[key].map((x) => x.toFixed(1)).join(", ");
          } else if (typeof cameraState[key] === "number") {
            val = cameraState[key].toFixed(2);
          }
          return [key, val];
        })
        .map(([key, val]) => (
          <SRow key={key}>
            <SLabel>{key}:</SLabel> <SValue>{val}</SValue>
            {key === "thetaOffset" && (
              <Button
                onClick={onAlignXYAxis}
                tooltip="Align XY axis by reseting thetaOffset to 0. Will no longer follow orientation.">
                RESET
              </Button>
            )}
          </SRow>
        ))}
    </>
  );
}

export default function CameraInfo({
  cameraState,
  expanded,
  followOrientation,
  followTf,
  onAlignXYAxis,
  onCameraStateChange,
  onExpand,
  saveConfig,
  selectedTab,
  showPasteBox: showPasteBoxAlt,
}: Props) {
  const [showPasteBox, setShowPasteBox] = React.useState<boolean>(!!showPasteBoxAlt);
  // pasteValue is the actual cameraState object that can be saved to panel config. It's null if the validation fails
  const [pasteValue, setPasteValue] = React.useState<?$Shape<CameraState>>(cameraState);

  return (
    <ExpandingToolbar
      tooltip="Camera Information"
      icon={<CodeBracesIcon data-storybook-show-camera-position />}
      className={styles.buttons}
      expanded={expanded}
      selectedTab={selectedTab}
      onExpand={onExpand}>
      <ToolGroup name="Position" key="position">
        <CameraPositionInfo
          cameraState={cameraState}
          onCameraStateChange={onCameraStateChange}
          followTf={followTf}
          followOrientation={followOrientation}
        />
      </ToolGroup>
      <ToolGroup name="Camera State" key="cameraState">
        <Flex col>
          {showPasteBox ? (
            <SPasteBox>
              <JsonInput value={pasteValue} onChange={setPasteValue} dataValidator={cameraStateValidator} />
            </SPasteBox>
          ) : (
            <CamaeraStateInfo cameraState={cameraState} onAlignXYAxis={onAlignXYAxis} />
          )}
          <Flex row>
            <Button
              tooltip="Copy cameraState"
              small
              onClick={() => {
                setShowPasteBox(false);
                clipboard.copy(JSON.stringify(cameraState, null, 2));
              }}>
              Copy
            </Button>
            <Button
              small
              tooltip="Paste cameraState (default to current cameraState)"
              onClick={() => setShowPasteBox(true)}>
              Paste
            </Button>
            <Button
              small
              tooltip={
                pasteValue
                  ? "Reset the cameraState to the pasted value"
                  : "Paste valid value before applying the cameraState"
              }
              disabled={!pasteValue || !showPasteBox}
              onClick={() => {
                if (pasteValue) {
                  saveConfig({ cameraState: pasteValue });
                }
              }}>
              Apply
            </Button>
          </Flex>
        </Flex>
      </ToolGroup>
    </ExpandingToolbar>
  );
}

CameraInfo.defaultProps = {
  selectedTab: "Position",
};
