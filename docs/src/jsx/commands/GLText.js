//  Copyright (c) 2018-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

// #BEGIN EXAMPLE
import { useAnimationFrame } from "@cruise-automation/hooks";
import { quat } from "gl-matrix";
import React, { useState, useRef, useEffect } from "react";
import Worldview, { GLText, DEFAULT_CAMERA_STATE } from "regl-worldview";

// #BEGIN EDITABLE
const NUM_COLS = 200;
const RADIUS = 30;
const ALPHABET = [].concat(
  ...[[0x30, 0x39], [0x41, 0x5a], [0x410, 0x42f], [0x3041, 0x3096]].map(([start, end]) =>
    new Array(end - start + 1).fill().map((_, i) => String.fromCodePoint(start + i))
  )
);
const GLITCH_PROBABILITY = 0.3;
const FADE = 3;
const CHAR_HEIGHT = 1.1;
const STEP_INTERVAL = 100;

function randomChar() {
  return ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
}

class MatrixText {
  constructor() {
    this._cols = [];
    for (let i = 0; i < NUM_COLS; i++) {
      this.addColumn();
    }
  }

  newChar() {
    return {
      age: 0,
      char: randomChar(),
      spinOffset: 2 * Math.PI * Math.random(),
      spinSpeed: 0.5 * (Math.random() - 0.5),
    };
  }

  addColumn() {
    const r = RADIUS * Math.sqrt(Math.random());
    const theta = 2 * Math.PI * Math.random();
    const z = RADIUS * 2 * (Math.random() - 0.5);
    this._cols.push({
      minZ: -RADIUS + (z + RADIUS) * Math.random(),
      x: r * Math.cos(theta),
      y: r * Math.sin(theta),
      z,
      chars: [this.newChar()],
    });
  }

  frame(dt) {
    for (const { chars } of this._cols) {
      for (const char of chars) {
        char.age += dt;
        if (Math.random() < GLITCH_PROBABILITY * dt) {
          char.char = randomChar();
        }
      }
    }
  }

  step() {
    const newCols = [];
    for (const col of this._cols) {
      if (Math.random() > GLITCH_PROBABILITY && col.z - col.chars.length * CHAR_HEIGHT > col.minZ) {
        col.chars.push(this.newChar());
      }
      const firstKeepIdx = col.chars.findIndex(({ age }) => age < FADE);
      if (firstKeepIdx === -1) {
        this.addColumn();
      } else {
        col.chars.splice(0, firstKeepIdx);
        col.z -= CHAR_HEIGHT * firstKeepIdx;
        newCols.push(col);
      }
    }
    this._cols = newCols;
  }

  toMarkers() {
    const markers = [];
    for (const { x, y, z, chars } of this._cols) {
      let i = 0;
      for (const { age, char, spinOffset, spinSpeed } of chars) {
        const newness = 1 / (1 + Math.exp(((age - 0.5) / FADE) * 20));
        const oldness = 1 / (1 + Math.exp(((age - 1.5) / FADE) * 20));
        const q = quat.create();
        quat.rotateZ(q, q, spinOffset + age * spinSpeed * 2 * Math.PI);
        quat.rotateX(q, q, Math.PI / 2);
        markers.push({
          text: char,
          colors: [{ r: newness, g: oldness, b: newness, a: oldness }, { r: 0, g: 0, b: 0, a: oldness }],
          pose: {
            position: { x, y, z: z - i * CHAR_HEIGHT },
            orientation: { x: q[0], y: q[1], z: q[2], w: q[3] },
          },
          scale: { x: 1, y: 1, z: 1 },
          billboard: false,
        });
        i++;
      }
    }
    return markers;
  }
}

function useInterval(interval, fn, deps) {
  useEffect(
    () => {
      const id = setInterval(fn, interval);
      return () => clearInterval(id);
    },
    [interval, ...deps]
  );
}

function Example() {
  const [matrix] = useState(() => new MatrixText());
  const [cameraState, setCameraState] = useState({ ...DEFAULT_CAMERA_STATE, distance: RADIUS * 2 });

  const lastFrameTime = useRef();
  const fpsMeter = useRef();
  useInterval(STEP_INTERVAL, () => matrix.step(), []);
  useAnimationFrame(
    (timestamp) => {
      if (lastFrameTime.current != null) {
        const dt = (timestamp - lastFrameTime.current) / 1000;
        if (fpsMeter.current) {
          fpsMeter.current.innerText = `${(1 / dt).toFixed()}fps`;
        }

        matrix.frame(dt);
        setCameraState((state) => ({
          ...state,
          thetaOffset: state.thetaOffset + 0.05 * dt,
          phi: Math.PI / 2 + 0.1 * Math.sin(2 * Math.PI * (timestamp / 1000) * 0.02),
        }));
      }
      lastFrameTime.current = timestamp;
    },
    false,
    []
  );

  return (
    <Worldview
      cameraState={cameraState}
      onCameraStateChange={(newState) =>
        setCameraState((oldState) => ({
          ...oldState,
          ...newState,
          targetOffset: oldState.targetOffset,
          phi: oldState.phi,
        }))
      }>
      <GLText>{matrix.toMarkers()}</GLText>
      <div ref={fpsMeter} style={{ position: "absolute", top: 20, left: 20, fontSize: 20, color: "red" }} />
    </Worldview>
  );
}

// #DOCS ONLY: render(<Example />);

// #END EXAMPLE

export default Example;
