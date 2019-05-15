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
import ChildToggle from "webviz-core/src/components/ChildToggle";
import { MockPanelContextProvider } from "webviz-core/src/components/Panel";
import rootReducer from "webviz-core/src/reducers";
import configureStore from "webviz-core/src/store/configureStore.testing";

class MosaicWrapper extends React.Component<{| layout?: any, children: React.Node, width?: number |}> {
  render() {
    const { width = 300 } = this.props;
    return (
      <Mosaic
        renderTile={(id, path) => (
          <MosaicWindow path={path} toolbarControls={<div />}>
            <div style={{ width, height: 300, padding: 30, position: "relative" }}>
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
            // wait for react-container-dimensions
            setImmediate(() => {
              const gearIcon = el.querySelectorAll("svg")[1];
              // $FlowFixMe
              gearIcon.parentElement.click();
            });
          }
        }}>
        <PanelToolbar helpContent={<div />}>
          <div style={{ width: "100%", lineHeight: "22px", paddingLeft: 5 }}>Some controls here</div>
        </PanelToolbar>
      </div>
    );
  }
}

// Keep PanelToolbar visible by rendering an empty ChildToggle inside the toolbar
function KeepToolbarVisibleHack() {
  return (
    <ChildToggle isOpen={true} onToggle={() => {}} position="above">
      <span />
      <span />
    </ChildToggle>
  );
}

storiesOf("<PanelToolbar>", module)
  .addDecorator(withScreenshot())
  .addDecorator((childrenRenderFcn) => {
    // Provide all stories with PanelContext and redux state
    return (
      <Provider store={configureStore(rootReducer)}>
        <MockPanelContextProvider>{childrenRenderFcn()}</MockPanelContextProvider>
      </Provider>
    );
  })
  .add("non-floating (narrow)", () => {
    return (
      <MosaicWrapper>
        <PanelToolbar helpContent={<div />}>
          <div style={{ width: "100%", lineHeight: "22px", paddingLeft: 5 }}>Some controls here</div>
          <KeepToolbarVisibleHack />
        </PanelToolbar>
      </MosaicWrapper>
    );
  })
  .add("non-floating (wide with panel name)", () => {
    return (
      <MosaicWrapper width={500}>
        <PanelToolbar helpContent={<div />}>
          <div style={{ width: "100%", lineHeight: "22px", paddingLeft: 5 }}>Some controls here</div>
          <KeepToolbarVisibleHack />
        </PanelToolbar>
      </MosaicWrapper>
    );
  })
  .add("menu (only panel)", () => {
    class Story extends React.Component<{}> {
      render() {
        return (
          <MosaicWrapper>
            <PanelToolbarWithOpenMenu />
          </MosaicWrapper>
        );
      }
    }
    return <Story />;
  })
  .add("menu (with sibling panel)", () => {
    class Story extends React.Component<{}> {
      render() {
        return (
          <MosaicWrapper layout={{ direction: "row", first: "dummy", second: "X" }}>
            <PanelToolbarWithOpenMenu />
          </MosaicWrapper>
        );
      }
    }
    return <Story />;
  });
