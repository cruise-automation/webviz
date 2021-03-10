// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.
import CameraControlIcon from "@mdi/svg/svg/camera-control.svg";
import { vec3 } from "gl-matrix";
import { isEqual } from "lodash";
import * as React from "react";
import { type CameraState, cameraStateSelectors } from "regl-worldview";
import styled from "styled-components";

import { point2DValidator, cameraStateValidator } from "webviz-core/shared/validators";
import Button from "webviz-core/src/components/Button";
import ExpandingToolbar, { ToolGroup } from "webviz-core/src/components/ExpandingToolbar";
import Flex from "webviz-core/src/components/Flex";
import Icon from "webviz-core/src/components/Icon";
import PanelContext from "webviz-core/src/components/PanelContext";
import Tooltip from "webviz-core/src/components/Tooltip";
import { UncontrolledValidatedInput, YamlInput } from "webviz-core/src/components/ValidatedInput";
import { getGlobalHooks } from "webviz-core/src/loadWebviz";
import { Renderer, type ThreeDimensionalVizConfig } from "webviz-core/src/panels/ThreeDimensionalViz";
import { SValue, SLabel } from "webviz-core/src/panels/ThreeDimensionalViz/Interactions/Interactions";
import styles from "webviz-core/src/panels/ThreeDimensionalViz/Layout.module.scss";
import {
  getNewCameraStateOnFollowChange,
  type TargetPose,
} from "webviz-core/src/panels/ThreeDimensionalViz/threeDimensionalVizUtils";
import colors from "webviz-core/src/styles/colors.module.scss";
import clipboard from "webviz-core/src/util/clipboard";

export const CAMERA_TAB_TYPE = "Camera";

const LABEL_WIDTH = 112;
const TEMP_VEC3 = [0, 0, 0];
const ZERO_VEC3 = Object.freeze([0, 0, 0]);
const DEFAULT_CAMERA_INFO_WIDTH = 260;

const SRow = styled.div`
  display: flex;
  align-items: center;
`;

type CameraStateInfoProps = {
  cameraState: $Shape<CameraState>,
  onAlignXYAxis: () => void,
};

export type CameraInfoPropsWithoutCameraState = {
  followOrientation: boolean,
  followTf?: string | false,
  isPlaying?: boolean,
  onAlignXYAxis: () => void,
  onCameraStateChange: (CameraState) => void,
  showCrosshair?: boolean,
  autoSyncCameraState: boolean,
  defaultSelectedTab?: string,
};

type CameraInfoProps = {
  cameraState: $Shape<CameraState>,
  targetPose: ?TargetPose,
} & CameraInfoPropsWithoutCameraState;

