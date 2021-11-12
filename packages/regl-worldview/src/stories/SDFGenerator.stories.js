//  Copyright (c) 2018-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { storiesOf } from "@storybook/react";
import React from "react";

import SDFGenerator from "../utils/SDFGenerator";

storiesOf("Worldview/SDFGenerator", module)
  .add("default", () => {
    return (
      <div>
        <SDFGenerator fontSize={160} />
      </div>
    );
  })
  .add("default 80", () => {
    return (
      <div>
        <SDFGenerator fontSize={80} />
      </div>
    );
  })
  .add("default 40", () => {
    return (
      <div>
        <SDFGenerator fontSize={40} />
      </div>
    );
  });
