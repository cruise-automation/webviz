//  Copyright (c) 2018-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import React, { useState } from "react";
import styled from "styled-components";

import WorldviewCodeEditor from "./jsx/WorldviewCodeEditor";

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
      color: #edcc28;

      input[type="range"] {
        width: 120px;
        margin-right: 20px;
        appearance: none;
        background: transparent;
        &:focus {
          outline: 0;
        }
        &::-webkit-slider-thumb {
          appearance: none;
          height: 12px;
          width: 28px;
          border-radius: 6px;
          background: #edcc28;
          cursor: pointer;
          &:hover {
            opacity: 0.5;
          }
        }
        &::-webkit-slider-runnable-track {
          width: 100%;
          height: 16px;
          cursor: pointer;
          background: transparent;
          border: 1px solid #edcc28;
          border-radius: 8px;
          padding: 1px;
        }
      }
    }
  }

  @media only screen and (max-width: 940px) {
    > div {
      width: 100%;
      padding: 20px;
    }
  }
`;

const HelloWorldView = () => {
  const [numSpheres, setNumSpheres] = useState(1000);
  const [distance, setDistance] = useState(150);

  return (
    <React.Fragment>
      <Container>
        <div>
          <h3 className="monospace">Rendering objects</h3>
          <p>
            Place objects in the scene by passing them as children of the Worldview component. Objects are automatically
            batched by type for high performance drawing.
          </p>
          <label className="monospace">
            <input
              type="range"
              min={100}
              max={2000}
              value={numSpheres}
              step={100}
              onChange={(e) => setNumSpheres(parseInt(e.target.value))}
            />
            {numSpheres} spheres
          </label>
        </div>
        <div>
          <h3 className="monospace">Moving the camera</h3>
          <p>
            Worldview’s camera tracks a “target” object and its heading in the x-y plane. Additional properties control
            the camera’s distance and offset from the target in spherical coordinates.
          </p>
          <label className="monospace">
            <input
              type="range"
              min={0}
              max={400}
              value={distance}
              step={10}
              onChange={(e) => setDistance(parseInt(e.target.value))}
            />
            {distance} distance from target
          </label>
        </div>
      </Container>
      <WorldviewCodeEditor
        height={700}
        code={`function HelloWorldView() {
  const getRandom = (min, max) => Math.floor(Math.random() * max) + min;

  return (
    <Worldview
      defaultCameraState={{
        distance: ${distance},
        phi: Math.PI / 4,
        target: [0, 0, 0],
        targetOffset: [0, 0, 0],
        targetOrientation: [0, 0, 0, 1],
        thetaOffset: 0,
        perspective: true 
      }}
      hideDebug={true}>
      <Spheres>
        {new Array(${numSpheres}).fill().map((_, i) => ({
          pose: {
            orientation: { x: 0, y: 0, z: 0, w: 0 },
            position: { 
              x: getRandom(-50, 100), 
              y: getRandom(-50, 100), 
              z: getRandom(-50, 100) 
            },
          },
          scale: { x: 1, y: 1, z: 1 },
          color: { r: 1, g: 1, b: 1, a: 0.85 },
        }))}
      </Spheres>
    </Worldview>
  );
}`}
      />
    </React.Fragment>
  );
};

export default HelloWorldView;
