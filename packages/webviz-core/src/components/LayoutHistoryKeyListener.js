// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.
import { useEventListener } from "@cruise-automation/hooks";
import { useCallback, useMemo } from "react";
import { useDispatch } from "react-redux";
import { bindActionCreators } from "redux";

import { redoLayoutChange, undoLayoutChange } from "webviz-core/src/actions/layoutHistory";

const inNativeUndoRedoElement = (eventTarget: EventTarget) => {
  if (eventTarget instanceof HTMLTextAreaElement) {
    let element: ?Element = eventTarget;
    // It's not always convenient to set the data property on the textarea itself, but we can set
    // it on a nearby ancestor.
    while (element) {
      if (element instanceof HTMLElement && element.dataset.nativeundoredo) {
        return true;
      }
      element = element.parentElement;
    }
  }
  return false;
};

export default function LayoutHistoryKeyListener() {
  const dispatch = useDispatch();
  const actions = useMemo(() => bindActionCreators({ redoLayoutChange, undoLayoutChange }, dispatch), [dispatch]);

  const keyDownHandler: (KeyboardEvent) => void = useCallback(
    (e) => {
      if ((e.key === "z" || e.key === "Z") && (e.ctrlKey || e.metaKey)) {
        // Don't use ctrl-Z for layout history actions inside the Monaco Editor. It isn't
        // controlled, and changes inside it don't result in updates to the Redux state. We could
        // consider making the editor controlled, with a separate "unsaved state".
        if (inNativeUndoRedoElement(e.target)) {
          return;
        }

        // Use e.shiftKey instead of e.key to decide between undo and redo because of capslock.
        e.stopPropagation();
        e.preventDefault();
        if (e.shiftKey) {
          actions.redoLayoutChange();
        } else {
          actions.undoLayoutChange();
        }
      }
    },
    [actions]
  );

  // Not using KeyListener because we want to preventDefault on [ctrl+z] but not on [z], and we want
  // to handle events when text areas have focus.
  useEventListener(document, "keydown", true, keyDownHandler, [keyDownHandler]);

  return null;
}
