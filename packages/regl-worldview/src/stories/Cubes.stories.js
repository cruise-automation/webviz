// @flow

import { storiesOf } from "@storybook/react";
import React from "react";
import { withScreenshot } from "storybook-chrome-screenshot";

import type { MouseHandler } from "../types";
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
  phi: 1.625,
  thetaOffset: 0.88,
  target: [20, 20, 100],
  perspective: true,
};

class DynamicCubes extends React.Component<any, any> {
  state = { cubeCount: 1, cubeId: -1 };
  onContainerClick: MouseHandler = (e, clickInfo) => {
    if (clickInfo.objects.length && clickInfo.objects[0].object.id % 2) {
      this.setState({ cubeId: clickInfo.objects[0].object.id || -1 });
    }
  };

  render() {
    const { range } = this.props;
    const { cubeCount } = this.state;
    const cubes = new Array(cubeCount).fill(0).map((_, i) => {
      const marker = cube(range, i + 1);
      const { position } = marker.pose;
      const { x, y, z } = position;
      return {
        ...marker,
        color: marker.id % 2 ? [1, 1, 0, 1] : [1, 0, 0, 1],
        pose: {
          orientation: { x: 0, y: 0, z: 0, w: 1 },
          position: { x: x + i * 4, y: y + i * 4, z: z + i * 4 },
        },
      };
    });

    return (
      <Container cameraState={DEFAULT_CAMERA_STATE} onClick={this.onContainerClick}>
        <div style={{ position: "absolute", top: 30, left: 30 }}>
          <div>Only the yellow cubes should be clickable</div>
          <div>you clicked on cube: {this.state.cubeId} </div>
          <button onClick={() => this.setState({ cubeCount: cubeCount + 1 })}>Add Cube</button>
        </div>
        <Cubes>{cubes}</Cubes>
      </Container>
    );
  }
}

storiesOf("Worldview/Cubes", module)
  .addDecorator(withScreenshot())
  .add(
    "<Cubes> - single",
    withRange((range) => {
      const marker = cube(range);
      return (
        <Container cameraState={{ perspective: true }}>
          <Wrapper cubes={[marker]} />
        </Container>
      );
    })
  )
  .add(
    "<Cubes> - dynamic hitmap",
    withRange((range) => {
      return <DynamicCubes range={range} />;
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
