// @flow

//  Copyright (c) 2018-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import normalizeWheel from "normalize-wheel";
import * as React from "react";

import type { Vec2 } from "../types";
import getOrthographicBounds from "../utils/getOrthographicBounds";
import CameraStore from "./CameraStore";

const PAN_SPEED = 4;
const MOUSE_ZOOM_SPEED = 0.3;
const KEYBOARD_MOVE_SPEED = 0.3;
const KEYBOARD_ZOOM_SPEED = 150;
const KEYBOARD_SPIN_SPEED = 1.5;

type KeyMotion = { x?: number, y?: number, zoom?: number, yaw?: number, tilt?: number };

type Props = {|
  cameraStore: CameraStore,
  children?: React.ChildrenArray<React.Element<any> | null>,
  onKeyDown?: (KeyboardEvent) => void,
|};

// attaches mouse and keyboard listeners to allow for moving the camera on user input
export default class CameraListener extends React.Component<Props> {
  _keyTimer: ?AnimationFrameID;
  _keys: Set<number> = new Set();
  _buttons: Set<number> = new Set();
  _listeners = [];
  _shiftKey = false;
  _metaKey = false;
  _ctrlKey = false;

  _el: ?HTMLDivElement;
  _rect: ClientRect | DOMRect;
  _initialMouse: Vec2;

  componentDidMount() {
    const { _el } = this;
    if (!_el) {
      return;
    }

    this._rect = _el.getBoundingClientRect();
    const listen = (target: any, name: string, fn) => {
      target.addEventListener(name, fn);
      this._listeners.push({ target, name, fn });
    };
    listen(document, "blur", this._onBlur);
    listen(window, "mouseup", this._onWindowMouseUp);
  }

  componentWillUnmount() {
    this._listeners.forEach((listener) => {
      listener.target.removeEventListener(listener.name, listener.fn);
    });
    this._endDragging();
  }

  _getMouseOnScreen = (mouse: MouseEvent) => {
    const { clientX, clientY } = mouse;
    const { top, left, width, height } = this._rect;
    const x = (clientX - left) / width;
    const y = (clientY - top) / height;
    return [x, y];
  };

  _onMouseDown = (e: MouseEvent) => {
    const { _el } = this;
    if (!_el) {
      return;
    }

    e.preventDefault();
    this._buttons.add(e.button);
    _el.focus();
    this._rect = _el.getBoundingClientRect();
    this._initialMouse = this._getMouseOnScreen(e);
    this.startDragging(e);
  };

  _isLeftMouseDown() {
    return this._buttons.has(0);
  }

  _isRightMouseDown() {
    return this._buttons.has(2);
  }

  _getMagnitude(base: number = 1) {
    return this._shiftKey ? base / 10 : base;
  }

  _getMoveMagnitude() {
    if (this._ctrlKey) {
      return { x: 0, y: 0 };
    }

    const {
      cameraStore: {
        state: { distance, perspective },
      },
    } = this.props;
    if (perspective) {
      // in perspective mode its more like flying, so move by the magnitude
      // we use the camera distance as a heuristic
      const magnitude = this._getMagnitude(distance);

      return { x: magnitude, y: magnitude };
    }
    // in orthographic mode we know the exact viewable area
    // which is a square so we can move exactly percentage within it
    const { width, height } = this._rect;
    const bounds = getOrthographicBounds(distance, width, height);
    return { x: this._getMagnitude(bounds.width), y: this._getMagnitude(bounds.height) };
  }

