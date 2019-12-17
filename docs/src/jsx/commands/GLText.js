//  Copyright (c) 2018-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

// #BEGIN EXAMPLE
import { useAnimationFrame } from "@cruise-automation/hooks";
import React, { useState, useRef, useEffect } from "react";
import Worldview, { GLText, DEFAULT_CAMERA_STATE } from "regl-worldview";

// #BEGIN EDITABLE
function Example() {
  const NUM_COLS = 200;
  const RADIUS = 30;
  const ALPHABET = [].concat(
    ...[[0x30, 0x39], [0x41, 0x5a], [0x410, 0x42f], [0x3041, 0x3096]].map(([start, end]) =>
      new Array(end - start + 1).fill().map((_, i) => String.fromCodePoint(start + i))
    )
  );
  const GLITCH_PROB = 0.3;
  const FADE = 3;
  const STEP_INTERVAL = 100;
  const CHAR_HEIGHT = 1.1;
  class MatrixText {
    constructor() {
      this._cols = [];

      for (let i = 0; i < NUM_COLS; i++) {
        this.spawnCol();
      }
    }
    spawnCol() {
      const r = RADIUS * Math.sqrt(Math.random());
      const theta = 2 * Math.PI * Math.random();
      const z = RADIUS * 2 * (Math.random() - 0.5);
      this._cols.push({
        minZ: -RADIUS + (z + RADIUS) * Math.random(),
        x: r * Math.cos(theta),
        y: r * Math.sin(theta),
        z,
        chars: [{ age: 0, char: this.randomChar() }],
      });
    }
    frame(dt) {
      const glitchProb = Math.exp(-GLITCH_PROB * dt) * GLITCH_PROB * dt;
      for (const { chars } of this._cols) {
        for (const char of chars) {
          char.age += dt;
          if (Math.random() < glitchProb) {
            char.char = this.randomChar();
          }
        }
      }
    }
    randomChar() {
      return ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
    }
    step() {
      const newCols = [];
      for (const col of this._cols) {
        if (Math.random() > GLITCH_PROB && col.z - col.chars.length * CHAR_HEIGHT > col.minZ) {
          col.chars.push({ age: 0, char: this.randomChar() });
        }
        const firstKeepIdx = col.chars.findIndex(({ age }) => age < FADE);
        if (firstKeepIdx === -1) {
          this.spawnCol();
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
        for (const { age, char } of chars) {
          const newness = Math.exp((-age / FADE) * 10);
          const oldness = Math.exp((-(age - 1) / FADE) * 10);
          markers.push({
            text: char,
            colors: [{ r: newness, g: oldness, b: newness, a: oldness }, { r: 0, g: 0, b: 0, a: 1 }],
            pose: {
              position: { x, y, z: z - i * CHAR_HEIGHT },
              orientation: { x: 0, y: 0, z: 0, w: 1 },
            },
            scale: { x: 1, y: 1, z: 1 },
          });
          i++;
        }
      }
      return markers;
    }
  }

  const [matrix] = useState(() => new MatrixText());
  const [cameraState, setCameraState] = useState(DEFAULT_CAMERA_STATE);

  const lastUpdate = useRef();
  const fpsMeter = useRef();
  useAnimationFrame(
    (timestamp) => {
      if (lastUpdate.current != null) {
        const dt = (timestamp - lastUpdate.current) / 1000;
        if (fpsMeter.current) {
          fpsMeter.current.innerText = `${(1 / dt).toFixed()}fps`;
        }
        matrix.frame(dt);
        setCameraState((state) => ({
          ...state,
          thetaOffset: state.thetaOffset + 0.2 * dt,
          phi: Math.PI / 2 + 0.1 * Math.sin((2 * Math.PI * (timestamp / 1000)) / 10),
        }));
      }
      lastUpdate.current = timestamp;
    },
    false,
    []
  );
  useEffect(
    () => {
      const id = setInterval(() => {
        matrix.step();
      }, STEP_INTERVAL);
      return () => {
        clearInterval(id);
      };
    },
    [matrix]
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
      <div style={{ position: "absolute", top: 20, left: 20, fontSize: 20, color: "red" }} ref={fpsMeter} />
      <GLText>{matrix.toMarkers()}</GLText>
    </Worldview>
  );
}
// #END EXAMPLE

export default Example;
