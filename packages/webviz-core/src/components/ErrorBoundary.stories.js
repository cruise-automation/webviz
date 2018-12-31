// @flow
//
//  Copyright (c) 2018-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { storiesOf } from "@storybook/react";
import * as React from "react";
import { DragDropContextProvider } from "react-dnd";
import HTML5Backend from "react-dnd-html5-backend";
import { withScreenshot } from "storybook-chrome-screenshot";

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

storiesOf("<ErrorBoundary>", module)
  .addDecorator(withScreenshot())
  .add("examples", () => {
    return (
      <DragDropContextProvider backend={HTML5Backend}>
        <ErrorBoundary>
          <Broken />
        </ErrorBoundary>
      </DragDropContextProvider>
    );
  });
