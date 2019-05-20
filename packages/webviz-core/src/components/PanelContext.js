// @flow
//
//  Copyright (c) 2018-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import * as React from "react";

// Context used for components to know which panel they are inside
const PanelContext = React.createContext<?{| type: string, id: string, title: string, topicPrefix?: string |}>();

export default PanelContext;