  _onWindowMouseMove = (e: MouseEvent) => {
    if (!this._buttons.size) {
      return;
    }
    this._shiftKey = e.shiftKey;
    const {
      cameraStore: {
        cameraMove,
        cameraRotate,
        state: { perspective },
      },
    } = this.props;

    // compute the amount the mouse has moved
    let moveX, moveY;
    const mouse = this._getMouseOnScreen(e);
    // when pointer lock is enabled, we get movementX and movementY (with direction reversed)
    // instead of the screenX/screenY changing... except, when using synergy, they come through
    // like regular mousemove events.
    if ((document: any).pointerLockElement && (e.movementX || e.movementY)) {
      moveX = -e.movementX / this._rect.width;
      moveY = -e.movementY / this._rect.height;
    } else {
      moveX = this._initialMouse[0] - mouse[0];
      moveY = this._initialMouse[1] - mouse[1];
    }
    this._initialMouse = mouse;

    if (this._isRightMouseDown()) {
      const magnitude = this._getMagnitude(PAN_SPEED);
      // in orthographic mode, flip the direction of rotation so "left" means "counterclockwise"
      const x = (perspective ? moveX : -moveX) * magnitude;
      // do not rotate vertically in orthograhpic mode
      const y = perspective ? moveY * magnitude : 0;
      cameraRotate([x, y]);
    }

    if (this._isLeftMouseDown()) {
      const { x, y } = this._getMoveMagnitude();
      cameraMove([moveX * x, -moveY * y]);
    }
  };

  _onMouseUp = (e: MouseEvent) => {
    this._buttons.delete(e.button);
    this._endDragging();
  };

  _onWindowMouseUp = (e: MouseEvent) => {
    const { _el } = this;
    if (!_el) {
      return;
    }

    // do nothing if this container had a mouseup, because we catch it in the onMouseUp handler
    if (_el.contains((e.target: any)) || e.target === _el) {
      return;
    }
    // If mouseup triggers on the window outside this container, clear any active interactions.
    // This will allow a mouseup outside the browser window to be handled; otherwise the mouse
    // "sticks" in a down position until another click on this element is received.
    this._buttons.clear();
    this._endDragging();
  };

  startDragging(e: MouseEvent) {
    if (e.button !== 0 && this._el && typeof this._el.requestPointerLock === "function") {
      this._el.requestPointerLock();
    }
    window.addEventListener("mousemove", this._onWindowMouseMove);
  }

  _endDragging() {
    window.removeEventListener("mousemove", this._onWindowMouseMove);
    if (typeof (document: any).exitPointerLock === "function") {
      (document: any).exitPointerLock();
    }
  }

  getKeyMotion = (keyCode: number): ?KeyMotion => {
    const moveSpeed = this._getMagnitude(KEYBOARD_MOVE_SPEED);
    const zoomSpeed = this._getMagnitude(KEYBOARD_ZOOM_SPEED);
    const spinSpeed = this._getMagnitude(KEYBOARD_SPIN_SPEED);
    switch (keyCode) {
      case 68: // d - right
        return { x: moveSpeed };
      case 65: // a - left
        return { x: -moveSpeed };
      case 87: // w - up
        return { y: moveSpeed };
      case 83: // s - down
        return { y: -moveSpeed };
      case 90: // z - zoom in
        return { zoom: zoomSpeed };
      case 88: // x - zoom out
        return { zoom: -zoomSpeed };
      case 81: // q - rotate left
        return { yaw: -spinSpeed };
      case 69: // e - rotate right
        return { yaw: spinSpeed };
      case 82: // r - tilt down
        return { tilt: -spinSpeed };
      case 70: // f - tilt up
        return { tilt: spinSpeed };
      default:
        return null;
    }
  };

  moveKeyboard(dt: number) {
    const motion = { x: 0, y: 0, zoom: 0, yaw: 0, tilt: 0 };
    this._keys.forEach((key) => {
      const { x = 0, y = 0, zoom = 0, yaw = 0, tilt = 0 } = this.getKeyMotion(key) || {};
      motion.x += x;
      motion.y += y;
      motion.zoom += zoom;
      motion.yaw += yaw;
      motion.tilt += tilt;
    });

    const {
      cameraStore: {
        cameraMove,
        cameraRotate,
        cameraZoom,
        state: { perspective },
      },
    } = this.props;

    if (motion.x || motion.y) {
      const { x, y } = this._getMoveMagnitude();
      cameraMove([motion.x * x * dt, motion.y * y * dt]);
    }
    if (motion.yaw || (perspective && motion.tilt)) {
      cameraRotate([motion.yaw * dt, perspective ? motion.tilt * dt : 0]);
    }
    if (motion.zoom) {
      cameraZoom(motion.zoom * dt);
    }
  }

