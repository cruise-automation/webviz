// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.
import React, { useMemo } from "react";
import KeyListener from "react-key-listener";
import { useDispatch } from "react-redux";
import { bindActionCreators } from "redux";

import { redoLayoutChange, undoLayoutChange } from "webviz-core/src/actions/layoutHistory";
import { useExperimentalFeature } from "webviz-core/src/components/ExperimentalFeatures";

export default function LayoutHistoryKeyListener() {
  const dispatch = useDispatch();
  const actions = useMemo(() => bindActionCreators({ redoLayoutChange, undoLayoutChange }, dispatch), [dispatch]);
  const enableLayoutHistory = useExperimentalFeature("layoutHistory");

  const keyDownHandlers = useMemo(
    () => {
      const keyDownHandler = (e) => {
        if (enableLayoutHistory && (e.ctrlKey || e.metaKey)) {
          if (e.shiftKey) {
            actions.redoLayoutChange();
          } else {
            actions.undoLayoutChange();
          }
        }
      };
      // Don't use the key to decide between undo and redo because of capslock.
      return { z: keyDownHandler, Z: keyDownHandler };
    },
    [actions, enableLayoutHistory]
  );

  return <KeyListener global keyDownHandlers={keyDownHandlers} />;
}
