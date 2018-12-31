// @flow
//
//  Copyright (c) 2018-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { storiesOf } from "@storybook/react";
import * as React from "react";
import { Mosaic, MosaicWindow } from "react-mosaic-component";
import { Provider } from "react-redux";
import { withScreenshot } from "storybook-chrome-screenshot";

import PanelToolbar from "./index";
import rootReducer from "webviz-core/src/reducers";
import configureStore from "webviz-core/src/store/configureStore.testing";

class MosaicWrapper extends React.Component<{| layout?: any, children: React.Node |}> {
  render() {
    return (
      <Mosaic
        renderTile={(id, path) => (
          <MosaicWindow path={path} toolbarControls={<div />}>
            <div style={{ width: 300, height: 300, padding: 30, position: "relative" }}>
              {id === "dummy" ? this.props.children : "Sibling Panel"}
            </div>
          </MosaicWindow>
        )}
        value={this.props.layout || "dummy"}
        className="none"
      />
    );
  }
}

class PanelToolbarWithOpenMenu extends React.PureComponent<{}> {
  render() {
    return (
      <div
        ref={(el) => {
          if (el) {
            const gearIcon = el.querySelectorAll("svg")[1];
            // $FlowFixMe
            gearIcon.parentElement.click();
          }
        }}>
        <PanelToolbar helpContent={<div />}>
          <div style={{ width: "100%", lineHeight: "22px", paddingLeft: 5 }}>Some controls here</div>
        </PanelToolbar>
      </div>
    );
  }
}

storiesOf("<PanelToolbar>", module)
  .addDecorator(withScreenshot())
  .add("non-floating", () => {
    return (
      <MosaicWrapper>
        <PanelToolbar helpContent={<div />}>
          <div style={{ width: "100%", lineHeight: "22px", paddingLeft: 5 }}>Some controls here</div>
        </PanelToolbar>
      </MosaicWrapper>
    );
  })
  .add("menu (only panel)", () => {
    class Story extends React.Component<{}> {
      render() {
        return (
          <Provider store={configureStore(rootReducer)}>
            <MosaicWrapper>
              <PanelToolbarWithOpenMenu />
            </MosaicWrapper>
          </Provider>
        );
      }
    }
    return <Story />;
  })
  .add("menu (with sibling panel)", () => {
    class Story extends React.Component<{}> {
      render() {
        return (
          <Provider store={configureStore(rootReducer)}>
            <MosaicWrapper layout={{ direction: "row", first: "dummy", second: "X" }}>
              <PanelToolbarWithOpenMenu />
            </MosaicWrapper>
          </Provider>
        );
      }
    }
    return <Story />;
  });
