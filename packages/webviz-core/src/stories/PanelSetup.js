// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { createMemoryHistory } from "history";
import { flatten, partition } from "lodash";
import * as React from "react";
import { DndProvider } from "react-dnd";
import HTML5Backend from "react-dnd-html5-backend";
import { Mosaic, MosaicWindow } from "react-mosaic-component";

import {
  changePanelLayout,
  overwriteGlobalVariables,
  savePanelConfigs,
  setLinkedGlobalVariables,
  setUserNodes,
} from "webviz-core/src/actions/panels";
import { setUserNodeDiagnostics, addUserNodeLogs, setUserNodeRosLib } from "webviz-core/src/actions/userNodes";
import { MockMessagePipelineProvider } from "webviz-core/src/components/MessagePipeline";
import { type GlobalVariables } from "webviz-core/src/hooks/useGlobalVariables";
import { type LinkedGlobalVariables } from "webviz-core/src/panels/ThreeDimensionalViz/Interactions/useLinkedGlobalVariables";
import type { Frame, Topic, PlayerStateActiveData, Progress } from "webviz-core/src/players/types";
import type { UserNodeDiagnostics, UserNodeLogs } from "webviz-core/src/players/UserNodePlayer/types";
import createRootReducer from "webviz-core/src/reducers";
import Store from "webviz-core/src/store";
import configureStore from "webviz-core/src/store/configureStore.testing";
import type { MosaicNode, SavedProps, UserNodes } from "webviz-core/src/types/panels";
import type { RosDatatypes } from "webviz-core/src/types/RosDatatypes";
import { objectValues } from "webviz-core/src/util";
import { isBobject } from "webviz-core/src/util/binaryObjects";

export type Fixture = {|
  frame: Frame,
  topics: Topic[],
  capabilities?: string[],
  activeData?: $Shape<PlayerStateActiveData>,
  progress?: Progress,
  datatypes?: RosDatatypes,
  globalVariables?: GlobalVariables,
  layout?: ?MosaicNode,
  linkedGlobalVariables?: LinkedGlobalVariables,
  userNodes?: UserNodes,
  userNodeDiagnostics?: UserNodeDiagnostics,
  userNodeFlags?: {| id: string |},
  userNodeLogs?: UserNodeLogs,
  userNodeRosLib?: string,
  savedProps?: SavedProps,
|};

type Props = {|
  children: React.Node,
  fixture: Fixture,
  omitDragAndDrop?: boolean,
  onMount?: (HTMLDivElement, store: Store) => ?Promise<any>, // optional promise to allow for awaits in onMount
  onFirstMount?: (HTMLDivElement) => void,
  store?: Store,
  style?: { [string]: any },
|};

type State = {|
  store: Store,
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

export const MosaicWrapper = ({ children }: { children: React.Node }) => {
  return (
    <DndProvider backend={HTML5Backend}>
      <Mosaic
        className="none"
        initialValue="mock"
        renderTile={(id, path) => {
          return (
            <MosaicWindow path={path} id="panel" renderPreview={() => <div />}>
              {children}
            </MosaicWindow>
          );
        }}
      />
    </DndProvider>
  );
};

export default class PanelSetup extends React.PureComponent<Props, State> {
  static getDerivedStateFromProps(props: Props, prevState: State) {
    const { store } = prevState;
    const {
      globalVariables,
      userNodes,
      layout,
      linkedGlobalVariables,
      userNodeDiagnostics,
      userNodeLogs,
      userNodeRosLib,
      savedProps,
    } = props.fixture;
    if (globalVariables) {
      store.dispatch(overwriteGlobalVariables(globalVariables));
    }
    if (userNodes) {
      store.dispatch(setUserNodes(userNodes));
    }
    if (layout !== undefined) {
      store.dispatch(changePanelLayout({ layout }));
    }
    if (linkedGlobalVariables) {
      store.dispatch(setLinkedGlobalVariables(linkedGlobalVariables));
    }
    if (userNodeDiagnostics) {
      store.dispatch(setUserNodeDiagnostics(userNodeDiagnostics));
    }
    if (userNodeLogs) {
      store.dispatch(addUserNodeLogs(userNodeLogs));
    }
    if (userNodeRosLib) {
      store.dispatch(setUserNodeRosLib(userNodeRosLib));
    }
    if (savedProps) {
      store.dispatch(
        savePanelConfigs({
          configs: Object.entries(savedProps).map(([id, config]: [string, any]) => ({ id, config })),
        })
      );
    }
    return { store };
  }

  _hasMounted: boolean = false;

  constructor(props: Props) {
    super(props);
    this.state = {
      store: props.store || configureStore(createRootReducer(createMemoryHistory())),
    };
  }

  renderInner() {
    const { frame = {}, topics, datatypes, capabilities, activeData, progress } = this.props.fixture;
    let dTypes = datatypes;
    if (!dTypes) {
      const dummyDatatypes: RosDatatypes = {};
      for (const { datatype } of topics) {
        dummyDatatypes[datatype] = { fields: [] };
      }
      dTypes = dummyDatatypes;
    }
    const allData = flatten(objectValues(frame));
    const [bobjects, messages] = partition(allData, ({ message }) => isBobject(message));
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
            onMount(el, this.state.store);
          }
        }}>
        <MockMessagePipelineProvider
          capabilities={capabilities}
          topics={topics}
          datatypes={dTypes}
          messages={messages}
          bobjects={bobjects.length > 0 ? bobjects : undefined}
          activeData={activeData}
          progress={progress}
          store={this.state.store}>
          {this.props.children}
        </MockMessagePipelineProvider>
      </div>
    );
  }

  render() {
    return this.props.omitDragAndDrop ? this.renderInner() : <MosaicWrapper>{this.renderInner()}</MosaicWrapper>;
  }
}
