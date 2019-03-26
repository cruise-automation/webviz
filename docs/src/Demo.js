//  Copyright (c) 2018-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import React, { useState } from "react";
import { Link } from "react-router-dom";
import styled from "styled-components";

import Slider from "./jsx/utils/Slider";
import { color } from "./jsx/utils/theme";
import WorldviewCodeEditor from "./jsx/utils/WorldviewCodeEditor";

const Container = styled.div`
  display: flex;
  flex-wrap: wrap;
  margin-bottom: 30px;
  margin-left: -20px;
  margin-right: -20px;

  > div {
    width: 50%;
    padding: 20px 80px 20px 20px;
    font-size: 20px;

    h3 {
      font-weight: normal;
      font-size: 24px;
      margin-bottom: 15px;
    }

    p {
      opacity: 0.6;
    }

    label {
      margin: 24px 0;
      display: flex;
      align-items: center;
      font-size: 16px;
      color: ${color.label};
    }
  }

  @media only screen and (max-width: 940px) {
    > div {
      width: 100%;
      padding: 20px;
    }
  }
`;

const HelloWorldview = () => {
  const [spheresPerAxis, setSpheresPerAxis] = useState(6);
  const [distance, setDistance] = useState(30);

  return (
    <React.Fragment>
      <Container>
        <div>
          <h3 className="monospace">Rendering objects</h3>
          <p>
            Place objects in the scene by passing them as children of the Worldview component. Worldview provides
            built-in <Link to="/docs">commands</Link> for rendering points, spheres, lines, and more.
          </p>
          <label className="monospace">
            <Slider min={3} max={10} value={spheresPerAxis} onChange={setSpheresPerAxis} />
            {spheresPerAxis * spheresPerAxis * spheresPerAxis} spheres
          </label>
        </div>
        <div>
          <h3 className="monospace">Moving the camera</h3>
          <p>
            Worldview’s camera tracks a “target” object and its heading in the x-y plane. Additional properties control
            the camera’s distance and offset from the target in spherical coordinates.
          </p>
          <label className="monospace">
            <Slider min={10} max={70} value={distance} step={10} onChange={setDistance} />
            {distance} distance from target
          </label>
        </div>
      </Container>
      <WorldviewCodeEditor
        height={750}
        componentName=""
        code={`
function Example() {
  const n = ${spheresPerAxis};
  const points = [], colors = [];
  for (let x = 0; x < n; x++) {
    for (let y = 0; y < n; y++) {
      for (let z = 0; z < n; z++) {
        points.push({ x: x/n*10-5, y: y/n*10-5, z: z/n*10-5 });
        colors.push({ r: z/n, g: y/n, b: x/n, a: 0.8});
      }
    }
  }

  return (
    <Worldview
      defaultCameraState={{
        distance: ${distance},
        phi: Math.PI / 4,
        target: [0, 0, 0],
        targetOffset: [0, 0, 0],
        targetOrientation: [0, 0, 0, 1],
        thetaOffset: Math.PI / 4,
        perspective: true,
      }}>
      <Spheres>
        {{
          points,
          colors,
          pose: {
            position: { x: 0, y: 0, z: 0 },
            orientation: { x: 0, y: 0, z: 0, w: 1 },
          },
          scale: { x: 0.5, y: 0.5, z: 0.5 },
        }}
      </Spheres>
    </Worldview>
  );
}`}
        nonEditableCode={`
import React from 'react';
import { Worldview, Spheres } from 'regl-worldview'`}
        hideNonEditableCode
      />
    </React.Fragment>
  );
};

export default HelloWorldview;
