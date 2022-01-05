// @flow

import { storiesOf } from "@storybook/react";
import { quat } from "gl-matrix";
import { range } from "lodash";
import React, { useState, useLayoutEffect, useCallback, useEffect } from "react";
import tinyColor from "tinycolor2";

import { Axes, Cubes } from "../commands";
import type { Color } from "../types";
import { vec4ToOrientation } from "../utils/commandUtils";
import Container from "./Container";
import getTextAtlas from "./pregeneratedTextAtlas";
import { rng } from "./util";

import { GLText } from "..";

const getAtlasPromise = getTextAtlas();

function textMarkers({
  text,
  billboard,
  background = true,
  randomScale = false,
}: {|
  text: string,
  billboard?: ?boolean,
  background?: ?boolean,
  randomScale?: ?boolean,
|}) {
  const radius = 10;
  const count = 10;
  const scale = (i: number) => {
    if (!randomScale) {
      return { x: 1, y: 1, z: 1 };
    }
    return {
      x: 0.5 + 2.0 * rng(),
      y: 0.5 + 2.0 * rng(),
      z: 0.5 + 2.0 * rng(),
    };
  };
  return new Array(count).fill().map((_, i) => {
    const angle = (2 * Math.PI * i) / count;
    const color = { r: 0, g: i / count, b: i / count, a: 1 };
    return {
      text: `${text} ${i}`,
      pose: {
        position: { x: radius * Math.cos(angle), y: radius * Math.sin(angle), z: 0 },
        orientation: vec4ToOrientation(quat.rotateZ(quat.create(), quat.create(), Math.PI / 2 + angle)),
      },
      scale: scale(i),
      color,
      colors: background && i % 4 === 0 ? [color, { r: 1, g: 1, b: 0, a: 1 }] : undefined,
      billboard,
    };
  });
}

function overlappingMarkers({
  text,
  billboard,
  background = true,
}: {|
  text: string,
  billboard?: ?boolean,
  background?: ?boolean,
|}) {
  const count = 10;
  return new Array(count).fill().map((_, i) => {
    const color = { r: 0, g: i / count, b: i / count, a: 1 };
    return {
      text: `${text} ${i}`,
      pose: {
        position: { x: 0, y: i * 0, z: 0 },
        orientation: { x: 0, y: 0, z: 0, w: 1 },
      },
      scale: { x: 1, y: 1, z: 1 },
      color,
      colors: background && i % 4 === 0 ? [color, { r: 1, g: 1, b: 0, a: 1 }] : undefined,
      billboard,
    };
  });
}

const getCameraState = (target) => ({
  target: target ? [target.x, target.y, target.z] : undefined,
  perspective: true,
  distance: 3,
});

const stories = storiesOf("Worldview/GLText", module).addParameters({ screenshot: { delay: 200 } });

// Resolution
[160, 80, 40].forEach((paddingScale) => {
  stories.add(`resolution - ${paddingScale}`, () => {
    const markers = textMarkers({ text: "Hello\nWorldview", billboard: true });
    const target = markers[9].pose.position;
    return (
      <Container cameraState={getCameraState(target)}>
        <Axes />
        <GLText>{markers}</GLText>
      </Container>
    );
  });
});

// Padding
[1.25, 1.5, 2].forEach((paddingScale) => {
  stories.add(`padding - ${paddingScale}`, () => {
    const markers = textMarkers({ text: "Hello\nWorldview", billboard: true });
    return (
      <Container cameraState={{ perspective: true, distance: 25 }}>
        <Axes />
        <GLText paddingScale={[paddingScale]} autoBackgroundColor>
          {markers}
        </GLText>
      </Container>
    );
  });
});

