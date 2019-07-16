// @flow
//
//  Copyright (c) 2018-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import * as React from "react";
import { PolygonBuilder, Polygon } from "regl-worldview";
import styled from "styled-components";

import type { ThreeDimensionalVizConfig } from "../index";
import Button from "webviz-core/src/components/Button";
import ValidatedInput, { type EditFormat } from "webviz-core/src/components/ValidatedInput";
import { polygonPointsValidator } from "webviz-core/src/components/validators";
import { SValue } from "webviz-core/src/panels/ThreeDimensionalViz/DrawingTools/CameraInfo";
import {
  polygonsToPoints,
  getFormattedString,
  pointsToPolygons,
  getPolygonLineDistances,
} from "webviz-core/src/panels/ThreeDimensionalViz/utils/drawToolUtils";
import type { SaveConfig } from "webviz-core/src/types/panels";
import clipboard from "webviz-core/src/util/clipboard";

export type Point2D = {| x: number, y: number |};

export const SRow = styled.div`
  display: flex;
  align-items: center;
  padding: 8px 0;
`;

export const SLabel = styled.label`
  width: 80px;
  margin: 4px 0;
`;

type Props = {
  saveConfig: SaveConfig<ThreeDimensionalVizConfig>,
  onSetPolygons: (polygons: Polygon[]) => void,
  polygonBuilder: PolygonBuilder,
  selectedPolygonEditFormat: EditFormat,
};

export default function Polygons({ saveConfig, onSetPolygons, polygonBuilder, selectedPolygonEditFormat }: Props) {
  const polygons: Polygon[] = polygonBuilder.polygons;
  const [polygonPoints, setPolygonPoints] = React.useState<Point2D[][]>(() => polygonsToPoints(polygons));
  function polygonBuilderOnChange() {
    setPolygonPoints(polygonsToPoints(polygons));
  }
  polygonBuilder.onChange = polygonBuilderOnChange;

  return (
    <div style={{ width: 236 }}>
      <ValidatedInput
        format={selectedPolygonEditFormat}
        value={polygonPoints}
        onSelectFormat={(selectedFormat) => saveConfig({ selectedPolygonEditFormat: selectedFormat })}
        onChange={(polygonPoints) => {
          if (polygonPoints) {
            setPolygonPoints(polygonPoints);
            onSetPolygons(pointsToPolygons(polygonPoints));
          }
        }}
        dataValidator={polygonPointsValidator}>
        <Button
          small
          tooltip="Copy Polygons"
          onClick={() => clipboard.copy(getFormattedString(polygonPoints, selectedPolygonEditFormat))}>
          Copy
        </Button>
      </ValidatedInput>
      <SRow>
        <SLabel>Total length:</SLabel>
        <SValue>{getPolygonLineDistances(polygonPoints).toFixed(2)} m</SValue>
      </SRow>
      <p style={{ marginTop: 0 }}>
        <em>
          Start drawing by holding <b>ctrl</b> and clicking on the 3D panel.
        </em>
      </p>
    </div>
  );
}
