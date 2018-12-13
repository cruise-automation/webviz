//  Copyright (c) 2018-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { withKnobs, boolean, number, button } from "@storybook/addon-knobs";
import { storiesOf } from "@storybook/react";
import range from "lodash/range";
import times from "lodash/times";
import polygonGenerator from "polygon-generator";
import React from "react";
import seedrandom from "seedrandom";

import Container from "./Container";
import FloatingBox from "./FloatingBox";
import hitmapStory, { StyledContainer } from "./hitmap";
import withRange from "./withRange";

import {
  Arrows,
  Axes,
  Cones,
  Cubes,
  Cylinders,
  FilledPolygons,
  Lines,
  Overlay,
  Points,
  Spheres,
  Triangles,
  DEFAULT_CAMERA_STATE,
} from "..";

const p = (x, y = x, z = x) => ({ x, y, z });
const q = (x, y = x, z = x, w = x) => ({ x, y, z, w });
let seed = 123; // fixed seed for screenshot tests.

const poseArrowMarker = {
  pose: {
    orientation: { x: 0.038269, y: -0.01677, z: -0.8394, w: 0.541905 },
    position: { x: 0, y: 0, z: 0 },
  },
  scale: p(20, 3, 3),
  color: { r: 1, g: 0, b: 1, a: 1 },
};
const pointArrowMarker = {
  color: { r: 1, g: 1, b: 1, a: 1 },
  points: [p(0, 0, 0), p(10, 10, 10)],
  scale: p(2, 2, 3),
};

