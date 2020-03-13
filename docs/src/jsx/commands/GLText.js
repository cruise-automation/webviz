//  Copyright (c) 2018-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

// #BEGIN EXAMPLE
import { useAnimationFrame } from "@cruise-automation/hooks";
import { quat } from "gl-matrix";
import React, { useState, useRef } from "react";
import Worldview, { GLText, DEFAULT_CAMERA_STATE } from "regl-worldview";
import seedrandom from "seedrandom";

import { inScreenshotTests } from "../utils/codeSandboxUtils";

// #BEGIN EDITABLE
const rng = seedrandom(1999); // pseudo-random generator for deterministic testing!
const NUM_COLS = 200; // number of text columns to draw - try bumping this up!
const RADIUS = 30; // distance from the origin for placing columns
const GLITCH_PROBABILITY = 0.3; // how likely a character is to change to something else
const FADE = 3; // how quickly each character fades out
const CHAR_HEIGHT = 1.1; // vertical space between characters
const STEP_INTERVAL = 100; // how often the code rain "falls"
const ALPHABET = [].concat(
  // all characters to pick from
  ...[[0x30, 0x39], [0x41, 0x5a], [0x410, 0x42f], [0x3041, 0x3096]].map(([start, end]) =>
    new Array(end - start + 1).fill().map((_, i) => String.fromCodePoint(start + i))
  )
);

function randomChar() {
  return ALPHABET[Math.floor(rng() * ALPHABET.length)];
}

class MatrixText {
  constructor() {
    this._cols = new Array(NUM_COLS).fill().map(() => this.newColumn());
  }

  newChar() {
    return {
      age: 0,
      char: randomChar(),
      spinOffset: 2 * Math.PI * rng(),
      spinSpeed: 0.5 * (rng() - 0.5),
    };
  }

  newColumn() {
    const r = RADIUS * Math.sqrt(rng());
    const theta = 2 * Math.PI * rng();
    const z = RADIUS * 2 * (rng() - 0.5);
    return {
      minZ: -RADIUS + (z + RADIUS) * rng(),
      x: r * Math.cos(theta),
      y: r * Math.sin(theta),
      z,
      chars: [this.newChar()],
    };
  }

  // Fade out the characters a little bit on each animation frame.
  frame(dt) {
    for (const { chars } of this._cols) {
      for (const char of chars) {
        char.age += dt;
        if (rng() < GLITCH_PROBABILITY * dt) {
          char.char = randomChar();
        }
      }
    }
  }

  // Drop a new character at the bottom of each column.
  // If the column is old, replace it with a new one.
  step() {
    this._cols = this._cols.map((col) => {
      if (rng() > GLITCH_PROBABILITY && col.z - col.chars.length * CHAR_HEIGHT > col.minZ) {
        col.chars.push(this.newChar());
      }
      const firstKeepIdx = col.chars.findIndex(({ age }) => age < FADE);
      if (firstKeepIdx === -1) {
        return this.newColumn();
      }
      col.chars.splice(0, firstKeepIdx);
      col.z -= CHAR_HEIGHT * firstKeepIdx;
      return col;
    });
  }

  // Convert to markers that we can pass in to <GLText />.
  toMarkers() {
    const markers = [];
    for (const { x, y, z, chars } of this._cols) {
      chars.forEach(({ age, char, spinOffset, spinSpeed }, i) => {
        const newness = 1 / (1 + Math.exp(((age - 0.5) / FADE) * 20));
        const oldness = 1 / (1 + Math.exp(((age - 1.5) / FADE) * 20));
        const spin = quat.create();
        quat.rotateZ(spin, spin, spinOffset + age * spinSpeed * 2 * Math.PI);
        quat.rotateX(spin, spin, Math.PI / 2);
        markers.push({
          text: char,
          colors: [{ r: newness, g: oldness, b: newness, a: oldness }, { r: 0, g: 0, b: 0, a: oldness }],
          pose: {
            position: { x, y, z: z - i * CHAR_HEIGHT },
            orientation: { x: spin[0], y: spin[1], z: spin[2], w: spin[3] },
          },
          scale: { x: 1, y: 1, z: 1 },
          billboard: false,
        });
      });
    }
    return markers;
  }
}

function Example() {
  const [matrix] = useState(() => {
    const matrix = new MatrixText();
    // For screenshot tests we don't start the timer, so just run a few steps explicitly.
    if (inScreenshotTests()) {
      for (let i = 0; i < 10; i++) {
        matrix.frame(STEP_INTERVAL / 1000);
        matrix.step();
      }
    }
    return matrix;
  });
  const [cameraState, setCameraState] = useState({
    ...DEFAULT_CAMERA_STATE,
    distance: RADIUS * 2,
    phi: Math.PI / 2,
  });

  const lastFrameTime = useRef();
  const lastStepTime = useRef();
  const fpsMeter = useRef();
  useAnimationFrame(
    (timestamp) => {
      if (lastStepTime.current == null || timestamp - lastStepTime.current > STEP_INTERVAL) {
        matrix.step();
        lastStepTime.current = timestamp;
      }
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
    inScreenshotTests(),
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
      <GLText alphabet={ALPHABET} resolution={40}>
        {matrix.toMarkers()}
      </GLText>
      <div ref={fpsMeter} style={{ position: "absolute", top: 20, left: 20, fontSize: 20, color: "red" }} />
    </Worldview>
  );
}

// #DOCS ONLY: render(<Example />);

// #END EXAMPLE

export default Example;
