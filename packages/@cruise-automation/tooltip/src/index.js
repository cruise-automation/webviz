// @flow
//
//  Copyright (c) 2018-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import * as PopperJS from "popper.js";
import * as React from "react";
import { render, createPortal, unmountComponentAtNode } from "react-dom";
import { Manager, Reference, Popper } from "react-popper";

type Contents = React.Node | (() => React.Node);

type Props = {|
  children?: React.Element<any>,
  contents: Contents,
  arrow?: React.Element<any>,
  fixed: boolean,
  delay?: boolean | number,
  offset: { x: number, y: number },
  placement: PopperJS.Placement,
  defaultShown: boolean,
  defaultMousePosition: { x: number, y: number } | void,
|};

// eslint-disable-next-line no-use-before-define
type AbsoluteTipProps = $Rest<React.ElementConfig<typeof Tooltip>, { contents: Contents }>;

let portal;
function getPortal(): ?Element {
  const { body } = document;
  if (!body) {
    return null;
  }
  if (!portal) {
    portal = document.createElement("div");
    body.appendChild(portal);
  }
  return portal;
}

type State = {
  shown: boolean,
  mousePosition: ?{ x: number, y: number },
};

// Wrapper component to add tooltip listeners to your elements
export default class Tooltip extends React.Component<Props, State> {
  static defaultProps = {
    fixed: false,
    offset: { x: 0, y: 14 },
    defaultShown: false,
    defaultMousePosition: undefined,
    placement: "bottom",
  };

  timeout: TimeoutID;
  scheduleUpdate: ?() => void;

  // fake element used for positioning the tooltip next to the mouse
  fakeReferenceElement = {
    getBoundingClientRect: () => {
      const { mousePosition = this.props.defaultMousePosition } = this.state;
      if (!mousePosition) {
        return { left: 0, top: 0, bottom: 0, right: 0, width: 0, height: 0 };
      }
      const { x, y } = mousePosition;
      return {
        left: x,
        top: y,
        right: x,
        bottom: y,
        width: 0,
        height: 0,
      };
    },
    clientWidth: 0,
    clientHeight: 0,
  };

  // show the tooltip at absolute position with given contents
  static show(x: number, y: number, contents: Contents, props: AbsoluteTipProps = Object.freeze({})) {
    const container = getPortal();
    // satisfy flow
    if (!container) {
      console.warn("Could not get tooltip portal");
      return null;
    }
    return render(<Tooltip defaultShown defaultMousePosition={{ x, y }} contents={contents} {...props} />, container);
  }

  // hide the tooltip
  static hide() {
    unmountComponentAtNode(getPortal());
  }

  constructor(props: Props) {
    super(props);

    this.state = {
      shown: props.defaultShown,
      mousePosition: undefined,
    };
  }

  componentDidUpdate() {
    // In the case where defaultShown is set and our defaultMousePosition changed,
    // we need to update the popper's position
    if (this.scheduleUpdate) {
      this.scheduleUpdate();
    }
  }

  onMouseEnter = (e: SyntheticMouseEvent<Element>, force: boolean = false): void => {
    const { fixed, delay } = this.props;
    if (!fixed) {
      return;
    }

    if (force || !delay) {
      this.setState({ shown: true });
      return;
    }

    const delayTime = typeof delay === "number" ? delay : 500;
    this.timeout = setTimeout(this.onMouseEnter, delayTime, e, true);
  };

  onMouseMove = (e: SyntheticMouseEvent<Element>): void => {
    this.setState({ shown: true, mousePosition: { x: e.clientX, y: e.clientY } });
    if (this.scheduleUpdate) {
      this.scheduleUpdate();
    }
  };

  onMouseLeave = (e: SyntheticMouseEvent<Element>): void => {
    clearTimeout(this.timeout);
    this.setState({ shown: false, mousePosition: null });
  };

  renderPopper() {
    const { placement, contents, offset, fixed, arrow } = this.props;
    const { shown } = this.state;
    if (!shown) {
      return null;
    }

    // if we are positioning based on the mouse, hook up the fake reference element
    const referenceProps = {};
    if (!fixed) {
      referenceProps.referenceElement = this.fakeReferenceElement;
    }

    return (
      <Popper
        placement={placement}
        modifiers={{
          offset: { offset: `${offset.x},${offset.y}` },
          preventOverflow: { boundariesElement: "viewport" },
        }}
        {...referenceProps}>
        {({ ref, style, scheduleUpdate, placement, arrowProps }) => {
          const { body } = document;
          if (!body) {
            return null;
          }
          // hold onto the scheduleUpdate function so we can call it when the mouse moves
          this.scheduleUpdate = scheduleUpdate;
          return createPortal(
            <div ref={ref} style={{ ...style, zIndex: "99999", pointerEvents: "none" }} data-placement={placement}>
              {arrow &&
                React.cloneElement(arrow, {
                  ref: arrowProps.ref,
                  style: { ...(arrow.props.style || {}), ...arrowProps.style },
                })}
              {typeof contents === "function" ? contents() : contents}
            </div>,
            body
          );
        }}
      </Popper>
    );
  }

  render() {
    const { children, fixed } = this.props;

    if (!children) {
      return this.renderPopper();
    }

    const child = React.Children.only(children);
    const eventListeners: { [key: string]: (SyntheticMouseEvent<Element>) => void } = {
      onMouseLeave: this.onMouseLeave,
    };

    if (fixed) {
      eventListeners.onMouseEnter = this.onMouseEnter;
    } else {
      eventListeners.onMouseMove = this.onMouseMove;
    }

    if (fixed) {
      return (
        <Manager>
          <Reference>
            {({ ref }) => {
              return React.cloneElement(child, { ...eventListeners, ref });
            }}
          </Reference>
          {this.renderPopper()}
        </Manager>
      );
    }
    return (
      <React.Fragment>
        {React.cloneElement(child, eventListeners)}
        {this.renderPopper()}
      </React.Fragment>
    );
  }
}
