// @flow
//
//  Copyright (c) 2019-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import Pickr from "@simonwep/pickr";
import React, { forwardRef, useRef, useLayoutEffect, useImperativeHandle } from "react";
import styled from "styled-components";

import { colors } from "webviz-core/src/util/colors";

import "@simonwep/pickr/dist/themes/monolith.min.css";

export const COLOR_PICKER_SIZE = 29;

const SColorPicker = styled.div.attrs({
  style: (props) => ({ backgroundColor: props.color }),
  "data-test": "ColorPicker",
})`
  display: inline-block;
  vertical-align: middle;
  width: ${COLOR_PICKER_SIZE}px;
  height: ${COLOR_PICKER_SIZE}px;
  border-radius: 50%;
  border: 1px solid ${colors.LIGHT2};
`;

type Props = { color: string, onChange: (string) => void };

function ColorPicker({ color, onChange }: Props, ref) {
  const container = useRef();
  const pickr = useRef<?Pickr>();
  useImperativeHandle(ref, () => ({
    getPickrForTesting: () => pickr.current,
  }));

  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const colorRef = useRef(color);
  colorRef.current = color;

  useLayoutEffect(() => {
    if (!container.current) {
      throw new Error("missing container element");
    }
    pickr.current = new Pickr({
      el: container.current,

      // Pickr internally calls setColor() after initialization, so if our setColor
      // happens too early it will be overridden by the default color
      default: colorRef.current,

      theme: "monolith",
      useAsButton: true,
      comparison: false,
      lockOpacity: true,
      components: {
        preview: false,
        hue: true,
        interaction: {
          input: true,
        },
      },
    })
      .on("show", () => {
        // Make sure color is up to date from props when picker is opened
        if (pickr.current) {
          pickr.current.setColor(colorRef.current);
        }
      })
      .on("change", (newColor) => {
        onChangeRef.current(newColor.toHEXA().toString());
      });

    return () => {
      if (pickr.current) {
        pickr.current.destroyAndRemove();
      }
    };
  }, []);

  return <SColorPicker ref={container} color={color} />;
}

export default forwardRef<Props, ?Pickr>(ColorPicker);
