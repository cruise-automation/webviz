// @flow

//  Copyright (c) 2018-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { withKnobs, boolean, number } from "@storybook/addon-knobs";
import { storiesOf } from "@storybook/react";
import { quat, vec3 } from "gl-matrix";
import * as React from "react";

import { vec4ToOrientation, vec3ToPoint } from "../utils/commandUtils";
import Container from "./Container";

import { Arrows, Spheres, Axes, Grid, cameraStateSelectors, type CameraState } from "..";

type Props = {|
  cameraStateFromKnobs: CameraState,
  controlled: boolean, // eslint-disable-line react/no-unused-prop-types
|};

type State = {|
  cameraState: CameraState,
|};

class CameraStateStory extends React.Component<Props, State> {
  state = {
    cameraState: this.props.cameraStateFromKnobs,
  };

  _onCameraStateChange = (cameraState: CameraState) => {
    this.setState({ cameraState });
  };

  static getDerivedStateFromProps(props: Props, prevState: State) {
    if (props.controlled) {
      return { cameraState: props.cameraStateFromKnobs };
    }
    const { perspective } = props.cameraStateFromKnobs;
    if (perspective !== prevState.cameraState.perspective) {
      return { cameraState: { ...prevState.cameraState, perspective } };
    }
    return null;
  }

  render() {
    const { cameraState } = this.state;
    const targetHeading = cameraStateSelectors.targetHeading(cameraState);

    const poseArrowMarker = {
      pose: {
        orientation: vec4ToOrientation(cameraState.targetOrientation),
        position: vec3ToPoint(cameraState.target),
      },
      scale: { x: 20, y: 3, z: 3 },
      color: { r: 1, g: 0, b: 1, a: 1 },
    };

    const arrowLength = 10;
    const cameraPosition = cameraState.perspective
      ? vec3.copy(
          [0, 0, 0],
          cameraStateSelectors.position({
            ...cameraState,
            distance: cameraState.distance + arrowLength,
          })
        )
      : [0, 0, cameraState.distance + arrowLength];
    vec3.add(cameraPosition, cameraPosition, cameraState.targetOffset);
    vec3.rotateZ(cameraPosition, cameraPosition, [0, 0, 0], -targetHeading);
    vec3.add(cameraPosition, cameraPosition, cameraState.target);

    const cameraOrientation = [0, 0, 0, 1];
    quat.rotateZ(cameraOrientation, cameraOrientation, -targetHeading);
    quat.multiply(cameraOrientation, cameraOrientation, cameraStateSelectors.orientation(cameraState));
    quat.rotateY(cameraOrientation, cameraOrientation, Math.PI / 2);

    const cameraArrowMarker = {
      pose: {
        position: vec3ToPoint(cameraPosition),
        orientation: vec4ToOrientation(cameraOrientation),
      },
      scale: { x: arrowLength, y: 2, z: 2 },
      color: { r: 0, g: 1, b: 1, a: 0.5 },
    };

    // show the camera target as a white dot
    const spherePos = vec3.transformQuat([0, 0, 0], cameraState.targetOffset, cameraState.targetOrientation);
    vec3.add(spherePos, spherePos, cameraState.target);
    const sphereMarker = {
      pose: {
        position: {
          x: spherePos[0],
          y: spherePos[1],
          z: spherePos[2] + 2, // extra offset to make sure sphere is visible in 2D mode
        },
        orientation: { x: 0, y: 0, z: 0, w: 1 },
      },
      scale: { x: 1, y: 1, z: 1 },
      color: { r: 1, g: 1, b: 1, a: 1 },
    };

    return (
      <div
        style={{
          display: "flex",
          flexDirection: "row",
          width: "100%",
          height: "100%",
        }}>
        <div style={{ flex: "1 1 0", overflow: "hidden" }}>
          <Container axes grid cameraState={cameraState} onCameraStateChange={this._onCameraStateChange}>
            <Arrows>{[poseArrowMarker]}</Arrows>
            <Spheres>{[sphereMarker]}</Spheres>
            <Grid count={10} />
            <Axes />
          </Container>
        </div>
        <div style={{ flex: "1 1 0", overflow: "hidden" }}>
          <Container
            hideState
            defaultCameraState={{
              perspective: true,
              distance: 150,
              thetaOffset: 0.5,
              phi: 1,
              target: [0, 0, 0],
              targetOffset: [0, 0, 0],
              targetOrientation: [0, 0, 0, 1],
            }}>
            <Arrows>{[poseArrowMarker, cameraArrowMarker]}</Arrows>
            <Spheres>{[sphereMarker]}</Spheres>
            <Axes />
            <Grid count={10} />
          </Container>
        </div>
      </div>
    );
  }
}

const stories = storiesOf("Worldview/cameraState", module);
stories.addDecorator(withKnobs).add("cameraState", () => {
  const controlled = boolean("controlled (disable mouse controls)", true);
  const perspective = boolean("is perspective", true);

  const distance = number("distance", 50, {
    range: true,
    min: 0,
    max: 400,
    step: 1,
  });
  const thetaOffset = number("thetaOffset", 0.3, {
    range: true,
    min: 0,
    max: Math.PI * 2,
    step: 0.01,
  });
  const phi = number("phi", 0.85, {
    range: true,
    min: 0,
    max: Math.PI,
    step: 0.01,
  });
  const orientationX = number("orientation - x", 0, {
    range: true,
    min: 0,
    max: 1,
    step: 0.01,
  });
  const orientationY = number("orientation - y", 0, {
    range: true,
    min: 0,
    max: 1,
    step: 0.01,
  });
  const orientationZ = number("orientation - z", 0, {
    range: true,
    min: 0,
    max: 1,
    step: 0.01,
  });

  const posX = number("target - x", 0, {
    range: true,
    min: 0,
    max: 20,
    step: 0.1,
  });
  const posY = number("target - y", 0, {
    range: true,
    min: 0,
    max: 20,
    step: 0.1,
  });
  const posZ = number("target - z", 0, {
    range: true,
    min: 0,
    max: 20,
    step: 0.1,
  });

  const offsetX = number("targetOffset - x", 0, {
    range: true,
    min: 0,
    max: 20,
    step: 0.1,
  });
  const offsetY = number("targetOffset - y", 0, {
    range: true,
    min: 0,
    max: 20,
    step: 0.1,
  });
  const offsetZ = number("targetOffset - z", 0, {
    range: true,
    min: 0,
    max: 20,
    step: 0.1,
  });

  const fovy = number("fovy", Math.PI / 4, {
    range: true,
    min: 0,
    max: Math.PI,
    step: 0.01,
  });
  const near = number("near", 0.01, {
    range: true,
    min: 0.001,
    max: 1000,
    step: 0.01,
  });
  const far = number("far", 5000, {
    range: true,
    min: 10,
    max: 10000,
    step: 0.01,
  });

  let length = Math.hypot(orientationX, orientationY, orientationZ);
  if (length > 1) {
    length /= 2;
  }
  const orientationW = Math.sqrt(1 - length * length);

  const target = [posX, posY, posZ];
  const targetOffset = [offsetX, offsetY, offsetZ];
  const targetOrientation = [orientationX, orientationY, orientationZ, orientationW];
  const cameraState = {
    perspective,
    distance,
    thetaOffset,
    phi,
    target,
    targetOffset,
    targetOrientation,
    fovy,
    near,
    far,
  };
  return <CameraStateStory controlled={controlled} cameraStateFromKnobs={cameraState} />;
});
