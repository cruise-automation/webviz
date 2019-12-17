// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { vec3 } from "gl-matrix";
import { isEqual } from "lodash";
import * as React from "react";
import { type CameraState, cameraStateSelectors } from "regl-worldview";
import styled from "styled-components";

import Button from "webviz-core/src/components/Button";
import Flex from "webviz-core/src/components/Flex";
import PanelContext from "webviz-core/src/components/PanelContext";
import { UncontrolledValidatedInput, YamlInput } from "webviz-core/src/components/ValidatedInput";
import { point2DValidator, cameraStateValidator } from "webviz-core/src/components/validators";
import { getGlobalHooks } from "webviz-core/src/loadWebviz";
import { Renderer } from "webviz-core/src/panels/ThreeDimensionalViz/index";
import { SValue, SLabel } from "webviz-core/src/panels/ThreeDimensionalViz/Interactions/Interactions";
import colors from "webviz-core/src/styles/colors.module.scss";
import clipboard from "webviz-core/src/util/clipboard";

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
  followOrientation: boolean,
  followTf?: string | false,
  isPlaying?: boolean,
  onAlignXYAxis: () => void,
  onCameraStateChange: (CameraState) => void,
  showCrosshair?: boolean,
};

type CameraInfoProps = {
  cameraState: $Shape<CameraState>,
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
  followOrientation,
  followTf,
  isPlaying,
  onAlignXYAxis,
  onCameraStateChange,
  showCrosshair,
}: CameraInfoProps) {
  const { updatePanelConfig, saveConfig } = React.useContext(PanelContext) || {};
  const [edit, setEdit] = React.useState<boolean>(false);

  const { target, targetOffset } = cameraState;
  const targetHeading = cameraStateSelectors.targetHeading(cameraState);
  const camPos2D = vec3.add(TEMP_VEC3, target, vec3.rotateZ(TEMP_VEC3, targetOffset, ZERO_VEC3, -targetHeading));
  const camPos2DTrimmed = camPos2D.map((num) => +num.toFixed(2));

  return (
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
          onClick={() => setEdit(!edit)}>
          {edit ? "Done" : "Edit"}
        </Button>
        <Button
          tooltip="Sync camera state across all 3D panels"
          onClick={() => updatePanelConfig(Renderer.panelType, (config) => ({ ...config, cameraState }))}>
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
  );
}
