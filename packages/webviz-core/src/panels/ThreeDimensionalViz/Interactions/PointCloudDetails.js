// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import ExportVariantIcon from "@mdi/svg/svg/export-variant.svg";
import React, { useState, useCallback } from "react";
import Tree from "react-json-tree";

import ChildToggle from "webviz-core/src/components/ChildToggle";
import Icon from "webviz-core/src/components/Icon";
import Menu from "webviz-core/src/components/Menu";
import Item from "webviz-core/src/components/Menu/Item";
import { downloadFiles } from "webviz-core/src/util";
import clipboard from "webviz-core/src/util/clipboard";
import { jsonTreeTheme } from "webviz-core/src/util/globalConstants";

type Props = {
  pointDetails: {
    index: number,
    color: [number, number, number, number],
    decodedData: { [field: string]: number }[],
  },
};

function pointsToCsv(data) {
  // There's always at least one point -- you can't click on "no points".
  const fieldNames = Object.keys(data[0] ?? {});
  const rows = [fieldNames.join(",")];
  data.forEach((row) => {
    rows.push(fieldNames.map((name) => row[name] ?? "").join(","));
  });
  return rows.join("\n");
}

export default function PointCloudDetails({ pointDetails: { color, decodedData, index } }: Props) {
  const [isOpen, setIsOpen] = useState<boolean>(false);

  const onCopy = useCallback(() => {
    const blob = new Blob([pointsToCsv(decodedData)], { type: "text/csv;charset=utf-8;" });
    downloadFiles([{ blob, fileName: "PointCloud.csv" }]);
    setIsOpen(false);
  }, [decodedData]);
  const onToggle = useCallback(() => setIsOpen((open) => !open), []);

  const clickedPoint = decodedData[index];
  if (!clickedPoint) {
    return null;
  }

  return (
    <>
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <ChildToggle position="below" onToggle={onToggle} isOpen={isOpen}>
          <Icon small fade active={isOpen} tooltip="Export data">
            <ExportVariantIcon />
          </Icon>
          <Menu>
            <Item
              onClick={() => {
                clipboard.copy(pointsToCsv([clickedPoint])).then(() => {
                  setIsOpen(false);
                });
              }}>
              Copy clicked point to clipboard
            </Item>
            <Item onClick={onCopy}>{"Download point cloud as CSV"}</Item>
          </Menu>
        </ChildToggle>
      </div>
      <Tree
        data={{ clickedPoint, decodedData }}
        shouldExpandNode={(keyPath) => keyPath.length === 1 && keyPath[0] === "clickedPoint"}
        invertTheme={false}
        theme={{
          extend: jsonTreeTheme,
          tree: { margin: 0 },
          nestedNodeLabel: ({ style }, keyPath) => {
            // Color clickedPoint label the same as the point itself.
            if (keyPath.length === 1 && keyPath[0] === "clickedPoint") {
              return { style: { ...style, color: `rgba(${color.join(",")})` } };
            }
          },
        }}
        hideRoot
      />
    </>
  );
}
