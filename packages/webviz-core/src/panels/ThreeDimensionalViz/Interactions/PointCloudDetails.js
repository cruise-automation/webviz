// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import ExportVariantIcon from "@mdi/svg/svg/export-variant.svg";
import React, { useMemo, useState, useCallback } from "react";
import { type MouseEventObject } from "regl-worldview";
import styled from "styled-components";

import { SValue, SLabel } from "./index";
import ChildToggle from "webviz-core/src/components/ChildToggle";
import Icon from "webviz-core/src/components/Icon";
import Menu from "webviz-core/src/components/Menu";
import Item from "webviz-core/src/components/Menu/Item";
import {
  getClickedInfo,
  getAllPoints,
} from "webviz-core/src/panels/ThreeDimensionalViz/commands/PointClouds/selection";
import { downloadFiles } from "webviz-core/src/util";
import clipboard from "webviz-core/src/util/clipboard";

const SRow = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  padding: 0;
  margin: 4px 0;
`;
type Props = {
  selectedObject: MouseEventObject,
};

export default function PointCloudDetails({ selectedObject: { object, instanceIndex } }: Props) {
  const [isOpen, setIsOpen] = useState<boolean>(false);

  const { clickedPoint, clickedPointColor, additionalFieldValues } =
    useMemo(
      () => {
        return getClickedInfo(object, instanceIndex);
      },
      [instanceIndex, object]
    ) || {};

  const additionalFieldNames = useMemo(() => (additionalFieldValues && Object.keys(additionalFieldValues)) || [], [
    additionalFieldValues,
  ]);

  const hasAdditionalFieldNames = !!additionalFieldNames.length;
  const onCopy = useCallback(
    () => {
      // GPU point clouds need to extract positions using getAllPoints()
      const allPoints: number[] = object.points || getAllPoints(object);
      const dataRows = [];
      const len = allPoints.length / 3;
      // get copy data
      for (let i = 0; i < len; i++) {
        const rowData = [allPoints[i * 3], allPoints[i * 3 + 1], allPoints[i * 3 + 2]];
        rowData.push(...additionalFieldNames.map((fieldName) => object?.[fieldName]?.[i]));
        dataRows.push(rowData.join(","));
      }

      const additionalColumns = hasAdditionalFieldNames ? `,${additionalFieldNames.join(",")}` : "";
      const dataStr = `x,y,z${additionalColumns}\n${dataRows.join("\n")}`;
      const blob = new Blob([dataStr], { type: "text/csv;charset=utf-8;" });
      downloadFiles([{ blob, fileName: "PointCloud.csv" }]);
      setIsOpen(false);
    },
    [additionalFieldNames, hasAdditionalFieldNames, object]
  );
  const onToggle = useCallback(() => setIsOpen((open) => !open), []);

  if (!clickedPoint) {
    return null;
  }

  const colorStyle = clickedPointColor ? { color: `rgba(${clickedPointColor.join(",")})` } : {};

  return (
    <>
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <ChildToggle position="below" onToggle={onToggle} isOpen={isOpen}>
          <Icon
            small
            fade
            active={isOpen}
            tooltip={hasAdditionalFieldNames ? "Export points and fields" : "Export points"}>
            <ExportVariantIcon />
          </Icon>
          <Menu>
            <Item
              onClick={() => {
                clipboard.copy(clickedPoint.join(", ")).then(() => {
                  setIsOpen(false);
                });
              }}>
              Copy clicked point to clipboard
            </Item>
            <Item onClick={onCopy}>
              {hasAdditionalFieldNames ? "Download all points and fields as CSV" : "Download all points as CSV"}
            </Item>
          </Menu>
        </ChildToggle>
      </div>
      <SRow>
        <SLabel width={hasAdditionalFieldNames ? 72 : 44}>Point:</SLabel>
        <SValue style={{ flex: 1, lineHeight: 1.4, ...colorStyle }}>
          {clickedPoint.map((x) => (typeof x === "number" ? x : JSON.stringify(x))).join(", ")}
        </SValue>
      </SRow>
      {additionalFieldValues && (
        <>
          {Object.keys(additionalFieldValues).map((fieldName) => (
            <SRow key={fieldName}>
              <SLabel width={72}>{fieldName.charAt(0).toUpperCase() + fieldName.slice(1)}:</SLabel>
              <SValue>{additionalFieldValues[fieldName]}</SValue>
            </SRow>
          ))}
        </>
      )}
    </>
  );
}
