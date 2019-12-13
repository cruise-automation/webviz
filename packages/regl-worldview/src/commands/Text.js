// @flow

//  Copyright (c) 2018-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import React from "react";

import type { Point, CameraCommand, Dimensions, Color, Pose, Scale } from "../types";
import { getCSSColor } from "../utils/commandUtils";
import { type WorldviewContextType } from "../WorldviewContext";
import WorldviewReactContext from "../WorldviewReactContext";

const BG_COLOR_LIGHT = "#ffffff";
const BG_COLOR_DARK = "rgba(0,0,0,0.8)";
const BRIGHTNESS_THRESHOLD = 128;
const DEFAULT_TEXT_COLOR = { r: 1, g: 1, b: 1, a: 1 };
const DEFAULT_BG_COLOR = { r: 0, g: 0, b: 0, a: 0.8 };

export type TextMarker = {
  name?: string,
  pose: Pose,
  scale: Scale,
  color?: Color,
  colors?: Color[],
  text: string,
};

let cssHasBeenInserted = false;
function insertGlobalCss() {
  if (cssHasBeenInserted) {
    return;
  }
  const style = document.createElement("style");
  style.innerHTML = `
    .regl-worldview-text-wrapper {
      position: absolute;
      white-space: nowrap;
      z-index: 100;
      pointer-events: none;
      top: 0;
      left: 0;
      will-change: transform;
    }
    .regl-worldview-text-inner {
      position: relative;
      left: -50%;
      top: -0.5em;
      white-space: pre-line;
    }
  `;
  if (document.body) {
    document.body.appendChild(style);
  }
  cssHasBeenInserted = true;
}

export function isColorDark({ r, g, b }: Color): boolean {
  // ITU-R BT.709 https://en.wikipedia.org/wiki/Rec._709
  // 0.2126 * 255 * r + 0.7152 * 255 * g + 0.0722 * 255 * b
  const luma = 54.213 * r + 182.376 * g + 18.411 * b;
  return luma < BRIGHTNESS_THRESHOLD;
}

function isColorEqual(a: Color, b: Color): boolean {
  return a.r === b.r && a.g === b.g && a.b === b.b && a.a === b.a;
}

class TextElement {
  wrapper = document.createElement("span");
  _inner = document.createElement("span");
  _text = document.createTextNode("");
  // store prev colors to improve perf
  _prevTextColor: Color = DEFAULT_TEXT_COLOR;
  _prevBgColor: ?Color = DEFAULT_BG_COLOR;
  _prevAutoBackgroundColor: ?boolean = null;

  constructor() {
    insertGlobalCss();
    this.wrapper.className = "regl-worldview-text-wrapper";
    this._inner.className = "regl-worldview-text-inner";
    this.wrapper.appendChild(this._inner);
    this._inner.appendChild(this._text);
    this.wrapper.style.color = getCSSColor(DEFAULT_TEXT_COLOR);
  }

  update(marker: TextMarker, left: number, top: number, autoBackgroundColor?: boolean) {
    this.wrapper.style.transform = `translate(${left.toFixed()}px,${top.toFixed()}px)`;
    const { color, colors = [] } = marker;
    const hasBgColor = colors.length >= 2;
    const textColor = hasBgColor ? colors[0] : color;

    if (textColor) {
      if (!isColorEqual(this._prevTextColor, textColor)) {
        this._prevTextColor = textColor;
        this.wrapper.style.color = getCSSColor(textColor);
      }

      if (!autoBackgroundColor && autoBackgroundColor !== this._prevAutoBackgroundColor) {
        // remove background color if autoBackgroundColor has changed
        this._inner.style.background = "transparent";
        this._prevBgColor = null;
      } else {
        if (
          autoBackgroundColor &&
          (!this._prevBgColor || (this._prevBgColor && !isColorEqual(textColor, this._prevBgColor)))
        ) {
          // update background color with automatic dark/light color
          this._prevBgColor = textColor;
          const isTextColorDark = isColorDark(textColor);
          const hexBgColor = isTextColorDark ? BG_COLOR_LIGHT : BG_COLOR_DARK;
          this._inner.style.background = hexBgColor;
        } else if (hasBgColor && this._prevBgColor && !isColorEqual(colors[1], this._prevBgColor)) {
          // update background color with colors[1] data
          this._prevBgColor = colors[1];
          this._inner.style.background = getCSSColor(colors[1]);
        }
      }
    }
    this._prevAutoBackgroundColor = autoBackgroundColor;

    if (this._text.textContent !== marker.text) {
      this._text.textContent = marker.text || "";
    }
  }
}

type Props = {
  children: TextMarker[],
  autoBackgroundColor?: boolean,
};

// Render text on a scene using DOM nodes, similar to the Overlay command.
// Implementation uses manual DOM manipulation to avoid the performance hit from React tree reconciliation.
export default class Text extends React.Component<Props> {
  _context: ?WorldviewContextType;
  _textComponents: Map<string | TextMarker, TextElement> = new Map();
  _textContainerRef: { current: HTMLDivElement | null } = React.createRef();

  static defaultProps = {
    children: [],
  };

  componentDidMount() {
    if (this._context) {
      this._context.registerPaintCallback(this.paint);
    }
  }

  componentWillUnmount = () => {
    if (this._context) {
      this._context.unregisterPaintCallback(this.paint);
    }
  };

  paint = () => {
    const context = this._context;
    const textComponents = this._textComponents;
    const { children: markers, autoBackgroundColor } = this.props;
    const { current: textContainer } = this._textContainerRef;
    const initializedData = context && context.initializedData;

    if (!textContainer || !context || !initializedData) {
      return;
    }
    const {
      dimension,
      dimension: { width, height },
    } = context;
    const { camera } = initializedData;

    const componentsToRemove = new Set(textComponents.keys());

    for (const marker of markers) {
      const { pose, name } = marker;
      const { position } = pose;
      const coord = this.project(position, camera, dimension);
      if (!coord) {
        continue;
      }

      const [left, top] = coord;
      if (left < -10 || top < -10 || left > width + 10 || top > height + 10) {
        continue;
      }

      let el = textComponents.get(name || marker);
      if (el) {
        componentsToRemove.delete(name || marker);
      } else {
        el = new TextElement();
        textComponents.set(name || marker, el);
        textContainer.appendChild(el.wrapper);
      }

      el.update(marker, left, top, autoBackgroundColor);
    }

    for (const key of componentsToRemove) {
      const el = textComponents.get(key);
      if (!el) {
        continue;
      }
      el.wrapper.remove();
      textComponents.delete(key);
    }
  };

  project = (point: Point, camera: CameraCommand, dimension: Dimensions) => {
    const vec = [point.x, point.y, point.z];
    const { left, top, width, height } = dimension;
    const viewport = [left, top, width, height];
    return camera.toScreenCoord(viewport, vec);
  };

  render() {
    return (
      <React.Fragment>
        <div ref={this._textContainerRef} />
        <WorldviewReactContext.Consumer>
          {(ctx: ?WorldviewContextType) => {
            if (ctx) {
              this._context = ctx;
            }
            return null;
          }}
        </WorldviewReactContext.Consumer>
      </React.Fragment>
    );
  }
}
