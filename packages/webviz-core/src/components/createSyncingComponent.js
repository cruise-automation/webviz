// @flow
//
//  Copyright (c) 2018-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import * as React from "react";
import shallowequal from "shallowequal";
import uuid from "uuid";

// Creates a new component class that tries to keep various instances
// of itself synchronized with each other.
//
// The way this works is that each component instance gets some `data`,
// and all `data` are passed to the `reducer function`. Whenever some
// `data` for any component instance changes, *all* instances are
// rerendered with the output of the `reducer` function
//
// For example, if you want to find the maximum value of all the
// values pass to `data`, you would create a component like this:
//
// const MaxSync = createSyncingComponent("MaxSync", (dataItems) => max(dataItems));
//
// Now you can have multiple instances of this component:
//
// <div>
//   <MaxSync data={10}>{(maximum) => <div>maximum is {maximum}</div>}</MaxSync>
//   <MaxSync data={20}>{(maximum) => <div>maximum is {maximum}</div>}</MaxSync>
//   <MaxSync data={30}>{(maximum) => <div>maximum is {maximum}</div>}</MaxSync>
// </div>
//
// This will render:
// <div>
//   <div>maximum is 30</div>
//   <div>maximum is 30</div>
//   <div>maximum is 30</div>
// </div>
export default function createSyncingComponent<ComponentData, ReducerOutput>(
  displayName: string,
  reducer: (ComponentData[]) => ReducerOutput
): React.ComponentType<{| data: ComponentData, children: (ReducerOutput) => React.Node |}> {
  type Props = {| data: ComponentData, children: (ReducerOutput) => React.Node |};

  const dataById: { [string]: ComponentData } = {};
  const componentsById: { [string]: React.Component<Props> } = {};
  let reducedData: ReducerOutput;

  return class SyncingComponent extends React.Component<Props> {
    static displayName = displayName;
    _id: string;

    constructor(props: Props) {
      super(props);
      this._id = uuid.v4();
      componentsById[this._id] = this;
      dataById[this._id] = props.data;
      this._recompute();
    }

    shouldComponentUpdate(nextProps: Props) {
      if (!shallowequal(this.props.data, nextProps.data)) {
        dataById[this._id] = nextProps.data;
        this._recompute();
      }

      return true;
    }

    componentWillUnmount() {
      delete componentsById[this._id];
      delete dataById[this._id];
      this._recompute();
    }

    _recompute() {
      const newReducedData: ReducerOutput = reducer(Object.keys(dataById).map((id) => dataById[id]));
      if (!shallowequal(reducedData, newReducedData)) {
        reducedData = newReducedData;

        // Update components asynchronously because forceUpdate being called during React
        // reconciliation may not actually cause the child to re-render.
        setImmediate(() => {
          Object.keys(componentsById).forEach((id) => {
            if (id !== this._id) {
              componentsById[id].forceUpdate();
            }
          });
        });
      }
    }

    render() {
      return this.props.children(reducedData);
    }
  };
}
