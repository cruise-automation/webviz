// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { uniqBy } from "lodash";

import { basicDatatypes } from "./datatypes";
import rosDatatypesToMessageDefinition from "./rosDatatypesToMessageDefinition";
import { WEBVIZ_MARKER_ARRAY_DATATYPE, WEBVIZ_MARKER_DATATYPE } from "webviz-core/src/util/globalConstants";

describe("rosDatatypesToMessageDefinition", () => {
  it(`Includes all of the definitions for "visualization_msgs/WebvizMarkerArray"`, () => {
    expect(rosDatatypesToMessageDefinition(basicDatatypes, WEBVIZ_MARKER_ARRAY_DATATYPE)).toMatchSnapshot();
  });

  it("produces a correct message definition", () => {
    const definitions = rosDatatypesToMessageDefinition(basicDatatypes, WEBVIZ_MARKER_ARRAY_DATATYPE);
    // Should have 1 definition without a name, the root datatype.
    expect(definitions.filter(({ name }) => !name).length).toEqual(1);
    // Should not duplicate definitions.
    expect(uniqBy(definitions, "name").length).toEqual(definitions.length);
  });

  it("Errors if it can't find the definition", () => {
    const datatypes = {
      [WEBVIZ_MARKER_ARRAY_DATATYPE]: {
        fields: [
          {
            isArray: true,
            isComplex: true,
            arrayLength: undefined,
            name: "markers",
            type: WEBVIZ_MARKER_DATATYPE,
          },
          {
            isArray: false,
            isComplex: true,
            name: "header",
            type: "std_msgs/Header",
          },
        ],
      },
    };
    expect(() => rosDatatypesToMessageDefinition(datatypes, WEBVIZ_MARKER_ARRAY_DATATYPE)).toThrow(
      `While searching datatypes for "visualization_msgs/WebvizMarkerArray", could not find datatype "std_msgs/Header"`
    );
  });
});
