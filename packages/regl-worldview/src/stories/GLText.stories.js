// @flow

import { storiesOf } from "@storybook/react";
import { quat } from "gl-matrix";
import { range } from "lodash";
import React, { useState, useLayoutEffect } from "react";
import { withScreenshot } from "storybook-chrome-screenshot";
import tinyColor from "tinycolor2";

import { Axes } from "../commands";
import type { Color } from "../types";
import { vec4ToOrientation } from "../utils/commandUtils";
import Container from "./Container";
import inScreenshotTests from "stories/inScreenshotTests";

import { GLText } from "..";

function textMarkers({
  text,
  billboard,
  background = true,
}: {
  text: string,
  billboard?: ?boolean,
  background?: ?boolean,
}) {
  const radius = 10;
  const count = 10;
  return new Array(count).fill().map((_, i) => {
    const angle = (2 * Math.PI * i) / count;
    const color = { r: 0, g: i / count, b: i / count, a: 1 };
    return {
      text: `${text} ${i}`,
      pose: {
        position: { x: radius * Math.cos(angle), y: radius * Math.sin(angle), z: 0 },
        orientation: vec4ToOrientation(quat.rotateZ(quat.create(), quat.create(), Math.PI / 2 + angle)),
      },
      scale: { x: 1, y: 1, z: 1 },
      color,
      colors: background && i % 4 === 0 ? [color, { r: 1, g: 1, b: 0, a: 1 }] : undefined,
      billboard,
    };
  });
}

storiesOf("Worldview/GLText", module)
  .addDecorator(withScreenshot({ delay: 200 }))
  .add("billboard", () => (
    <Container cameraState={{ perspective: true, distance: 40 }}>
      <GLText>{textMarkers({ text: "Hello\nWorldview", billboard: true })}</GLText>
      <Axes />
    </Container>
  ))
  .add("non-billboard", () => (
    <Container cameraState={{ perspective: true, distance: 40 }}>
      <GLText>{textMarkers({ text: "Hello\nWorldview", billboard: false })}</GLText>
      <Axes />
    </Container>
  ))
  .add("no background", () => (
    <Container cameraState={{ perspective: true, distance: 40 }}>
      <GLText>{textMarkers({ text: "Hello\nWorldview", billboard: false, background: false })}</GLText>
      <Axes />
    </Container>
  ))
  .add("autoBackgroundColor", () => (
    <Container cameraState={{ perspective: true, distance: 40 }} backgroundColor={[0.2, 0.2, 0.4, 1]}>
      <GLText autoBackgroundColor>{textMarkers({ text: "Hello\nWorldview" })}</GLText>
      <Axes />
    </Container>
  ))
  .add("changing text", () => {
    function Example() {
      const [text, setText] = useState("Hello\nWorldview");
      useLayoutEffect(() => {
        let i = 0;
        const id = setInterval(() => {
          setText(`New text! ${++i}`);
          if (inScreenshotTests()) {
            clearInterval(id);
          }
        }, 100);
        return () => clearInterval(id);
      }, []);
      return (
        <Container cameraState={{ perspective: true, distance: 40 }} backgroundColor={[0.2, 0.2, 0.4, 1]}>
          <GLText autoBackgroundColor>{textMarkers({ text })}</GLText>
          <Axes />
        </Container>
      );
    }
    return <Example />;
  })
  .add("highlighted text", () => {
    const Example = () => {
      const [searchText, setSearchText] = useState("ello\nW");
      const markers = textMarkers({ text: "Hello\nWorldview" }).map((marker) => {
        if (!searchText) {
          return marker;
        }
        const highlightedIndices = new Set();
        let match;
        let regex;
        try {
          regex = new RegExp(searchText, "ig");
        } catch (e) {
          return marker;
        }
        while ((match = regex.exec(marker.text)) !== null) {
          // $FlowFixMe - Flow doesn't understand the while loop terminating condition.
          range(0, match[0].length).forEach((i) => {
            // $FlowFixMe - Flow doesn't understand the while loop terminating condition.
            highlightedIndices.add(match.index + i);
          });
        }
        return { ...marker, highlightedIndices: Array.from(highlightedIndices) };
      });

      return (
        <div style={{ width: "100%", height: "100%" }}>
          <div style={{ width: "100%", height: "100%" }}>
            <Container cameraState={{ perspective: true, distance: 40 }} backgroundColor={[0.2, 0.2, 0.4, 1]}>
              <GLText autoBackgroundColor>{markers}</GLText>
              <Axes />
            </Container>
          </div>
          <div style={{ position: "absolute", top: "10px", right: "10px" }}>
            <label htmlFor="search">Search: </label>
            <input
              type="text"
              name="search"
              placeholder="search text"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
            />
          </div>
        </div>
      );
    };

    return <Example />;
  })
  .add("custom highlight color", () => {
    const Example = () => {
      const [highlightColor, setHighlightColor] = useState<Color>({ r: 1, b: 0.5, g: 0.5, a: 1 });
      const markers = textMarkers({ text: "Hello\nWorldview", background: false }).map((marker) => ({
        ...marker,
        highlightedIndices: [0, 1, 2, 3, 4],
        highlightColor,
      }));

      return (
        <div style={{ width: "100%", height: "100%" }}>
          <Container cameraState={{ perspective: true, distance: 40 }} backgroundColor={[0.2, 0.2, 0.4, 1]}>
            <div style={{ position: "absolute", top: "10px", right: "10px" }}>
              <label htmlFor="highlight-color">Highlight Color: </label>
              <input
                type="color"
                name="highlight-color"
                value={tinyColor.fromRatio(highlightColor).toHexString()}
                onChange={(e) => {
                  const hex = e.target.value;
                  const { r, g, b } = tinyColor(hex).toRgb();
                  setHighlightColor({ r: r / 255, g: g / 255, b: b / 255, a: 1 });
                }}
              />
            </div>

            <GLText>{markers}</GLText>
            <Axes />
          </Container>
        </div>
      );
    };

    return <Example />;
  });
