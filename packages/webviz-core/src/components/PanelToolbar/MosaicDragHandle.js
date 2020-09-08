// @flow
//
//  Copyright (c) 2019-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import _ from "lodash";
import React, { useContext, type Node } from "react";
import { useDrag } from "react-dnd";
import { MosaicDragType, MosaicWindowContext } from "react-mosaic-component";
import { useSelector, useDispatch } from "react-redux";
import { bindActionCreators } from "redux";

import { startDrag, endDrag } from "webviz-core/src/actions/panels";
import { usePanelContext } from "webviz-core/src/components/PanelContext";

// HOC to integrate mosaic drag functionality into any other component
function MosaicDragHandle(props: { children: Node, tabId?: string, onDragStart?: () => void, onDragEnd?: () => void }) {
  const { children, tabId: sourceTabId, onDragStart, onDragEnd } = props;
  const { mosaicWindowActions } = useContext(MosaicWindowContext);
  const { id } = usePanelContext();

  const dispatch = useDispatch();
  const mosaicId = useSelector(({ mosaic }) => mosaic.mosaicId);
  const originalLayout = useSelector((state) => state.persistedState.panels.layout);
  const originalSavedProps = useSelector((state) => state.persistedState.panels.savedProps);
  const actions = React.useMemo(() => bindActionCreators({ startDrag, endDrag }, dispatch), [dispatch]);

  const [__, drag] = useDrag({
    item: { type: MosaicDragType.WINDOW },
    begin: (_monitor) => {
      if (onDragStart) {
        onDragStart();
      }

      // The defer is necessary as the element must be present on start for HTML DnD to not cry
      const path = mosaicWindowActions.getPath();
      const deferredHide = _.defer(() => {
        actions.startDrag({ path, sourceTabId });
      });
      return { mosaicId, deferredHide };
    },
    end: (item, monitor) => {
      if (onDragEnd) {
        onDragEnd();
      }

      // If the hide call hasn't happened yet, cancel it
      window.clearTimeout(item.deferredHide);
      const ownPath = mosaicWindowActions.getPath();
      const dropResult = monitor.getDropResult() || {};
      const { position, path: destinationPath, tabId: targetTabId } = dropResult;

      actions.endDrag({
        originalLayout,
        originalSavedProps,
        panelId: id,
        sourceTabId,
        targetTabId,
        position,
        destinationPath,
        ownPath,
      });
    },
  });
  return (
    <div ref={drag} data-test="mosaic-drag-handle">
      {children}
    </div>
  );
}

export default MosaicDragHandle;
