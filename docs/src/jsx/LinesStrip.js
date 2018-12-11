//  Copyright (c) 2018-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import React, { useState } from 'react';
import Worldview, { Lines, Points, DEFAULT_CAMERA_STATE } from 'regl-worldview';

import seedrandom from 'seedrandom';
import { p } from './utils';
import { seed } from './constants';
import LineControls from './LineControls';

// #BEGIN EXAMPLE
function LinesStripDemo() {
  const [debug, setDebug] = useState(false);
  const [thickness, setThickness] = useState(0.75);
  const [joined, setJoined] = useState(true);
  const [scaleInvariant, setScaleInvariant] = useState(false);
  const [closed, setClosed] = useState(false);
  const [monochrome, setMonochrome] = useState(false);
  const scale = { x: thickness };

  const rng = seedrandom(seed);
  const randomColor = () => {
    return { r: rng(), g: rng(), b: rng(), a: 1 };
  };

  const points = [
    p(0, 0, 0),
    p(0, 3, 0),
    p(3, 3, 0),
    p(3, 0, 0),
    p(0, 0, 0),
    p(0, 0, 3),
    p(0, 3, 3),
    p(3, 3, 3),
    p(3, 0, 3),
    p(0, 0, 3),
  ];
  for (let i = 0; i < 10; i++) {
    points.push(p(5 + 1.5 * Math.sin((Math.PI * 2 * i) / 10), i, 6));
  }
  for (let i = 20; i >= 0; i--) {
    points.push(p(5 + 1.5 * Math.sin((Math.PI * 2 * i) / 20), i * 0.5, 2));
  }
  for (let i = 0; i < 20; i++) {
    points.push(p(5, i * 0.7, 4));
  }
  points.push(p(0, 0, -6), p(0, 5, -6));
  const pose = {
    position: p(0),
    orientation: { w: 0, x: 0, y: 0, z: 0 },
  };

  const sharedProps = {
    primitive: joined ? 'line strip' : 'lines',
    scale,
    closed,
    scaleInvariant,
  };
  const markers = [
    {
      ...sharedProps,
      pose,
      points,
    },
    {
      ...sharedProps,
      pose,
      points: [p(-4, 0, 0), p(-4, -4, 0), p(-8, -3, 2), p(-4, 0, 0)],
    },
    {
      ...sharedProps,
      pose,
      points: [p(-4, 0, 0), p(-4, 0, -4), p(-6, 0, -6)],
    },
  ];

  // collect points in order to draw debug markers
  const pts = [];

  markers.forEach((marker) => {
    marker.debug = debug;
    if (monochrome) {
      marker.color = randomColor();
    } else {
      marker.colors = marker.points.map((p) => randomColor());
    }
    marker.points.forEach((point) => pts.push(point));
  });

  return (
    <div style={{ height: 500 }}>
      <Worldview
        defaultCameraState={{
          ...DEFAULT_CAMERA_STATE,
          perspective: true,
        }}>
        <LineControls
          style={{
            position: 'absolute',
            top: 0,
            right: 0,
          }}
          thickness={thickness}
          setThickness={setThickness}
          debug={debug}
          setDebug={setDebug}
          joined={joined}
          setJoined={setJoined}
          scaleInvariant={scaleInvariant}
          setScaleInvariant={setScaleInvariant}
          closed={closed}
          setClosed={setClosed}
          monochrome={monochrome}
          setMonochrome={setMonochrome}
        />
        <Lines>{markers}</Lines>
        {debug && (
          <Points>
            {[
              {
                points: [p(0)],
                scale: p(3),
                pose,
                color: { r: 0, g: 1, b: 0, a: 1 },
              },
              {
                points: pts,
                scale: p(3),
                color: { r: 1, g: 1, b: 1, a: 1 },
                pose,
              },
            ]}
          </Points>
        )}
      </Worldview>
    </div>
  );
}
// #END EXAMPLE

export default LinesStripDemo;