function CameraStateInfo({ cameraState, onAlignXYAxis }: CameraStateInfoProps) {
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
            <SLabel width={LABEL_WIDTH}>{key}:</SLabel> <SValue>{val}</SValue>
            {key === "thetaOffset" && (
              <Button
                onClick={onAlignXYAxis}
                tooltip="Align XY axis by resetting thetaOffset to 0. Will no longer follow orientation.">
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
  targetPose,
  followOrientation,
  followTf,
  isPlaying,
  onAlignXYAxis,
  onCameraStateChange,
  showCrosshair,
  autoSyncCameraState,
  defaultSelectedTab,
}: CameraInfoProps) {
  const [selectedTab, setSelectedTab] = React.useState(defaultSelectedTab);
  const { updatePanelConfig, saveConfig } = React.useContext(PanelContext) || {};
  const [edit, setEdit] = React.useState<boolean>(false);
  const onEditToggle = React.useCallback(() => setEdit((currVal) => !currVal), []);

  const { target, targetOffset } = cameraState;
  const targetHeading = cameraStateSelectors.targetHeading(cameraState);
  const camPos2D = vec3.add(TEMP_VEC3, target, vec3.rotateZ(TEMP_VEC3, targetOffset, ZERO_VEC3, -targetHeading));
  const camPos2DTrimmed = camPos2D.map((num) => +num.toFixed(2));

  const syncCameraState = () => {
    updatePanelConfig(Renderer.panelType, (config: ThreeDimensionalVizConfig) => {
      // Transform the camera state by whichever TF or orientation the other panels are following.
      const newCameraState = getNewCameraStateOnFollowChange({
        prevCameraState: cameraState,
        prevTargetPose: targetPose,
        prevFollowTf: followTf,
        prevFollowOrientation: followOrientation,
        newFollowTf: config.followTf,
        newFollowOrientation: config.followOrientation,
      });
      return { ...config, cameraState: newCameraState };
    });
  };

  return (
    <ExpandingToolbar
      tooltip="Camera"
      icon={
        <Icon style={{ color: autoSyncCameraState ? colors.accent : "white" }}>
          <CameraControlIcon />
        </Icon>
      }
      className={styles.buttons}
      selectedTab={selectedTab}
      onSelectTab={(newSelectedTab) => setSelectedTab(newSelectedTab)}>
      <ToolGroup name={CAMERA_TAB_TYPE}>
        <Flex col style={{ minWidth: DEFAULT_CAMERA_INFO_WIDTH }}>
          <Flex row reverse>
            <Button
              tooltip="Copy cameraState"
              small
              onClick={() => {
                clipboard.copy(JSON.stringify(cameraState, null, 2));
              }}>
              Copy
            </Button>
            <Button
              disabled={!!isPlaying}
              tooltip={isPlaying ? "Pause player to edit raw camera state object" : "Edit raw camera state object"}
              onClick={onEditToggle}>
              {edit ? "Done" : "Edit"}
            </Button>
            <Button tooltip="Sync camera state across all 3D panels" onClick={syncCameraState}>
              Sync
            </Button>
          </Flex>
          {edit && !isPlaying ? (
            <UncontrolledValidatedInput
              format="yaml"
              value={cameraState}
              onChange={(newCameraState) => saveConfig({ cameraState: newCameraState })}
              dataValidator={cameraStateValidator}
            />
          ) : (
            <Flex col>
              <CameraStateInfo cameraState={cameraState} onAlignXYAxis={onAlignXYAxis} />
              <Flex col>
                <SRow style={{ marginBottom: 8 }}>
                  <Tooltip placement="top" contents="Automatically sync camera across all 3D panels">
                    <SLabel>Auto sync:</SLabel>
                  </Tooltip>
                  <SValue>
                    <input
                      type="checkbox"
                      checked={autoSyncCameraState}
                      onChange={() =>
                        updatePanelConfig(Renderer.panelType, (config) => ({
                          ...config,
                          cameraState,
                          autoSyncCameraState: !autoSyncCameraState,
                        }))
                      }
                    />
                  </SValue>
                </SRow>
                <SRow style={{ marginBottom: 8 }}>
                  <SLabel style={cameraState.perspective ? { color: colors.textMuted } : {}}>Show crosshair:</SLabel>
                  <SValue>
                    <input
                      type="checkbox"
                      disabled={cameraState.perspective}
                      checked={showCrosshair}
                      onChange={() => saveConfig({ showCrosshair: !showCrosshair })}
                    />
                  </SValue>
                </SRow>
                {showCrosshair && !cameraState.perspective && (
                  <SRow style={{ paddingLeft: LABEL_WIDTH, marginBottom: 8 }}>
                    <SValue>
                      <YamlInput
                        inputStyle={{ width: 140 }}
                        value={{ x: camPos2DTrimmed[0], y: camPos2DTrimmed[1] }}
                        onChange={(data) => {
                          const newPos = [data.x, data.y, 0];
                          // extract the targetOffset by subtracting from the target and un-rotating by heading
                          const newTargetOffset = vec3.rotateZ(
                            [0, 0, 0],
                            vec3.sub(TEMP_VEC3, newPos, cameraState.target),
                            ZERO_VEC3,
                            cameraStateSelectors.targetHeading(cameraState)
                          );
                          if (!isEqual(cameraState.targetOffset, newTargetOffset)) {
                            onCameraStateChange({ ...cameraState, targetOffset: newTargetOffset });
                          }
                        }}
                        dataValidator={point2DValidator}
                      />
                    </SValue>
                  </SRow>
                )}
              </Flex>
              {followTf ? (
                <SRow>
                  <SLabel>Following frame:</SLabel>
                  <SValue>
                    <code>{followTf}</code>
                    {followOrientation && " with orientation"}
                  </SValue>
                </SRow>
              ) : (
                <p>Locked to map ({getGlobalHooks().perPanelHooks().ThreeDimensionalViz.rootTransformFrame})</p>
              )}
            </Flex>
          )}
        </Flex>
      </ToolGroup>
    </ExpandingToolbar>
  );
}
