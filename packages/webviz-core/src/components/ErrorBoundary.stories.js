// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { storiesOf } from "@storybook/react";
import * as React from "react";
import { DndProvider } from "react-dnd";
import HTML5Backend from "react-dnd-html5-backend";

import ErrorBoundary from "./ErrorBoundary";

// eslint-disable-next-line react/require-render-return
class Broken extends React.Component<{}> {
  render() {
    throw {
      stack: `
  an error occurred
  it's caught by this component
  now the user sees
      `,
    };
  }
}

storiesOf("<ErrorBoundary>", module).add("examples", () => {
  return (
    <DndProvider backend={HTML5Backend}>
      <ErrorBoundary>
        <Broken />
      </ErrorBoundary>
    </DndProvider>
  );
});
