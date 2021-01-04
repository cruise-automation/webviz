// @flow
//
//  Copyright (c) 2019-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { type BrowserHistory } from "history";
import React, { useCallback } from "react";
import { connect } from "react-redux";

import { loadLayout } from "webviz-core/src/actions/panels";
import renderToBody from "webviz-core/src/components/renderToBody";
import ShareJsonModal from "webviz-core/src/components/ShareJsonModal";
import type { State } from "webviz-core/src/reducers";
import type { PanelsState } from "webviz-core/src/reducers/panels";

type OwnProps = {|
  onRequestClose: () => void,
  history?: BrowserHistory,
|};

type Props = {|
  ...OwnProps,
  panels: PanelsState,
  loadLayout: typeof loadLayout,
|};

function UnconnectedLayoutModal({ onRequestClose, loadLayout: loadFetchedLayout, panels, history }: Props) {
  const onChange = useCallback((layoutPayload: PanelsState) => {
    loadFetchedLayout(layoutPayload);
  }, [loadFetchedLayout]);
  return (
    <ShareJsonModal
      history={history}
      onRequestClose={onRequestClose}
      value={panels}
      onChange={onChange}
      noun="layout"
    />
  );
}

// TODO(JP): Use useSelector and useDispatch here, but unfortunately `loadLayout` needs
// a `getState` function in addition to `dispatch`, so needs a bit of rework.
const LayoutModal = connect<Props, OwnProps, _, _, _, _>(
  (state: State) => ({ panels: state.persistedState.panels }),
  { loadLayout }
)(UnconnectedLayoutModal);

export function openLayoutModal(history?: BrowserHistory) {
  const modal = renderToBody(<LayoutModal history={history} onRequestClose={() => modal.remove()} />);
}
