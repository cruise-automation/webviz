// @flow

import { storiesOf } from "@storybook/react";
import { quat } from "gl-matrix";
import { range } from "lodash";
import React, { useState, useLayoutEffect } from "react";
import { withScreenshot } from "storybook-chrome-screenshot";

import { Axes } from "../commands";
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
        <>
          <div style={{ width: "100%", height: "95%" }}>
            <Container cameraState={{ perspective: true, distance: 40 }} backgroundColor={[0.2, 0.2, 0.4, 1]}>
              <GLText autoBackgroundColor>{markers}</GLText>
              <Axes />
            </Container>
          </div>

          <input
            style={{ width: "100%" }}
            type="text"
            placeholder="search text"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
          />
        </>
      );
    };

    return <Example />;
  });
