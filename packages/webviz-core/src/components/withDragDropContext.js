// @flow
//
//  Copyright (c) 2018-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { DragDropContext } from "react-dnd";
import HTML5Backend from "react-dnd-html5-backend";

// separate creation of this into a helper module so that a second copy isn't created during
// hot module reloading (unless this module changes)
export default DragDropContext<{}, {}>(HTML5Backend);
