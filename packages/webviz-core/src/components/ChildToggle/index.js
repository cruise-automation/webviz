// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import cx from "classnames";
import * as React from "react";
import { createPortal } from "react-dom";

import styles from "./index.module.scss";
import Flex from "webviz-core/src/components/Flex";
import KeyListener from "webviz-core/src/components/KeyListener";

type ContainsOpenProps = {|
  children: (containsOpen: boolean) => React.Node,
|};

let { Provider, Consumer } = React.createContext<(number) => void>((_: number) => {});
// TODO(JP): we can remove this once enzyme supports new react context
// https://github.com/airbnb/enzyme/issues/1509
// enzyme doesn't yet work with the new react 16.3 context api.
if (process.env.NODE_ENV === "test") {
  Provider = ({ children }: { children: React.Node }) => children;
  Consumer = ({ children }: { children: ((_: number) => void) => React.Node }) => children(() => {});
}

// Component for detecting if any child component is opened or not. Handy for
// not hiding things when there is a dropdown open or so.
// Use as <ChildToggle.ContainsOpen>
class ChildToggleContainsOpen extends React.Component<ContainsOpenProps, { open: number }> {
  constructor(props: ContainsOpenProps) {
    super(props);
    this.state = { open: 0 };
  }

  _setContainsOpen = (changeOpenNumber: number): void => {
    this.setState(({ open }) => ({ open: open + changeOpenNumber }));
  };

  render() {
    return <Provider value={this._setContainsOpen}>{this.props.children(this.state.open > 0)}</Provider>;
  }
}

type Props = {|
  // set to true to display the content component
  isOpen: boolean,
  // fired when the trigger component is clicked
  onToggle: () => void,
  // requires exactly 2 components: a toggle trigger & a content component
  children: [React$Element<any>, React$Element<any>],
  style?: { [string]: any },
  // alignment of the content component
  position: "above" | "below" | "left" | "right",
  // don't use a portal, e.g. if you are nesting this already in a portal
  noPortal?: boolean,
  dataTest?: string,
|};

// a component which takes 2 child components: toggle trigger and content
// when the toggle trigger component is clicked the onToggle callback will fire
// setting isOpen to true will show the content component, floating below the trigger component
export default class ChildToggle extends React.Component<Props> {
  static ContainsOpen = ChildToggleContainsOpen;

  el: ?HTMLDivElement;
  floatingEl: ?HTMLDivElement;
  _lastOpen: boolean = false;
  _setContainsOpen: (boolean) => void = () => {};

  componentDidMount() {
    const { isOpen } = this.props;
    if (isOpen) {
      this.addDocListener();
      this.forceUpdate(); // Because this.el is not set during the first render.
    }
  }

  addDocListener() {
    // add a document listener to hide the dropdown body if
    // it is expanded and the document is clicked on
    document.addEventListener("click", this.onDocumentClick, true);
  }

  removeDocListener() {
    // cleanup the document listener
    document.removeEventListener("click", this.onDocumentClick, true);
  }

  componentDidUpdate(prevProps: Props) {
    if (this.props.isOpen !== prevProps.isOpen) {
      if (this.props.isOpen) {
        this.addDocListener();
      } else {
        this.removeDocListener();
      }
    }
  }

  componentWillUnmount() {
    this.removeDocListener();
    this._setContainsOpen(false);
  }

  onDocumentClick = (e: MouseEvent) => {
    const { floatingEl } = this;
    const { onToggle } = this.props;
    if (!floatingEl) {
      return;
    }
    const node = ((e.target: any): HTMLElement);
    // if there was a click outside this container and outside children[0]
    // fire the toggle callback to close expanded section
    if (floatingEl.contains(node) || (this.el && this.el.contains(node))) {
      // the click was inside our bounds and shouldn't auto-close the menu
    } else {
      // allow any nested child toggle click events to reach their dom node before removing
      // the expanded toggle portion from the dom
      setImmediate(onToggle);
    }
  };

  renderFloating() {
    const { isOpen, children, position, noPortal, style } = this.props;
    if (!isOpen) {
      return;
    }
    if (!this.el || !this.el.firstElementChild || !this.el.firstElementChild.firstElementChild) {
      return;
    }
    // position menu relative to our children[0]
    const childEl = this.el.firstElementChild.firstElementChild;
    const childRect = childEl.getBoundingClientRect();
    const padding = 10;
    const styleObj = {
      ...style,
      top: padding,
      bottom: padding,
      left: padding,
      right: padding,
      height: undefined, // to appease Flow
    };

    let spacerSize;
    if (position === "left") {
      styleObj.top = childRect.top;
      spacerSize = window.innerWidth - childRect.left - padding;
    } else if (position === "below") {
      styleObj.top = childRect.top + childRect.height;
      spacerSize = childRect.left - padding;
    } else if (position === "above") {
      delete styleObj.bottom;
      styleObj.height = childRect.top - padding;
      spacerSize = childRect.left - padding;
    } else {
      styleObj.top = childRect.top;
      spacerSize = childRect.left + childRect.width - padding;
    }

    // satisfy flow
    if (!document.body) {
      return null;
    }

    const tree = (
      <div ref={(el) => (this.floatingEl = el)}>
        <Flex
          row
          reverse={position === "left"}
          start={position !== "above"}
          end={position === "above"}
          className={styles.childContainer}
          style={styleObj}>
          {/* shrinkable spacer allows child to have a default position but slide over when it would go offscreen */}
          <span style={{ flexBasis: spacerSize, flexShrink: 1 }} />
          {children[1]}
        </Flex>
      </div>
    );

    return noPortal ? tree : createPortal(tree, document.body);
  }

  render() {
    const { style, children, onToggle, isOpen, dataTest } = this.props;
    const keyDownHandlers = {
      Escape: (_) => {
        if (isOpen) {
          onToggle();
        }
      },
    };
    return (
      <>
        <Consumer>
          {(updateOpenNumber: (number) => void) => {
            this._setContainsOpen = (open: boolean) => {
              if (open !== this._lastOpen) {
                updateOpenNumber(open ? 1 : -1);
                this._lastOpen = open;
              }
            };
            this._setContainsOpen(isOpen);

            return (
              <div
                ref={(el) => (this.el = el)}
                className={cx({ ["open"]: isOpen })}
                style={style}
                onClick={(event) => event.stopPropagation()}>
                <div
                  onClick={(event) => {
                    event.stopPropagation();
                    event.preventDefault();
                    onToggle();
                  }}
                  data-test={dataTest}>
                  {children[0]}
                </div>
                {this.renderFloating()}
              </div>
            );
          }}
        </Consumer>
        <KeyListener global keyDownHandlers={keyDownHandlers} />
      </>
    );
  }
}
