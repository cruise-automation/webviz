// @flow
//
//  Copyright (c) 2020-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import * as React from "react";

import { useMessagePipeline } from "webviz-core/src/components/MessagePipeline";
import type { RosDatatypes } from "webviz-core/src/types/RosDatatypes";
import { isNumberType } from "webviz-core/src/util/binaryObjects/messageDefinitionUtils";
import {
  RADAR_POINT_CLOUD,
  SENSOR_MSGS$POINT_CLOUD_2,
  WRAPPED_POINT_CLOUD,
} from "webviz-core/src/util/globalConstants";

export type StructuralDatatypes = { [topicName: string]: "radarPointCloud" };

function getDatatypesFromContext(context) {
  return { datatypes: context.datatypes };
}

function isRadarPointCloud(typeName, datatypes) {
  const datatype = datatypes[typeName];
  if (!datatype) {
    return false;
  }
  const pointsField = datatype.fields.find((f) => f.name === "points");
  if (!pointsField || !pointsField.isArray) {
    return false;
  }
  const pointDatatype = datatypes[pointsField.type];
  if (!pointDatatype) {
    return false;
  }
  return ["range", "azimuth_angle_0", "elevation_angle", "radial_vel"].every((fieldName) => {
    const field = pointDatatype.fields.find((f) => f.name === fieldName);
    return field && isNumberType(field.type) && !field.isArray;
  });
}

function isWrappedPointCloud(typeName, datatypes) {
  const datatype = datatypes[typeName];
  if (!datatype) {
    return false;
  }
  const cloudField = datatype.fields.find((f) => f.name === "cloud");
  return cloudField && !cloudField.isArray && cloudField.type === SENSOR_MSGS$POINT_CLOUD_2;
}

// Exported for tests
export function getStructuralDatatypes(datatypes: RosDatatypes) {
  const ret = {};
  Object.keys(datatypes).forEach((datatype) => {
    if (isRadarPointCloud(datatype, datatypes)) {
      ret[datatype] = RADAR_POINT_CLOUD;
    } else if (isWrappedPointCloud(datatype, datatypes)) {
      ret[datatype] = WRAPPED_POINT_CLOUD;
    }
  });
  return ret;
}

export function useStructuralDatatypes(): StructuralDatatypes {
  const { datatypes } = useMessagePipeline(getDatatypesFromContext);
  return React.useMemo(() => getStructuralDatatypes(datatypes), [datatypes]);
}
