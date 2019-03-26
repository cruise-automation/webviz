// @flow
//
//  Copyright (c) 2018-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { flatten } from "lodash";
import * as React from "react";
import { DragDropContextProvider } from "react-dnd";
import HTML5Backend from "react-dnd-html5-backend";

import { setAuxiliaryData } from "webviz-core/src/actions/extensions";
import { overwriteGlobalData } from "webviz-core/src/actions/panels";
import { MockMessagePipelineProvider } from "webviz-core/src/components/MessagePipeline";
import rootReducer from "webviz-core/src/reducers";
import configureStore from "webviz-core/src/store/configureStore.testing";
import type { Frame, Topic, PlayerStateActiveData } from "webviz-core/src/types/players";
import type { RosDatatypes } from "webviz-core/src/types/RosDatatypes";

export type Fixture = {|
  frame: Frame,
  topics: Topic[],
  capabilities?: string[],
  activeData?: $Shape<PlayerStateActiveData>,
  datatypes?: RosDatatypes,
  auxiliaryData?: Object,
  globalData?: Object,
|};

type Props = {|
  children: React.Node,
  fixture: Fixture,
  omitDragAndDrop?: boolean,
  onMount?: (HTMLDivElement) => void,
  style?: { [string]: any },
|};

type State = {|
  store: *,
|};

export default class PanelSetup extends React.PureComponent<Props, State> {
  static getDerivedStateFromProps(props: Props, prevState: State) {
    const { store } = prevState;
    const { auxiliaryData, globalData } = props.fixture;
    if (auxiliaryData) {
      store.dispatch(setAuxiliaryData(() => auxiliaryData));
    }
    if (globalData) {
      store.dispatch(overwriteGlobalData(globalData));
    }
    return { store };
  }

  state = {
    store: configureStore(rootReducer),
  };

  renderInner() {
    const { frame, topics, datatypes, capabilities, activeData } = this.props.fixture;
    let dTypes = datatypes;
    if (!dTypes) {
      const dummyDatatypes = {};
      for (const { datatype } of topics) {
        dummyDatatypes[datatype] = [];
      }
      dTypes = dummyDatatypes;
    }
    return (
      <div
        style={{ width: "100%", height: "100%", display: "flex", ...this.props.style }}
        ref={(el: ?HTMLDivElement) => {
          if (el && this.props.onMount) {
            this.props.onMount(el);
          }
        }}>
        {/* $FlowFixMe - for some reason Flow doesn't like this :( */}
        <MockMessagePipelineProvider
          capabilities={capabilities}
          topics={topics}
          datatypes={dTypes}
          messages={flatten(Object.values(frame || {}))}
          activeData={activeData}
          store={this.state.store}>
          {this.props.children}
        </MockMessagePipelineProvider>
      </div>
    );
  }

  render() {
    return this.props.omitDragAndDrop ? (
      this.renderInner()
    ) : (
      <DragDropContextProvider backend={HTML5Backend}>{this.renderInner()}</DragDropContextProvider>
    );
  }
}
