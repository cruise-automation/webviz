// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.
import * as React from "react";
import { DndProvider } from "react-dnd";
import HTML5Backend from "react-dnd-html5-backend";

function withDragDropContext<T: any>(Component: React.ComponentType<T>) {
  class ComponentWithDragDropContext extends React.Component<T> {
    render() {
      return (
        <DndProvider backend={HTML5Backend}>
          <Component {...this.props} />
        </DndProvider>
      );
    }
  }
  return ComponentWithDragDropContext;
}
// separate creation of this into a helper module so that a second copy isn't created during
// hot module reloading (unless this module changes)
export default withDragDropContext;
