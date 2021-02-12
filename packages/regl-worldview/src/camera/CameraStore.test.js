// @flow

//  Copyright (c) 2018-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { vec3, quat } from "gl-matrix";

import CameraStore, { selectors, DEFAULT_CAMERA_STATE } from "./CameraStore";

class NearlyEqual {
  value: number;
  $$typeof = Symbol.for("jest.asymmetricMatcher");

  constructor(value: number) {
    this.value = value;
  }

  asymmetricMatch(other: number) {
    return Math.abs(other - this.value) < 1e-10;
  }

  getExpectedType() {
    return "number";
  }

  toAsymmetricMatcher() {
    return `NearlyEqual(${this.value})`;
  }
}

const nearlyZero = new NearlyEqual(0);

describe("camera store", () => {
  it("camera zoom in by percentage", () => {
    const store = new CameraStore();
    const initialState = store.state;
    const distance = vec3.distance(selectors.position(store.state), initialState.target);
    expect(distance).toBeCloseTo(75);
    store.cameraZoom(10);
    expect(vec3.distance(selectors.position(store.state), store.state.target)).toBeCloseTo(75 * 0.9);
  });

  it("camera zooms out by percentage", () => {
    const store = new CameraStore();
    const initialState = store.state;
    const distance = vec3.distance(selectors.position(store.state), initialState.target);
    expect(distance).toBeCloseTo(75);
    store.cameraZoom(-30);
    expect(vec3.distance(selectors.position(store.state), store.state.target)).toBeCloseTo(75 * 1.3);
  });

  it("does not zoom in more than 100%", () => {
    const store = new CameraStore();
    const initialState = store.state;
    const distance = vec3.distance(selectors.position(store.state), initialState.target);

    expect(distance).toBeCloseTo(75);
    store.cameraZoom(1000);
    expect(vec3.distance(selectors.position(store.state), store.state.target)).toBeCloseTo(0);
    store.cameraZoom(1);
    expect(vec3.distance(selectors.position(store.state), store.state.target)).toBeCloseTo(0);
    store.cameraZoom(-10);
    expect(vec3.distance(selectors.position(store.state), store.state.target)).toBeGreaterThan(0);
  });

  it("does not zoom infinitely small", () => {
    const store = new CameraStore();
    for (let i = 0; i < 1000; i++) {
      store.cameraZoom(100);
    }
    const dist = vec3.distance(selectors.position(store.state), store.state.target);
    expect(dist).toBeGreaterThan(0);
    expect(dist).toBeLessThanOrEqual(0.001);
  });

  describe("targetOffset", () => {
    it("is initially zero", () => {
      const store = new CameraStore();
      expect(vec3.distance(store.state.target, [0, 0, 0])).toBeCloseTo(0);
      expect(vec3.distance(store.state.targetOffset, [0, 0, 0])).toBeCloseTo(0);
    });

    it("is adjusted when moving the target", () => {
      const store = new CameraStore();
      store.cameraMove([2, 1]);
      expect(vec3.distance(store.state.target, [0, 0, 0])).toBeCloseTo(0);
      expect(vec3.distance(store.state.targetOffset, [2, 1, 0])).toBeCloseTo(0);

      store.cameraMove([1, 1]);
      expect(vec3.distance(store.state.target, [0, 0, 0])).toBeCloseTo(0);
      expect(vec3.distance(store.state.targetOffset, [3, 2, 0])).toBeCloseTo(0);
    });

    it("is changed in setTarget and defaults to existing value", () => {
      const store = new CameraStore();
      store.cameraMove([2, 1]);
      expect(vec3.distance(store.state.target, [0, 0, 0])).toBeCloseTo(0);
      expect(vec3.distance(store.state.targetOffset, [2, 1, 0])).toBeCloseTo(0);

      store.setCameraState({
        ...store.state,
        target: [1, 1, 1],
        targetOffset: [4, 3, 0],
      });

      expect(vec3.distance(store.state.target, [1, 1, 1])).toBeCloseTo(0);
      expect(vec3.distance(store.state.targetOffset, [4, 3, 0])).toBeCloseTo(0);

      store.setCameraState({
        ...store.state,
        target: [2, 2, 2],
      });
      expect(vec3.distance(store.state.target, [2, 2, 2])).toBeCloseTo(0);
      expect(vec3.distance(store.state.targetOffset, [4, 3, 0])).toBeCloseTo(0);
    });
  });

  describe("cameraState", () => {
    const cameraState = {
      thetaOffset: 0.32,
      phi: 0.8,
      distance: 56,
      target: [0, 0, 0],
      targetOffset: [0, 0, 0],
      targetOrientation: [0, 0, 0, 1],
      perspective: false,
      fovy: Math.PI / 3,
      near: 0.2,
      far: 1000,
    };
    let store;

    describe("initial store state", () => {
      it("initialize cameraState by cameraState input", () => {
        store = new CameraStore(undefined, cameraState);
        expect(store.state).toEqual(cameraState);
      });

      it("has missing properties filled in from DEFAULT_CAMERA_STATE", () => {
        store = new CameraStore(undefined, { near: 10 });
        expect(store.state).toEqual({ ...DEFAULT_CAMERA_STATE, near: 10 });
      });
    });

    it("has missing properties filled in from DEFAULT_CAMERA_STATE on update", () => {
      store = new CameraStore(undefined, cameraState);
      store.setCameraState({ near: 10 });
      expect(store.state).toEqual({ ...DEFAULT_CAMERA_STATE, near: 10 });
    });

    it("has null properties filled in from DEFAULT_CAMERA_STATE", () => {
      // Null properties are not allowed according to the Flow types,
      // but CameraStore should handle them anyway.
      store = new CameraStore(undefined, ({ near: null, far: undefined, fovy: 0 }: any));
      expect(store.state).toEqual({ ...DEFAULT_CAMERA_STATE, fovy: 0 });
      store.setCameraState(({ near: 0, far: null, fovy: undefined }: any));
      expect(store.state).toEqual({ ...DEFAULT_CAMERA_STATE, near: 0 });
    });
  });

  describe("selectors", () => {
    const camState = {
      thetaOffset: Math.PI / 2,
      phi: 0,
      distance: 56,
      target: [0, 0, 0],
      targetOffset: [0, 0, 0],
      targetOrientation: [0, 0, 0, 1],
      perspective: false,
      fovy: Math.PI / 3,
      near: 0.2,
      far: 1000,
    };

    it("orientation selector returns camera orientation", () => {
      expect(selectors.orientation(camState)).toEqual([0, 0, -0.7071067811865475, 0.7071067811865476]);
    });

    it("position selector returns camera position", () => {
      expect(selectors.position(camState)).toEqual([nearlyZero, nearlyZero, 56]);
    });

    it("targetHeading selector returns the correct theta based on targetOrientation", () => {
      let output = selectors.targetHeading(camState);
      expect(output).toBeCloseTo(0, 2);
      output = selectors.targetHeading({
        ...camState,
        targetOrientation: [1, 0.4, 0, 1],
      });
      expect(output).toBeCloseTo(-0.87, 2);
    });

    it("view selector ", () => {
      expect(selectors.view(camState)).toEqual([nearlyZero, 1, 0, 0, -1, nearlyZero, 0, 0, 0, 0, 1, 0, 0, 0, -2500, 1]);
    });

    it("target offset is relative to target orientation", () => {
      //  |
      //  +---T------*
      //             C
      const view1 = selectors.view({
        thetaOffset: 0,
        phi: 0,
        distance: 3,
        target: [2, 0, 0],
        targetOffset: [25, 0, 0],
        targetOrientation: [0, 0, 0, 1],
        perspective: true,
        fovy: Math.PI / 2,
        near: 0.01,
        far: 10000,
      });

      expect(vec3.transformMat4([0, 0, 0], [2, 0, 0], view1)).toEqual([-25, 0, -3]);
      expect(vec3.transformMat4([0, 0, 0], [2 + 25, 0, 0], view1)).toEqual([0, 0, -3]);

      // Rotate target around the z axis. Target stays in the same position in camera coords,
      // but a new point ([2,25,0] instead of [27,0,0]) is transformed to the camera's origin.

      //  |   * C
      //  |
      //  |
      //  |
      //  +---T-----
      const view2 = selectors.view({
        thetaOffset: 0,
        phi: 0,
        distance: 3,
        target: [2, 0, 0],
        targetOffset: [25, 0, 0],
        targetOrientation: quat.rotateZ([0, 0, 0, 1], [0, 0, 0, 1], Math.PI / 2),
        perspective: true,
        fovy: Math.PI / 2,
        near: 0.01,
        far: 10000,
      });
      expect(vec3.transformMat4([0, 0, 0], [2, 0, 0], view2)).toEqual([-25, 0, -3]);
      expect(vec3.transformMat4([0, 0, 0], [2, 25, 0], view2)).toEqual([0, nearlyZero, -3]);
    });

    it("follows target orientation in yaw only", () => {
      const view1 = selectors.view({
        thetaOffset: 0,
        phi: 0,
        distance: 3,
        target: [2, 0, 0],
        targetOffset: [25, 0, 0],
        targetOrientation: [0, 0, 0, 1],
        perspective: true,
        fovy: Math.PI / 2,
        near: 0.01,
        far: 10000,
      });

      expect(vec3.transformMat4([0, 0, 0], [2, 0, 0], view1)).toEqual([-25, 0, -3]);
      expect(vec3.transformMat4([0, 0, 0], [2 + 25, 0, 0], view1)).toEqual([0, 0, -3]);

      const view2 = selectors.view({
        thetaOffset: 0,
        phi: 0,
        distance: 3,
        target: [2, 0, 0],
        targetOffset: [25, 0, 0],
        targetOrientation: quat.rotateX([0, 0, 0, 1], [0, 0, 0, 1], Math.PI / 8),
        perspective: true,
        fovy: Math.PI / 2,
        near: 0.01,
        far: 10000,
      });
      expect(vec3.transformMat4([0, 0, 0], [2, 0, 0], view2)).toEqual([-25, 0, -3]);
      expect(vec3.transformMat4([0, 0, 0], [2 + 25, 7, 0], view2)).toEqual([0, 7, -3]);
    });
  });
});
