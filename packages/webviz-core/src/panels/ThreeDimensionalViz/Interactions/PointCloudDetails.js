// @flow
//
//  Copyright (c) 2018-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import ExportVariantIcon from "@mdi/svg/svg/export-variant.svg";
import * as React from "react";
import { type MouseEventObject } from "regl-worldview";

import { SRow, SValue } from "./index";
import ChildToggle from "webviz-core/src/components/ChildToggle";
import Icon from "webviz-core/src/components/Icon";
import Menu from "webviz-core/src/components/Menu";
import Item from "webviz-core/src/components/Menu/Item";
import { downloadFiles } from "webviz-core/src/util";
import clipboard from "webviz-core/src/util/clipboard";

type Props = {
  selectedObject: MouseEventObject,
};

export default function PointCloudDetails({ selectedObject: { object, instanceIndex } }: Props) {
  const [isOpen, setIsOpen] = React.useState<boolean>(false);

  const allPoints: number[] = object.points || [];

  const [clickedPoint, clickedPointColor] = React.useMemo(
    () => {
      let clickedPoint = null;
      let clickedPointColor = null;
      if (allPoints.length && instanceIndex != null && instanceIndex >= 0 && instanceIndex * 3 < allPoints.length) {
        clickedPoint = [];
        const baseIdx = instanceIndex * 3;
        clickedPoint.push(allPoints[baseIdx]);
        clickedPoint.push(allPoints[baseIdx + 1]);
        clickedPoint.push(allPoints[baseIdx + 2]);
        const allColors: number[] = object.colors || [];
        const baseColorR = allColors[baseIdx];
        const baseColorG = allColors[baseIdx + 1];
        const baseColorB = allColors[baseIdx + 2];
        if (baseColorR && baseColorG && baseColorB) {
          clickedPointColor = [baseColorR, baseColorG, baseColorB, 1];
        }
      }
      return [clickedPoint, clickedPointColor];
    },
    [allPoints, instanceIndex, object.colors]
  );

  if (!clickedPoint || allPoints.length === 0) {
    return null;
  }

  function getCopyPoints() {
    const copyPoints = [];
    const len = allPoints.length / 3;
    for (let i = 0; i < len; i++) {
      const point = [allPoints[i * 3], allPoints[i * 3 + 1], allPoints[i * 3 + 2]];
      copyPoints.push(point.join(","));
    }
    return copyPoints;
  }
  const colorStyle = clickedPointColor ? { color: `rgba(${clickedPointColor.join(",")})` } : {};

  return (
    <SRow>
      <SValue style={{ display: "flex", alignItems: "center", flex: 1 }}>
        <span style={{ flex: 1, lineHeight: 1.4, ...colorStyle }}>
          {clickedPoint.map((x) => (typeof x === "number" && x.toFixed(1)) || JSON.stringify(x)).join(", ")}
          <br /> (point {instanceIndex} of {allPoints.length})
        </span>

        <ChildToggle position="below" onToggle={() => setIsOpen(!isOpen)} isOpen={isOpen}>
          <Icon small fade active={isOpen} tooltip="Export points">
            <ExportVariantIcon />
          </Icon>
          <Menu>
            <Item
              onClick={() => {
                clipboard.copy(clickedPoint.join(", "));
                setIsOpen(false);
              }}>
              Copy clicked point to clipboard
            </Item>
            <Item
              onClick={() => {
                const copyPoints = getCopyPoints();
                const dataStr = `x,y,z\n${copyPoints.join("\n")}`;
                const blob = new Blob([dataStr], { type: "text/csv;charset=utf-8;" });
                downloadFiles([blob], "points.csv");
                setIsOpen(false);
              }}>
              Download all points as CSV
            </Item>
          </Menu>
        </ChildToggle>
      </SValue>
    </SRow>
  );
}
