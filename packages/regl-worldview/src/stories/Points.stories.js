//  Copyright (c) 2018-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { storiesOf } from "@storybook/react";
import React from "react";

import Worldview, { Points, Cubes } from "../index";

storiesOf("Worldview/Points", module)
  .add("<Points> - Many points in screen space", () => {
    const x = 5;
    const y = x;
    const z = x;
    const step = 10;
    const points = [];
    const colors = [];
    for (let i = 0; i < x; i++) {
      for (let j = 0; j < y; j++) {
        for (let k = 0; k < z; k++) {
          points.push({ x: i * step, y: j * step, z: k * step });
          colors.push({ r: 1 - (1 + i) / x, g: 1 - (1 + j) / y, b: (1 + k) / z, a: 1 });
        }
      }
    }

    const scaleX = 10;
    const marker = {
      points,
      colors,
      scale: { x: scaleX, y: scaleX, z: scaleX },
      color: { r: 1, g: 1, b: 1, a: 1 },
      pose: { position: { x: 0, y: 0, z: 0 }, orientation: { x: 0, y: 0, z: 0, w: 1 } },
    };

    return (
      <Worldview
        defaultCameraState={{
          distance: 100,
          phi: 1,
          thetaOffset: 0.7071,
          targetOffset: [0, 0, 30],
          perspective: true,
        }}>
        <Points>{[marker]}</Points>
      </Worldview>
    );
  })
  .add("<Points> - World size matches unit cube (orthographic)", () => {
    return (
      <Worldview
        defaultCameraState={{
          distance: 3,
          phi: 0.5 * Math.PI,
          targetOffset: [0, 0, 0],
          perspective: false,
        }}>
        <Points useWorldSpaceSize={true}>
          {[
            {
              points: [{ x: 0, y: 0, z: 0 }],
              scale: { x: 1, y: 1, z: 1 },
              color: { r: 1, g: 1, b: 0, a: 0.5 },
              pose: {
                position: { x: 0, y: 0, z: 0 },
                orientation: { x: 0, y: 0, z: 0, w: 1 },
              },
            },
          ]}
        </Points>
        <Cubes>
          {[
            {
              pose: {
                orientation: { x: 0, y: 0, z: 0, w: 1 },
                position: { x: 0, y: 0, z: 0 },
              },
              scale: { x: 1, y: 1, z: 1 },
              color: { r: 1, g: 0, b: 1, a: 0.5 },
            },
          ]}
        </Cubes>
      </Worldview>
    );
  })
  .add("<Points> - World size matches unit cube (perspective)", () => {
    return (
      <Worldview
        defaultCameraState={{
          distance: 3,
          phi: 0.5 * Math.PI,
          targetOffset: [0, 0, 0],
          perspective: true,
        }}>
        <Points useWorldSpaceSize={true}>
          {[
            {
              points: [{ x: 0, y: 0, z: 0 }],
              scale: { x: 1, y: 1, z: 1 },
              color: { r: 1, g: 1, b: 0, a: 0.5 },
              pose: {
                position: { x: 0, y: 0, z: 0 },
                orientation: { x: 0, y: 0, z: 0, w: 1 },
              },
            },
          ]}
        </Points>
        <Cubes>
          {[
            {
              pose: {
                orientation: { x: 0, y: 0, z: 0, w: 1 },
                position: { x: 0, y: 0, z: 0 },
              },
              scale: { x: 1, y: 1, z: 1 },
              color: { r: 1, g: 0, b: 1, a: 0.5 },
            },
          ]}
        </Cubes>
      </Worldview>
    );
  })
  .add("<Points> - World size matches non-unit cube (orthographic)", () => {
    const scaleX = 0.5;
    return (
      <Worldview
        defaultCameraState={{
          distance: 3,
          phi: 0.5 * Math.PI,
          targetOffset: [0, 0, 0],
          perspective: false,
        }}>
        <Points useWorldSpaceSize={true}>
          {[
            {
              points: [{ x: 0, y: 0, z: 0 }],
              scale: { x: scaleX, y: scaleX, z: scaleX },
              color: { r: 1, g: 1, b: 0, a: 0.5 },
              pose: {
                position: { x: 0, y: 0, z: 0 },
                orientation: { x: 0, y: 0, z: 0, w: 1 },
              },
            },
          ]}
        </Points>
        <Cubes>
          {[
            {
              pose: {
                orientation: { x: 0, y: 0, z: 0, w: 1 },
                position: { x: 0, y: 0, z: 0 },
              },
              scale: { x: scaleX, y: scaleX, z: scaleX },
              color: { r: 1, g: 0, b: 1, a: 0.5 },
            },
          ]}
        </Cubes>
      </Worldview>
    );
  })
  .add("<Points> - World size matches non-unit cube (perspective)", () => {
    const scaleX = 0.5;
    return (
      <Worldview
        defaultCameraState={{
          distance: 3,
          phi: 0.5 * Math.PI,
          targetOffset: [0, 0, 0],
          perspective: true,
        }}>
        <Points useWorldSpaceSize={true}>
          {[
            {
              points: [{ x: 0, y: 0, z: 0 }],
              scale: { x: scaleX, y: scaleX, z: scaleX },
              color: { r: 1, g: 1, b: 0, a: 0.5 },
              pose: {
                position: { x: 0, y: 0, z: 0 },
                orientation: { x: 0, y: 0, z: 0, w: 1 },
              },
            },
          ]}
        </Points>
        <Cubes>
          {[
            {
              pose: {
                orientation: { x: 0, y: 0, z: 0, w: 1 },
                position: { x: 0, y: 0, z: 0 },
              },
              scale: { x: scaleX, y: scaleX, z: scaleX },
              color: { r: 1, g: 0, b: 1, a: 0.5 },
            },
          ]}
        </Cubes>
      </Worldview>
    );
  })
  .add("<Points> - Many points in world space, with cubes for reference", () => {
    const x = 5;
    const y = x;
    const z = x;
    const step = 10;
    const points = [];
    const colors = [];
    for (let i = 0; i < x; i++) {
      for (let j = 0; j < y; j++) {
        for (let k = 0; k < z; k++) {
          points.push({ x: i * step, y: j * step, z: k * step });
          colors.push({ r: 1 - (1 + i) / x, g: 1 - (1 + j) / y, b: (1 + k) / z, a: 1 });
        }
      }
    }

    const scaleX = 2;
    const marker = {
      points,
      colors,
      scale: { x: scaleX, y: scaleX, z: scaleX },
      color: { r: 1, g: 1, b: 1, a: 1 },
      pose: { position: { x: 0, y: 0, z: 0 }, orientation: { x: 0, y: 0, z: 0, w: 1 } },
    };

    return (
      <Worldview
        defaultCameraState={{
          distance: 20,
          phi: 1,
          thetaOffset: 0.7071,
          targetOffset: [0, 0, 30],
          perspective: true,
        }}>
        <Points useWorldSpaceSize={true}>{[marker]}</Points>
        <Cubes>
          {points.map((p) => ({
            pose: {
              orientation: { x: 0, y: 0, z: 0, w: 1 },
              position: p,
            },
            scale: { x: scaleX, y: scaleX, z: scaleX },
            color: { r: 1, g: 0, b: 1, a: 0.2 },
          }))}
        </Cubes>
      </Worldview>
    );
  });
