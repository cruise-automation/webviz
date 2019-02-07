//  Copyright (c) 2018-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import React from "react";

export default function CodeSandbox({ size = 24, color = "#fff" }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24">
      <path d="M16.683594 19.621094v-4.769532l4.132812-2.394531v4.777344zm-9.410156-4.6875l-4.0625-2.355469v4.710937l4.0625 2.367188zm4.738281-8.300782l4.128906-2.398437-4.128906-2.40625-4.144531 2.417969zm0 0" />
      <path
        fill="none"
        stroke={color}
        strokeMiterlimit="10"
        strokeWidth="2.258"
        d="M20.7499903 6.9062468l-8.8046834 5.0820289v10.1601515M3.210936 6.9296842l8.7890585 5.0585915"
      />
      <path
        fill="none"
        stroke={color}
        strokeMiterlimit="10"
        strokeWidth="2.258"
        d="M3.1835923 17.093742l8.8046834 5.0546852 8.8046833-5.0703102V6.910153l-8.8046833-5.1054663-8.8046834 5.1249976zm0 0"
      />
    </svg>
  );
}
