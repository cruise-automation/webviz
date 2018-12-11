//  Copyright (c) 2018-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import React, { useState } from 'react';
import Worldview, { Cylinders, Axes, DEFAULT_CAMERA_STATE } from 'regl-worldview';
import { p } from './utils';
import useRange from './useRange';
import ConeControls from './ConeControls';

// #BEGIN EXAMPLE
function CylindersDemo() {
  const range = useRange();
  const [scaleX, setScaleX] = useState(3);
  const [scaleY, setScaleY] = useState(3);
  const [scaleZ, setScaleZ] = useState(10);
  const marker = {
    pose: {
      orientation: { x: 0, y: 0, z: 0, w: 1 },
      position: { x: 0, y: 0, z: 0 },
    },
    scale: p(scaleX, scaleY, scaleZ),
    color: { r: 1 - range * 0.5, g: range, b: 1, a: 1 - range * 0.3 },
  };

  return (
    <div style={{ height: 500 }}>
      <Worldview defaultCameraState={{ ...DEFAULT_CAMERA_STATE, perspective: true }}>
        <ConeControls
          style={{
            position: 'absolute',
            right: 0,
            top: 0,
          }}
          min={0.5}
          max={20}
          step={1}
          scaleX={scaleX}
          setScaleX={setScaleX}
          scaleY={scaleY}
          setScaleY={setScaleY}
          scaleZ={scaleZ}
          setScaleZ={setScaleZ}
        />
        <Cylinders>{[marker]}</Cylinders>
        <Axes />
      </Worldview>
    </div>
  );
}
// #END EXAMPLE

export default CylindersDemo;