  _startKeyTimer(lastStamp: ?number) {
    if (this._keyTimer) {
      return;
    }
    this._keyTimer = requestAnimationFrame((stamp) => {
      this.moveKeyboard((lastStamp ? stamp - lastStamp : 0) / 1000);
      this._keyTimer = undefined;

      // Only start the timer if keys are still pressed.
      // We do this rather than stopping the timer in onKeyUp, because keys held
      // sometimes actually trigger repeated keyup/keydown, rather than just repeated keydown.
      // By checking currently-down keys in the requestAnimationFrame callback, we give the browser enough time to
      // handle both the keyup and keydown before checking whether we should restart the timer.
      if (this._keys.size) {
        this._startKeyTimer(stamp);
      }
    });
  }

  _stopKeyTimer() {
    if (this._keyTimer) {
      cancelAnimationFrame(this._keyTimer);
    }
    this._keyTimer = undefined;
  }

  _onKeyDown = (e: KeyboardEvent) => {
    const { onKeyDown } = this.props;
    this._shiftKey = e.shiftKey;
    this._metaKey = e.metaKey;
    this._ctrlKey = e.ctrlKey;

    if (e.ctrlKey || e.metaKey) {
      if (onKeyDown) {
        onKeyDown(e);
      }
      // we don't currently handle these modifiers
      return;
    }

    // ignore repeated keydown events
    if (this._keys.has(e.keyCode)) {
      e.stopPropagation();
      e.preventDefault();
    } else if (this.getKeyMotion(e.keyCode)) {
      this._keys.add(e.keyCode);
      this._startKeyTimer();
      e.stopPropagation();
      e.preventDefault();
    } else if (onKeyDown) {
      onKeyDown(e);
    }
  };

  _onKeyUp = (e: KeyboardEvent) => {
    this._shiftKey = e.shiftKey;
    this._metaKey = e.metaKey;
    this._ctrlKey = e.ctrlKey;

    this._keys.delete(e.keyCode);
  };

  _onWheel = (e: WheelEvent) => {
    // stop the wheel event here, as wheel propagation through the entire dom
    // can cause the browser to slow down & thrash
    e.preventDefault();
    e.stopPropagation();
    this._shiftKey = e.shiftKey;

    // with osx trackpad scrolling, slow to medium pixelY is around +/- 1 to 10
    // external mouse wheels generally come in higher values around +/- 30 to 50
    const { pixelX, pixelY } = normalizeWheel(e);

    // shift+scroll on an external mouse may scroll in the X direction instead of Y
    const wheelAmount = pixelY || pixelX;

    // we use positive value to indicate zooming in
    // and negative value to zoom out, so reverse the direction of the wheel
    const dir = Math.sign(wheelAmount) * -1;
    const amount = Math.abs(wheelAmount);
    // restrict zoom percentage per tick to between 1 & 50 percent
    const percentage = Math.max(1, Math.min(amount, 50));

    // support shift+wheel magnitude adjustment
    const zoomPercentage = this._getMagnitude(percentage * dir * MOUSE_ZOOM_SPEED);
    this.props.cameraStore.cameraZoom(zoomPercentage);
  };

  // make sure all movements stop if the document loses focus by resetting modifier keys
  // to their 'off' position
  // (e.g. ctrl+tab leaving the page should not leave the ctrl key in the 'on' position)
  _onBlur = (e: MouseEvent) => {
    this._keys = new Set();
    this._ctrlKey = false;
    this._shiftKey = false;
    this._metaKey = false;
    this._stopKeyTimer();
  };

  _onContextMenu = (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  render() {
    const { children } = this.props;
    return (
      <div
        tabIndex={0}
        style={{ outline: "none" }}
        draggable
        ref={(el) => (this._el = el)}
        onMouseDown={this._onMouseDown}
        onMouseUp={this._onMouseUp}
        onWheel={this._onWheel}
        onBlur={this._onBlur}
        onContextMenu={this._onContextMenu}
        onKeyDown={this._onKeyDown}
        onKeyUp={this._onKeyUp}>
        {children}
      </div>
    );
  }
}
