// @flow
//
//  Copyright (c) 2018-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import * as React from "react";

type KeyHandlers = {
  [key: string]: (event: KeyboardEvent) => void,
};

type Props = {|
  global: true | false,
  keyDownHandlers?: KeyHandlers,
  keyPressHandlers?: KeyHandlers,
  keyUpHandlers?: KeyHandlers,
|};

export default class KeyListener extends React.Component<Props> {
  el: ?HTMLDivElement;

  static defaultProps = {
    global: false,
  };

  componentDidMount() {
    const { global } = this.props;
    const target = global ? document : (this.el || {}).parentElement;
    if (target) {
      target.addEventListener("keydown", this.handleEvent);
      target.addEventListener("keypress", this.handleEvent);
      target.addEventListener("keyup", this.handleEvent);
    }
  }

  componentWillUnmount() {
    const { global } = this.props;
    const target = global ? document : (this.el || {}).parentElement;
    if (target) {
      target.removeEventListener("keydown", this.handleEvent);
      target.removeEventListener("keypress", this.handleEvent);
      target.removeEventListener("keyup", this.handleEvent);
    }
  }

  callHandlers(handlers: ?KeyHandlers, event: KeyboardEvent) {
    if (!handlers) {
      return;
    }
    if (typeof handlers[event.key] === "function") {
      event.stopPropagation();
      event.preventDefault();
      handlers[event.key](event);
    }
  }

  handleEvent = (event: KeyboardEvent) => {
    const { target, type } = event;
    if (
      // escape key should still work when a button is focused
      event.key !== "Escape" &&
      (target instanceof HTMLButtonElement ||
        target instanceof HTMLInputElement ||
        target instanceof HTMLSelectElement ||
        target instanceof HTMLTextAreaElement ||
        (target instanceof HTMLElement && target.isContentEditable))
    ) {
      // the user is typing in an editable field; ignore the event.
      return;
    }

    switch (type) {
      case "keydown":
        this.callHandlers(this.props.keyDownHandlers, event);
        break;
      case "keypress":
        this.callHandlers(this.props.keyPressHandlers, event);
        break;
      case "keyup":
        this.callHandlers(this.props.keyUpHandlers, event);
        break;
      default:
        break;
    }
  };

  render() {
    return <div style={{ display: "none" }} ref={(el) => (this.el = el)} />;
  }
}