// Border radius
[1, 0.5, 0.15].forEach((borderRadius) => {
  stories.add(`borderRadius - ${borderRadius}`, () => {
    const markers = textMarkers({ text: "Hello\nWorldview", billboard: true, background: true });
    return (
      <Container cameraState={{ perspective: true, distance: 25 }}>
        <Axes />
        <GLText borderRadius={borderRadius} paddingScale={[1.5, 1]}>
          {markers}
        </GLText>
      </Container>
    );
  });
});

stories.add(`borderRadius and padding with single char`, () => {
  // Make sure everything is still properly aligned
  const markers = textMarkers({ text: "W\ni\nn", billboard: true, background: true }).map((t) => ({
    ...t,
    text: "W\ni\nn",
  }));
  return (
    <Container cameraState={{ perspective: true, distance: 25 }}>
      <Axes />
      <GLText borderRadius={1} paddingScale={[1.5, 1]}>
        {markers}
      </GLText>
    </Container>
  );
});

stories
  .add("glyph ascent and descent", () => {
    const markers = textMarkers({ text: "BDFGHJKLPQTY\nbdfghjklpqty", billboard: true });
    const target = markers[9].pose.position;
    return (
      <Container
        cameraState={{
          target: [target.x, target.y + 2, target.z],
          perspective: true,
          distance: 8,
        }}>
        <Axes />
        <GLText>{markers}</GLText>
      </Container>
    );
  })
  .add("random marker scale", () => {
    const markers = textMarkers({ text: "Hello\nWorldview", billboard: true, randomScale: true });
    return (
      <Container cameraState={{ perspective: true, distance: 25 }}>
        <Axes />
        <GLText resolution={40}>{markers}</GLText>
      </Container>
    );
  })
  .add("scaleInvariant", () => {
    const markers = textMarkers({ text: "Hello\nWorldview", billboard: true });
    return (
      <Container cameraState={{ perspective: true, distance: 25 }}>
        <GLText scaleInvariantFontSize={10}>{markers}</GLText>
        <Axes />
      </Container>
    );
  })
  .add("scaleInvariant-20", () => {
    const markers = textMarkers({ text: "Hello\nWorldview", billboard: true });
    return (
      <Container cameraState={{ perspective: true, distance: 25 }}>
        <Axes />
        <GLText scaleInvariantFontSize={20}>{markers}</GLText>
      </Container>
    );
  })
  .add("scaleInvariant-40", () => {
    const markers = textMarkers({ text: "Hello\nWorldview", billboard: true });
    return (
      <Container cameraState={{ perspective: true, distance: 25 }} backgroundColor={[0.2, 0.2, 0.4, 1]}>
        <Axes />
        <GLText scaleInvariantFontSize={40}>{markers}</GLText>
      </Container>
    );
  })
  .add("scaleInvariant - perspective: false", () => {
    const markers = textMarkers({ text: "Hello\nWorldview", billboard: true });
    return (
      <Container cameraState={{ perspective: false, distance: 25 }} backgroundColor={[0.4, 0.2, 0.2, 1]}>
        <Axes />
        <GLText scaleInvariantFontSize={40}>{markers}</GLText>
      </Container>
    );
  })
  .add("scaleInvariant resize", () => {
    function Example() {
      const [hasRenderedOnce, setHasRenderedOnce] = useState<boolean>(false);
      const refFn = useCallback(() => {
        setTimeout(() => {
          setHasRenderedOnce(true);
        }, 100);
      }, []);
      const markers = textMarkers({ text: "Hello\nWorldview", billboard: true });
      return (
        <div
          style={{ width: hasRenderedOnce ? 500 : 250, height: hasRenderedOnce ? 500 : 250, background: "black" }}
          ref={refFn}>
          <Container cameraState={{ perspective: true, distance: 40 }}>
            <GLText scaleInvariantFontSize={20}>{markers}</GLText>
            <Axes />
          </Container>
        </div>
      );
    }
    return <Example />;
  })
  .add("scaleInvariant - ignore scale", () => {
    const markers = textMarkers({ text: "Hello\nWorldview", billboard: true, randomScale: true });
    return (
      <Container cameraState={{ perspective: true, distance: 25 }}>
        <GLText scaleInvariantFontSize={30}>{markers}</GLText>
        <Axes />
      </Container>
    );
  })
  .add("with alphabet", () => {
    const markers = textMarkers({ text: "Hello\nWorldview", billboard: true });
    const alphabet = "HelloWorldview0123456789".split("");
    return (
      <Container cameraState={{ perspective: true, distance: 25 }}>
        <GLText alphabet={alphabet}>{markers}</GLText>
        <Axes />
      </Container>
    );
  })
  .add("with pregenerated text atlas", () => {
    const text = "\u{F167A}truck\u{F053D}";
    const markers = textMarkers({ text, billboard: true }).map((marker) => ({
      ...marker,
      text,
    }));
    function Example() {
      const [textAtlas, setTextAtlas] = useState();
      useEffect(() => {
        getAtlasPromise.then((atlas) => {
          setTextAtlas(atlas);
        });
      });

      return (
        <Container cameraState={{ perspective: true, distance: 25 }}>
          <Axes />
          {textAtlas && (
            <GLText textAtlas={textAtlas} resolution={40} borderRadius={1} paddingScale={[1.5]}>
              {markers}
            </GLText>
          )}
        </Container>
      );
    }

    return <Example />;
  })
  .add("overlapping fixed", () => {
    const markers = overlappingMarkers({ text: "Hello Worldview", billboard: true });
    return (
      <Container cameraState={{ perspective: true, distance: 25 }}>
        <Axes />
        <GLText>{markers}</GLText>
      </Container>
    );
  })
  .add("overlapping fixed scaleInvariant", () => {
    const markers = overlappingMarkers({ text: "Hello Worldview", billboard: true });
    return (
      <Container cameraState={{ perspective: true, distance: 25 }}>
        <Axes />
        <GLText scaleInvariantFontSize={30}>{markers}</GLText>
      </Container>
    );
  })
  .add("overlapping multiline fixed", () => {
    const markers = overlappingMarkers({ text: "Hello\nWorld\nview", billboard: true });
    return (
      <Container cameraState={{ perspective: true, distance: 25 }}>
        <Axes />
        <GLText>{markers}</GLText>
      </Container>
    );
  })
  .add("overlapping mixed fixed", () => {
    const markers = overlappingMarkers({ text: "Hello Worldview", billboard: true }).concat(
      textMarkers({ text: "Hello Worldview", billboard: true })
    );
    return (
      <Container cameraState={{ perspective: true, distance: 25 }}>
        <Axes />
        <GLText>{markers}</GLText>
      </Container>
    );
  })
  .add("billboard", () => (
    <Container cameraState={{ perspective: true, distance: 40 }}>
      <GLText>{textMarkers({ text: "Hello\nWorldview", billboard: true })}</GLText>
      <Axes />
    </Container>
  ))
  .add("non-billboard", () => (
    <Container cameraState={{ perspective: true, distance: 40 }}>
      <Axes />
      <GLText>{textMarkers({ text: "Hello\nWorldview", billboard: false })}</GLText>
    </Container>
  ))
  .add("no background", () => (
    <Container cameraState={{ perspective: true, distance: 40 }}>
      <Axes />
      <GLText>{textMarkers({ text: "Hello\nWorldview", billboard: false, background: false })}</GLText>
    </Container>
  ))
  .add("autoBackgroundColor", () => (
    <Container cameraState={{ perspective: true, distance: 40 }} backgroundColor={[0.2, 0.2, 0.4, 1]}>
      <Axes />
      <GLText autoBackgroundColor>{textMarkers({ text: "Hello\nWorldview" })}</GLText>
    </Container>
  ))
  .add("autoBackgroundColor scaleInvariant", () => (
    <Container cameraState={{ perspective: true, distance: 40 }} backgroundColor={[0.2, 0.2, 0.4, 1]}>
      <Axes />
      <GLText autoBackgroundColor scaleInvariantFontSize={10}>
        {textMarkers({ text: "Hello\nWorldview", billboard: true })}
      </GLText>
    </Container>
  ))
  .add("changing text", () => {
    function Example() {
      const [text, setText] = useState("Hello\nWorldview");
      useLayoutEffect(() => {
        setText(`New text!`);
      }, []);
      return (
        <Container cameraState={{ perspective: true, distance: 40 }} backgroundColor={[0.2, 0.2, 0.4, 1]}>
          <div style={{ position: "absolute", top: 30, right: 30 }}>
            <button onClick={() => setText(`Value: ${Math.floor(100 * Math.random())}`)}>Change Text</button>
          </div>
          <Axes />
          <GLText autoBackgroundColor>{textMarkers({ text })}</GLText>
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
              <Axes />
              <GLText autoBackgroundColor>{markers}</GLText>
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
  })
  .add("Depth testing enabled for text in the 3D world", () => {
    const text = {
      text: "Hello\nWorld!",
      pose: {
        position: { x: 0, y: 0, z: 0 },
        orientation: { x: 0, y: 0, z: 0, w: 1 },
      },
      scale: { x: 1, y: 1, z: 1 },
      color: { r: 1, g: 1, b: 1, a: 1 },
      billboard: true,
    };
    const cube = {
      pose: {
        position: { x: 0, y: 0, z: 0 },
        orientation: { x: 0, y: 0, z: 0, w: 1 },
      },
      scale: { x: 2, y: 2, z: 2 },
      color: { r: 1, g: 0, b: 1, a: 1 },
    };
    return (
      <Container cameraState={{ perspective: false, distance: 25 }}>
        <Axes />
        <Cubes>{[cube]}</Cubes>
        <GLText>{[text]}</GLText>
      </Container>
    );
  })
  .add("Depth testing disabled when using scale invariance. Draw order issues.", () => {
    const text = {
      text: "Hello\nWorld!",
      pose: {
        position: { x: 0, y: 0, z: 0 },
        orientation: { x: 0, y: 0, z: 0, w: 1 },
      },
      scale: { x: 1, y: 1, z: 1 },
      color: { r: 1, g: 1, b: 1, a: 1 },
      billboard: true,
    };
    const cube = {
      pose: {
        position: { x: 0, y: 0, z: 0 },
        orientation: { x: 0, y: 0, z: 0, w: 1 },
      },
      scale: { x: 2, y: 2, z: 2 },
      color: { r: 1, g: 0, b: 1, a: 1 },
    };
    return (
      <Container cameraState={{ perspective: false, distance: 25 }}>
        <Axes />
        <GLText scaleInvariantFontSize={30}>{[text]}</GLText>
        <Cubes>{[cube]}</Cubes>
      </Container>
    );
  })
  .add("Depth testing disabled when using scale invariance. GLText render last", () => {
    const text = {
      text: "Hello\nWorld!",
      pose: {
        position: { x: 0, y: 0, z: 0 },
        orientation: { x: 0, y: 0, z: 0, w: 1 },
      },
      scale: { x: 1, y: 1, z: 1 },
      color: { r: 1, g: 1, b: 1, a: 1 },
      billboard: true,
    };
    const cube = {
      pose: {
        position: { x: 0, y: 0, z: 0 },
        orientation: { x: 0, y: 0, z: 0, w: 1 },
      },
      scale: { x: 2, y: 2, z: 2 },
      color: { r: 1, g: 0, b: 1, a: 1 },
    };
    return (
      <Container cameraState={{ perspective: false, distance: 25 }}>
        <Cubes>{[cube]}</Cubes>
        <Axes />
        <GLText scaleInvariantFontSize={30}>{[text]}</GLText>
      </Container>
    );
  });
