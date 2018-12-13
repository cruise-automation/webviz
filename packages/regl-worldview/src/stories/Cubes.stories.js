// @flow

import { storiesOf } from "@storybook/react";
import React from "react";

import Container from "./Container";
import { cube, p, UNIT_QUATERNION, buildMatrix, rng } from "./util";
import withRange from "./withRange";

import { Cubes, DEFAULT_CAMERA_STATE } from "..";

class Wrapper extends React.Component<any> {
  render() {
    const { cubes } = this.props;
    return (
      <React.Fragment>
        <div style={{ position: "absolute", top: 30, left: 30, background: "red" }}>
          <div>some randomly nested div </div>
          <Cubes>
            {cubes.map((c) => {
              return {
                ...c,
                pose: {
                  ...c.pose,
                  position: { x: 5, y: 5, z: 5 },
                },
                color: { r: 1, g: 0, b: 0, a: 1 },
              };
            })}
          </Cubes>
        </div>
        <Cubes>{cubes}</Cubes>
      </React.Fragment>
    );
  }
}

const instancedCameraState = {
  ...DEFAULT_CAMERA_STATE,
  phi: 1.625,
  thetaOffset: 0.88,
  target: [20, 20, 100],
  perspective: true,
};

storiesOf("Worldview", module)
  .add(
    "<Cubes> - single",
    withRange((range) => {
      const marker = cube(range);
      return (
        <Container cameraState={{ ...DEFAULT_CAMERA_STATE, perspective: true }}>
          <Wrapper cubes={[marker]} />
        </Container>
      );
    })
  )
  .add(
    "<Cubes> - instanced",
    withRange((range) => {
      const cube = {
        id: 1,
        pose: {
          orientation: UNIT_QUATERNION,
          position: { x: range, y: range, z: range },
        },
        points: buildMatrix(20, 20, 20, 20),
        scale: p(range + 0.1),
        color: { r: 1, g: 0, b: 1, a: 1 },
      };
      return (
        <Container cameraState={instancedCameraState}>
          <Cubes>{[cube]}</Cubes>
        </Container>
      );
    })
  )
  .add(
    "<Cubes> - per-instance colors",
    withRange((range) => {
      const points = buildMatrix(20, 20, 20, 20);
      window.cubeColors = window.cubeColors || points.map(() => ({ r: rng(), g: rng(), b: rng(), a: 1 }));
      const cube = {
        id: 1,
        pose: {
          orientation: UNIT_QUATERNION,
          position: { x: range, y: range, z: range },
        },
        points,
        scale: p(1),
        colors: window.cubeColors,
      };
      return (
        <Container cameraState={instancedCameraState}>
          <Cubes>{[cube]}</Cubes>
        </Container>
      );
    })
  );
