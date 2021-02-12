// @flow
//
//  Copyright (c) 2020-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import getPrettifiedCode from "./prettier";

describe("getPrettifiedCode", () => {
  it("formats valid Typescript code", async () => {
    const unformattedValidCode = `
      import { Input,   Messages  } from "ros";;
      const VALUE =
      "val";
      const publisher = (message: Input< "/foo/bar">
      ): Messages.visualization_msgs__WebvizMarkerArray | undefined => {
        return { VALUE
        }}
    `;
    const formattedCode = await getPrettifiedCode(unformattedValidCode);
    expect(formattedCode).toMatchSnapshot();
  });

  it("throws an error for invalid code", async () => {
    const unformattedInvalidCode = `
      import { Input,  from "ros"; // Missing closing curly
      const publisher = (): => { // Missing type
        return;
      }
    `;
    expect(getPrettifiedCode(unformattedInvalidCode)).rejects.not.toBeFalsy();
  });
});
