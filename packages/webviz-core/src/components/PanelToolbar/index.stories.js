// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import DatabaseIcon from "@mdi/svg/svg/database.svg";
import { storiesOf } from "@storybook/react";
import { createMemoryHistory } from "history";
import * as React from "react";
import { Mosaic, MosaicWindow } from "react-mosaic-component";
import { Provider } from "react-redux";

import PanelToolbar from "./index";
import ChildToggle from "webviz-core/src/components/ChildToggle";
import Icon from "webviz-core/src/components/Icon";
import MockPanelContextProvider from "webviz-core/src/components/MockPanelContextProvider";
import createRootReducer from "webviz-core/src/reducers";
import configureStore from "webviz-core/src/store/configureStore.testing";

class MosaicWrapper extends React.Component<{| layout?: any, children: React.Node, width?: number |}> {
  render() {
    const { width = 300 } = this.props;
    return (
      <Mosaic
        renderTile={(id, path) => (
          <MosaicWindow path={path} toolbarControls={<div />} renderPreview={() => null}>
            <div style={{ width, height: 300, padding: 30, position: "relative" }}>
              {id === "Sibling" ? "Sibling Panel" : this.props.children}
            </div>
          </MosaicWindow>
        )}
        value={this.props.layout || "dummy"}
        className="none"
      />
    );
  }
}

class PanelToolbarWithOpenMenu extends React.PureComponent<{ hideToolbars?: boolean }> {
  render() {
    return (
      <div
        ref={(el) => {
          if (el) {
            // wait for Dimensions
            setTimeout(() => {
              const gearIcon = el.querySelectorAll("svg")[1];
              // $FlowFixMe
              gearIcon.parentElement.click();
            }, 100);
          }
        }}>
        <PanelToolbar hideToolbars={this.props.hideToolbars} helpContent={<div />}>
          <div style={{ width: "100%", lineHeight: "22px", paddingLeft: 5 }}>Some controls here</div>
          <KeepToolbarVisibleHack />
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
  .addDecorator((childrenRenderFcn) => {
    // Provide all stories with PanelContext and redux state
    return (
      <Provider store={configureStore(createRootReducer(createMemoryHistory()))}>
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
  .add("one additional icon", () => {
    const additionalIcons = (
      <Icon>
        <DatabaseIcon />
      </Icon>
    );
    return (
      <MosaicWrapper width={500}>
        <PanelToolbar helpContent={<div />} additionalIcons={additionalIcons}>
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
          <MosaicWrapper layout={{ direction: "row", first: "dummy", second: "Sibling" }}>
            <PanelToolbarWithOpenMenu />
          </MosaicWrapper>
        );
      }
    }
    return <Story />;
  })
  .add("menu for Tab panel", () => {
    class Story extends React.Component<{}> {
      render() {
        return (
          <MosaicWrapper layout={{ direction: "row", first: "Tab", second: "Sibling" }}>
            <PanelToolbarWithOpenMenu />
          </MosaicWrapper>
        );
      }
    }
    return <Story />;
  })
  .add("no toolbars", () => {
    class Story extends React.Component<{}> {
      render() {
        return (
          <MosaicWrapper layout={{ direction: "row", first: "dummy", second: "Sibling" }}>
            <PanelToolbarWithOpenMenu hideToolbars />
          </MosaicWrapper>
        );
      }
    }
    return <Story />;
  });
