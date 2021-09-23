// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import * as React from "react";
import { PolygonBuilder, Polygon } from "regl-worldview";
import styled from "styled-components";

import { polygonPointsValidator } from "webviz-core/shared/validators";
import Button from "webviz-core/src/components/Button";
import PanelContext from "webviz-core/src/components/PanelContext";
import ValidatedInput, { type EditFormat } from "webviz-core/src/components/ValidatedInput";
import { SValue, SLabel } from "webviz-core/src/panels/ThreeDimensionalViz/Interactions/Interactions";
import {
  polygonsToPoints,
  getFormattedString,
  pointsToPolygons,
  getPolygonLineDistances,
} from "webviz-core/src/panels/ThreeDimensionalViz/utils/drawToolUtils";
import clipboard from "webviz-core/src/util/clipboard";

export type Point2D = {| x: number, y: number |};

export const SRow = styled.div`
  display: flex;
  align-items: center;
  padding: 8px 0;
`;

type Props = {
  onSetPolygons: (polygons: Polygon[]) => void,
  polygonBuilder: PolygonBuilder,
  selectedPolygonEditFormat: EditFormat,
};

export default function Polygons({ onSetPolygons, polygonBuilder, selectedPolygonEditFormat }: Props) {
  const { saveConfig } = React.useContext(PanelContext) || {};
  const [polygonPoints, setPolygonPoints] = React.useState<Point2D[][]>(() =>
    polygonsToPoints(polygonBuilder.polygons)
  );

  polygonBuilder.onChange = () => setPolygonPoints(polygonsToPoints(polygonBuilder.polygons));

  const onChangePolygonPoints = React.useCallback((newPolygonPoints) => {
    if (newPolygonPoints) {
      setPolygonPoints(newPolygonPoints);
      onSetPolygons(pointsToPolygons(newPolygonPoints));
    }
  }, [onSetPolygons]);

  const clearPolygons = React.useCallback(() => onChangePolygonPoints([]), [onChangePolygonPoints]);

  const copyPolygons = React.useCallback(() => {
    clipboard.copy(getFormattedString(polygonPoints, selectedPolygonEditFormat));
  }, [polygonPoints, selectedPolygonEditFormat]);

  return (
    <>
      <ValidatedInput
        format={selectedPolygonEditFormat}
        value={polygonPoints}
        onSelectFormat={(selectedFormat) => saveConfig({ selectedPolygonEditFormat: selectedFormat })}
        onChange={onChangePolygonPoints}
        dataValidator={polygonPointsValidator}>
        <Button small tooltip="Clear Polygons" onClick={clearPolygons}>
          Clear
        </Button>
        <Button small tooltip="Copy Polygons" onClick={copyPolygons}>
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
    </>
  );
}
