// @flow
//
//  Copyright (c) 2018-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import * as React from "react";
import { DragDropContextProvider } from "react-dnd";
import HTML5Backend from "react-dnd-html5-backend";
import { Provider } from "react-redux";
import { TimeUtil } from "rosbag";

import { setAuxiliaryData } from "webviz-core/src/actions/extensions";
import {
  capabilitiesReceived,
  datatypesReceived,
  frameReceived,
  playerStateChanged,
  topicsReceived,
} from "webviz-core/src/actions/player";
import rootReducer from "webviz-core/src/reducers";
import configureStore from "webviz-core/src/store/configureStore.testing";
import type { Frame, PlayerStatePayload, Topic } from "webviz-core/src/types/players";
import type { RosDatatypes } from "webviz-core/src/types/RosDatatypes";

export type Fixture = {|
  frame: Frame,
  topics: Topic[],
  capabilities?: string[],
  playerState?: PlayerStatePayload,
  datatypes?: RosDatatypes,
  auxiliaryData?: Object,
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
    const { frame, topics, playerState, datatypes, capabilities, auxiliaryData } = props.fixture;

    // Set `lastSeekTime` to current time so the panel resets but also so the
    // global cache is cleared.
    store.dispatch({ type: "PLAYBACK_RESET" });

    if (datatypes) {
      store.dispatch(datatypesReceived(datatypes));
    } else {
      const dummyDatatypes = {};
      for (const { datatype } of topics) {
        dummyDatatypes[datatype] = [];
      }
      store.dispatch(datatypesReceived(dummyDatatypes));
    }
    store.dispatch(topicsReceived(topics));
    if (playerState) {
      store.dispatch(playerStateChanged(playerState));
    }
    if (frame) {
      let currentTime;
      for (const messages of Object.values(frame)) {
        // $FlowFixMe - Flow doesn't seem to understand that `messages` is an array.
        for (const message of messages) {
          if (!currentTime || TimeUtil.isLessThan(currentTime, message.receiveTime)) {
            currentTime = message.receiveTime;
          }
        }
      }
      store.dispatch(frameReceived(frame, currentTime));
    }
    if (capabilities) {
      store.dispatch(capabilitiesReceived(capabilities));
    }
    if (auxiliaryData) {
      store.dispatch(setAuxiliaryData(() => auxiliaryData));
    }
    return { store };
  }

  state = {
    store: configureStore(rootReducer),
  };

  renderInner() {
    return (
      <Provider store={this.state.store}>
        <div
          style={{ width: "100%", height: "100%", display: "flex", ...this.props.style }}
          ref={(el: ?HTMLDivElement) => {
            if (el && this.props.onMount) {
              this.props.onMount(el);
            }
          }}>
          {this.props.children}
        </div>
      </Provider>
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