const linesStory = (markerProps) => {
  const debug = boolean("debug", false);
  const perspective = boolean("is perspective", true);
  const monochrome = boolean("monochrome", false);
  button("reset colors", () => {
    seed = Math.random();
  });

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
  const markers = [
    {
      ...markerProps,
      pose,
      points,
    },
    {
      ...markerProps,
      pose,
      points: [p(-4, 0, 0), p(-4, -4, 0), p(-8, -3, 2), p(-4, 0, 0)],
    },
    {
      ...markerProps,
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
    <Container cameraState={{ ...DEFAULT_CAMERA_STATE, perspective }}>
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
    </Container>
  );
};

class Wrapper extends React.Component {
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

const cube = (range, id) => {
  const marker = {
    id,
    pose: {
      orientation: { x: 0.038269, y: -0.01677, z: -0.8394, w: 0.541905 },
      position: { x: range, y: range, z: range },
    },
    scale: p(5, 5),
    color: { r: 1, g: 0, b: 1, a: 1 },
  };
  return marker;
};

const buildMatrix = (x, y, z, step = 1) => {
  const result = [];
  for (let i = 0; i < x; i++) {
    for (let j = 0; j < y; j++) {
      for (let k = 0; k < z; k++) {
        result.push(p(i * step, j * step, k * step));
      }
    }
  }
  return result;
};

const buildSphereList = (range) => {
  const coords = buildMatrix(20, 20, 20, 10);
  const marker = {
    points: coords,
    scale: p(0.25 * (1 + range)),
    color: { r: 1, g: range, b: 1, a: 1 },
    pose: {
      position: p(3 + range),
      orientation: q(0),
    },
  };
  return marker;
};

storiesOf("Worldview", module)
  .addDecorator(withKnobs)
  .add(
    "<Cubes>",
    withRange((range) => {
      const marker = cube(range);
      return (
        <Container cameraState={{ ...DEFAULT_CAMERA_STATE, perspective: true }}>
          <Wrapper cubes={[marker]} />
        </Container>
      );
    })
  )
  .add(
    "<Spheres> - single",
    withRange((range) => {
      const marker = {
        pose: {
          orientation: { x: 0.038269, y: -0.01677, z: -0.8394, w: 0.541905 },
          position: { x: 0, y: 0, z: 0 },
        },
        scale: { x: 5, y: 5, z: 5 },
        color: { r: 1, g: 0, b: 1, a: 1 - range },
      };
      return (
        <Container cameraState={{ ...DEFAULT_CAMERA_STATE, perspective: true }}>
          <Spheres>
            {[
              marker,
              {
                ...marker,
                pose: { ...marker.pose, position: { x: 10, y: 10, z: 10 } },
                color: { r: 1, g: 0, b: 1, a: range },
              },
            ]}
          </Spheres>
        </Container>
      );
    })
  )
  .add(
    "<Spheres> - instanced",
    withRange((range) => {
      return (
        <Container cameraState={{ ...DEFAULT_CAMERA_STATE, perspective: true }}>
          <Spheres>{[buildSphereList(range)]}</Spheres>
        </Container>
      );
    })
  )
  .add(
    "<Spheres> - per-instance colors",
    withRange((range) => {
      const coords = buildMatrix(20, 20, 20, 10);
      const rng = seedrandom(seed);
      window.colors =
        window.colors ||
        coords.map((coord, i) => {
          return { r: rng(), g: rng(), b: rng(), a: 1 };
        });

      const marker = {
        points: coords,
        scale: p(0.25),
        colors: window.colors,
        pose: {
          position: p(3),
          orientation: q(0),
        },
      };
      return (
        <Container
          cameraState={{
            ...DEFAULT_CAMERA_STATE,
            perspective: true,
            target: [20, 20, 100],
          }}>
          <Spheres>{[marker]}</Spheres>
        </Container>
      );
    })
  )
  .add(
    "<Points>",
    withRange((range) => {
      const cloud = buildMatrix(3 + range * 2, 3 + range * 2, 3 + range * 2);
      const marker = {
        points: cloud,
        scale: p(1 * (3 * range)),
        color: { r: 1, g: range, b: 1, a: 1 },
        pose: {
          position: p(3 + range),
          orientation: q(0),
        },
      };

      return (
        <Container
          cameraState={{
            ...DEFAULT_CAMERA_STATE,
            perspective: true,
            distance: 20,
            targetOffset: [6, 10, 0],
          }}>
          <Points>{[marker]}</Points>
        </Container>
      );
    })
  )
  .add("<Lines> - line strip", () => {
    const thickness = number("thickness", 0.75, {
      range: true,
      min: 0,
      max: 5,
      step: 0.01,
    });
    const primitive = boolean("joined", true) ? "line strip" : "lines";
    const scaleInvariant = boolean("scaleInvariant", false);
    const closed = boolean("closed", false);

    const scale = { x: thickness };
    return linesStory({
      primitive,
      scale,
      closed,
      scaleInvariant,
    });
  })
  .add("<Lines> - instability", () => {
    const points = [
      { x: -812.2277333190451, y: 2961.4633761946707, z: 0 },
      { x: -812.2718382693613, y: 2960.8755785794347, z: 0 },
      { x: -812.3047227216128, y: 2960.4388610900487, z: 0 },
      { x: -812.3249921796464, y: 2960.128621087491, z: 0 },
      { x: -812.3386504915552, y: 2959.9166965937397, z: 0 },
      { x: -812.3474835309406, y: 2959.779641779605, z: 0 },
      { x: -812.3526775112591, y: 2959.699051172442, z: 0 },
      { x: -812.3552507121985, y: 2959.6591249861, z: 0 },
      { x: -812.3561798454938, y: 2959.644708409252, z: 0 },
      { x: -812.3563502479498, y: 2959.6420644182203, z: 0 },
      { x: -812.3563594592313, y: 2959.6419214945413, z: 0 },
      { x: -812.3563605869005, y: 2959.641903997451, z: 0 },
      { x: -812.3563606674282, y: 2959.6419027479683, z: 0 },
      { x: -812.3563610277726, y: 2959.6418971568114, z: 0 },
      { x: -812.3563612249804, y: 2959.641894096902, z: 0 },
      { x: -812.3563613255686, y: 2959.641892536161, z: 0 },
      { x: -812.3726781860942, y: 2959.3887175882182, z: 0 },
      { x: -812.4113489277303, y: 2958.368466516476, z: 0 },
    ];
    const pose = {
      position: p(0),
      orientation: { x: 0, y: 0, z: 0, w: 1 },
    };
    const markers = [
      {
        primitive: "line strip",
        scale: { x: 1, y: 1, z: 1 },
        color: { r: 1, g: 0, b: 1, a: 1 },
        pose,
        points,
        debug: true,
      },
    ];
    return (
      <Container
        cameraState={{
          ...DEFAULT_CAMERA_STATE,
          perspective: false,
          target: [-812, 2959.64, 0],
          distance: 5,
        }}>
        <Lines>{markers}</Lines>
      </Container>
    );
  })
  .add("<Arrows>", () => {
    const markers = [poseArrowMarker, pointArrowMarker];
    return (
      <Container axes grid cameraState={{ ...DEFAULT_CAMERA_STATE, perspective: true }}>
        <Arrows>{markers}</Arrows>
      </Container>
    );
  })
  .add(
    "<Cones>",
    withRange((range) => {
      const scaleX = number("scale - x", 3, {
        range: true,
        min: 0.5,
        max: 20,
        step: 0.1,
      });
      const scaleY = number("scale - y", 3, {
        range: true,
        min: 0.5,
        max: 20,
        step: 0.1,
      });
      const scaleZ = number("scale - z", 10, {
        range: true,
        min: 0.5,
        max: 20,
        step: 0.1,
      });
      const marker = {
        pose: {
          orientation: { x: 0, y: 0, z: 0, w: 1 },
          position: { x: 0, y: 0, z: 0 },
        },
        scale: p(scaleX, scaleY, scaleZ),
        color: { r: 1 - range * 0.5, g: range, b: 1, a: 1 - range * 0.3 },
      };

      return (
        <Container axes cameraState={{ ...DEFAULT_CAMERA_STATE, perspective: true }}>
          <Cones>{[marker]}</Cones>
          <Axes />
        </Container>
      );
    })
  )
  .add(
    "<Cylinders>",
    withRange((range) => {
      const scaleX = number("scale - x", 3, {
        range: true,
        min: 0.5,
        max: 20,
        step: 0.1,
      });
      const scaleY = number("scale - y", 3, {
        range: true,
        min: 0.5,
        max: 20,
        step: 0.1,
      });
      const scaleZ = number("scale - z", 10, {
        range: true,
        min: 0.5,
        max: 20,
        step: 0.1,
      });
      const marker = {
        pose: {
          orientation: { x: 0, y: 0, z: 0, w: 1 },
          position: { x: 0, y: 0, z: 0 },
        },
        scale: p(scaleX, scaleY, scaleZ),
        color: { r: 1 - range * 0.5, g: range, b: 1, a: 1 - range * 0.3 },
      };

      return (
        <Container axes cameraState={{ ...DEFAULT_CAMERA_STATE, perspective: true }}>
          <Cylinders>{[marker]}</Cylinders>
          <Axes />
        </Container>
      );
    })
  )
  .add("<Triangles>", () => {
    const rng = seedrandom(seed);
    const vertexColors = range(30).map((_, i) => ({
      r: rng(),
      g: rng(),
      b: rng(),
      a: 1,
    }));
    const colors = [];
    const points = [];
    for (let i = 0; i < 10; i++) {
      points.push([5 * i, 0, 0]);
      points.push([5 * i, 5, 0]);
      points.push([5 * i + 5, 5, 0]);
      colors.push(vertexColors[3 * i], vertexColors[3 * i + 1], vertexColors[3 * i + 2]);
    }
    const marker = {
      pose: {
        position: p(0),
        orientation: q(0),
      },
      points,
      colors,
    };
    return (
      <Container cameraState={{ ...DEFAULT_CAMERA_STATE, perspective: true }}>
        <Triangles>{[marker]}</Triangles>
      </Container>
    );
  })
  .add(
    "<FilledPolygons>",
    withRange((range) => {
      const sideLength = 5 * range + 5;
      const startingAngle = 15 * range;
      const numSides = Math.floor(range * 15) + 1;
      const randomPolygon = polygonGenerator.coordinates(numSides, sideLength, startingAngle);
      const vertices = randomPolygon.map(({ x, y }) => [x, y, 0]);
      const polygon = {
        points: vertices,
        color: [1 - range * 0.5, range, 1, 1 - range * 0.3],
        id: 1,
      };
      return (
        <Container cameraState={DEFAULT_CAMERA_STATE}>
          <FilledPolygons>{[polygon]}</FilledPolygons>
        </Container>
      );
    })
  )
  .add(
    "<Overlay>",
    withRange((range) => {
      const marker = {
        pose: {
          orientation: { x: 0.038269, y: -0.01677, z: -0.8394, w: 0.541905 },
          position: { x: 0, y: 0, z: 0 },
        },
        scale: { x: 5, y: 5, z: 5 },
        color: { r: 1, g: 0, b: 1, a: 1 - range },
      };
      const sphereMarkers = [
        marker,
        {
          ...marker,
          pose: { ...marker.pose, position: { x: 10, y: 10, z: 10 } },
          color: { r: 1, g: 0, b: 1, a: range },
        },
      ];

      const textMarkers = sphereMarkers.map((sphere, index) => ({
        pose: sphere.pose,
        text: "Overlay on top of Sphere",
        info: {
          title: `Index: ${index}`,
        },
      }));

      return (
        <Container cameraState={{ ...DEFAULT_CAMERA_STATE, perspective: true }}>
          <Spheres>{sphereMarkers}</Spheres>

          <Overlay
            renderItem={({ item, coordinates, index, dimension: { width, height } }) => {
              if (!coordinates) {
                return null;
              }
              const [left, top] = coordinates;
              if (left < -10 || top < -10 || left > width + 10 || top > height + 10) {
                return null; // Don't render anything that's too far outside of the canvas
              }
              const {
                text,
                info: { title },
              } = item;
              return (
                <StyledContainer
                  key={index}
                  style={{
                    transform: `translate(${left.toFixed()}px,${top.toFixed()}px)`,
                  }}>
                  <h2 style={{ fontSize: "2rem" }}>{title}</h2>
                  <div>{text}</div>
                  <a
                    style={{ pointerEvents: "visible", color: "#f1f1f1" }}
                    href="http://www.google.com"
                    target="_blank"
                    rel="noopener noreferrer">
                    A custom link
                  </a>
                </StyledContainer>
              );
            }}>
            {textMarkers}
          </Overlay>
        </Container>
      );
    })
  )
  .add("hitmap", hitmapStory)
  .add("dynamic commands", () => {
    class Demo extends React.Component {
      state = {
        cubes: 5,
      };

      onAdd = () => {
        this.setState({ cubes: this.state.cubes + 1 });
      };

      onRemove = () => {
        const newVal = this.state.cubes - 1;
        this.setState({ cubes: Math.max(newVal, 0) });
      };

      render() {
        const children = times(this.state.cubes).map((i) => <Cubes key={i}>{[cube(i * 5)]}</Cubes>);
        return (
          <Container cameraState={{ ...DEFAULT_CAMERA_STATE, perspective: true }}>
            <FloatingBox>
              <button onClick={this.onAdd}>Add cube</button>
              <button onClick={this.onRemove}>Remove cube</button>
            </FloatingBox>
            {this.state.cubes < 6 ? null : <Spheres>{[buildSphereList(1)]}</Spheres>}
            {children}
          </Container>
        );
      }
    }
    return <Demo />;
  })
  .add(
    "backgroundColor",
    withRange((range) => {
      const sideLength = 5 * range + 5;
      const startingAngle = 15 * range;
      const numSides = Math.floor(range * 15) + 1;
      const randomPolygon = polygonGenerator.coordinates(numSides, sideLength, startingAngle);
      const vertices = randomPolygon.map(({ x, y }) => [x, y, 0]);
      const polygon = {
        points: vertices,
        color: [1 - range * 0.5, range, 1, 1 - range * 0.3],
        id: 1,
      };
      return (
        <Container cameraState={DEFAULT_CAMERA_STATE} backgroundColor={[1, 1, 0, 1]}>
          <FilledPolygons>{[polygon]}</FilledPolygons>
        </Container>
      );
    })
  );
