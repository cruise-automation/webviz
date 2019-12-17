// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { createMemoryHistory } from "history";
import { flatten } from "lodash";
import * as React from "react";
import { DragDropContextProvider } from "react-dnd";
import HTML5Backend from "react-dnd-html5-backend";

import { setAuxiliaryData } from "webviz-core/src/actions/extensions";
import { overwriteGlobalVariables, setUserNodes, setLinkedGlobalVariables } from "webviz-core/src/actions/panels";
import { setUserNodeDiagnostics, addUserNodeLogs, setUserNodeTrust } from "webviz-core/src/actions/userNodes";
import { MockMessagePipelineProvider } from "webviz-core/src/components/MessagePipeline";
import { type GlobalVariables } from "webviz-core/src/hooks/useGlobalVariables";
import { type LinkedGlobalVariables } from "webviz-core/src/panels/ThreeDimensionalViz/Interactions/useLinkedGlobalVariables";
import type { Frame, Topic, PlayerStateActiveData } from "webviz-core/src/players/types";
import type { UserNodeDiagnostics, UserNodeLogs } from "webviz-core/src/players/UserNodePlayer/types";
import createRootReducer from "webviz-core/src/reducers";
import configureStore from "webviz-core/src/store/configureStore.testing";
import type { UserNodes } from "webviz-core/src/types/panels";
import type { RosDatatypes } from "webviz-core/src/types/RosDatatypes";

export type Fixture = {|
  frame: Frame,
  topics: Topic[],
  capabilities?: string[],
  activeData?: $Shape<PlayerStateActiveData>,
  datatypes?: RosDatatypes,
  auxiliaryData?: any,
  globalVariables?: GlobalVariables,
  linkedGlobalVariables?: LinkedGlobalVariables,
  userNodes?: UserNodes,
  userNodeDiagnostics?: UserNodeDiagnostics,
  userNodeFlags?: { id: string, trusted: boolean },
  userNodeLogs?: UserNodeLogs,
|};

type Props = {|
  children: React.Node,
  fixture: Fixture,
  omitDragAndDrop?: boolean,
  onMount?: (HTMLDivElement) => void,
  onFirstMount?: (HTMLDivElement) => void,
  style?: { [string]: any },
|};

type State = {|
  store: *,
|};

function setNativeValue(element, value) {
  // $FlowFixMe
  const valueSetter = Object.getOwnPropertyDescriptor(element, "value").set;
  const prototype = Object.getPrototypeOf(element);
  // $FlowFixMe
  const prototypeValueSetter = Object.getOwnPropertyDescriptor(prototype, "value").set;
  if (valueSetter && valueSetter !== prototypeValueSetter) {
    // $FlowFixMe
    prototypeValueSetter.call(element, value);
  } else {
    // $FlowFixMe
    valueSetter.call(element, value);
  }
}

export function triggerInputChange(node: window.HTMLInputElement | window.HTMLTextAreaElement, value: string = "") {
  // force trigger textarea to change
  node.value = `${value} `;
  // trigger input change: https://stackoverflow.com/questions/23892547/what-is-the-best-way-to-trigger-onchange-event-in-react-js
  setNativeValue(node, value);

  const ev = new Event("input", { bubbles: true });
  node.dispatchEvent(ev);
}

export function triggerInputBlur(node: window.HTMLInputElement | window.HTMLTextAreaElement) {
  const ev = new Event("blur", { bubbles: true });
  node.dispatchEvent(ev);
}

export function triggerWheel(target: HTMLElement, deltaX: number) {
  const event = document.createEvent("MouseEvents");
  event.initEvent("wheel", true, true);
  // $FlowFixMe
  event.deltaX = deltaX;
  target.dispatchEvent(event);
}

export default class PanelSetup extends React.PureComponent<Props, State> {
  static getDerivedStateFromProps(props: Props, prevState: State) {
    const { store } = prevState;
    const {
      auxiliaryData,
      globalVariables,
      userNodes,
      linkedGlobalVariables,
      userNodeDiagnostics,
      userNodeFlags,
      userNodeLogs,
    } = props.fixture;
    if (auxiliaryData) {
      store.dispatch(setAuxiliaryData(() => auxiliaryData));
    }
    if (globalVariables) {
      store.dispatch(overwriteGlobalVariables(globalVariables));
    }
    if (userNodes) {
      store.dispatch(setUserNodes(userNodes));
    }
    if (linkedGlobalVariables) {
      store.dispatch(setLinkedGlobalVariables(linkedGlobalVariables));
    }
    if (userNodeDiagnostics) {
      store.dispatch(setUserNodeDiagnostics(userNodeDiagnostics));
    }
    if (userNodeFlags) {
      store.dispatch(setUserNodeTrust(userNodeFlags));
    }
    if (userNodeLogs) {
      store.dispatch(addUserNodeLogs(userNodeLogs));
    }
    return { store };
  }

  _hasMounted: boolean = false;

  state = {
    store: configureStore(createRootReducer(createMemoryHistory())),
  };

  renderInner() {
    const { frame, topics, datatypes, capabilities, activeData } = this.props.fixture;
    let dTypes = datatypes;
    if (!dTypes) {
      const dummyDatatypes: RosDatatypes = {};
      for (const { datatype } of topics) {
        dummyDatatypes[datatype] = { fields: [] };
      }
      dTypes = dummyDatatypes;
    }
    return (
      <div
        style={{ width: "100%", height: "100%", display: "flex", ...this.props.style }}
        ref={(el: ?HTMLDivElement) => {
          const { onFirstMount, onMount } = this.props;
          if (el && onFirstMount && !this._hasMounted) {
            this._hasMounted = true;
            onFirstMount(el);
          }
          if (el && onMount) {
            onMount(el);
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
