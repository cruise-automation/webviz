// @flow
//
//  Copyright (c) 2019-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import React, { useCallback } from "react";
import { connect } from "react-redux";

import { importPanelLayout } from "webviz-core/src/actions/panels";
import renderToBody from "webviz-core/src/components/renderToBody";
import ShareJsonModal from "webviz-core/src/components/ShareJsonModal";
import type { State } from "webviz-core/src/reducers";
import type { PanelsState } from "webviz-core/src/reducers/panels";
import type { ImportPanelLayoutPayload } from "webviz-core/src/types/panels";

type OwnProps = {|
  onRequestClose: () => void,
|};

type Props = {|
  ...OwnProps,
  panels: PanelsState,
  importPanelLayout: typeof importPanelLayout,
|};

function UnconnectedLayoutModal({ onRequestClose, importPanelLayout: importLayout, panels }: Props) {
  const onChange = useCallback(
    (layoutPayload: ImportPanelLayoutPayload) => {
      importLayout(layoutPayload);
    },
    [importLayout]
  );
  return <ShareJsonModal onRequestClose={onRequestClose} value={panels} onChange={onChange} noun="layout" />;
}

// TODO(JP): Use useSelector and useDispatch here, but unfortunately `importPanelLayout` needs
// a `getState` function in addition to `dispatch`, so needs a bit of rework.
const LayoutModal = connect<Props, OwnProps, _, _, _, _>(
  (state: State) => ({
    panels: state.panels,
  }),
  { importPanelLayout }
)(UnconnectedLayoutModal);

export function openLayoutModal() {
  const modal = renderToBody(<LayoutModal onRequestClose={() => modal.remove()} />);
}
