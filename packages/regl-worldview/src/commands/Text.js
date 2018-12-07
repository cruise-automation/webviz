//  Copyright (c) 2018-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

// @flow
import React from 'react';
import styled from 'styled-components';
import WorldviewReactContext from '../WorldviewReactContext';
import { type WorldviewContextType } from '../WorldviewContext';
import { getCSSColor } from '../utils/commandUtils';
import type { Point, CameraCommand, Dimensions, Color, Pose, Scale } from '../types';

type TextMarker = {
  name?: string,
  pose: Pose,
  scale: Scale,
  color: Color,
  text: string,
};

const StyledContainer = styled.div`
  > span {
    position: absolute;
    white-space: nowrap;
    z-index: 100;
    pointer-events: none;
    top: 0;
    left: 0;
    will-change: transform;
    > span {
      position: relative;
      left: -50%;
      top: -0.5em;
      white-space: pre-line;
    }
  }
`;

class TextElement {
  wrapper = document.createElement('span');
  _inner = document.createElement('span');
  _text = document.createTextNode('');
  _color = '';

  constructor() {
    this.wrapper.appendChild(this._inner);
    this._inner.appendChild(this._text);
  }

  update(marker: TextMarker, left: number, top: number) {
    this.wrapper.style.transform = `translate(${left.toFixed()}px,${top.toFixed()}px)`;
    const newColor = getCSSColor(marker.color);

    if (this._color !== newColor) {
      this._color = newColor;
      this.wrapper.style.color = newColor;
    }
    if (this._text.textContent !== marker.text) {
      this._text.textContent = marker.text || '';
    }
  }
}

type Props = {
  children: TextMarker[],
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
    const { children: markers } = this.props;
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

      el.update(marker, left, top);
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
        <StyledContainer innerRef={this._textContainerRef} />
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
