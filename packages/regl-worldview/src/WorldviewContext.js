// @flow

//  Copyright (c) 2018-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import debounce from "lodash/debounce";
import * as React from "react";
import createREGL from "regl";

import { camera, CameraStore } from "./camera/index";
import Command from "./commands/Command";
import type {
  Dimensions,
  RawCommand,
  CompiledReglCommand,
  CameraCommand,
  Vec4,
  CameraState,
  MouseEventEnum,
} from "./types";
import { getIdFromColor } from "./utils/commandUtils";
import { getNodeEnv } from "./utils/common";
import type { Ray } from "./utils/Raycast";
import { getRayFromClick } from "./utils/Raycast";

type Props = any;

type ConstructorArgs = {
  dimension: Dimensions,
  canvasBackgroundColor: Vec4,
  cameraState: CameraState,
  defaultCameraState?: CameraState,
  onCameraStateChange: ?(CameraState) => void,
};

type InitializedData = {
  _fbo: any,
  regl: any,
  camera: CameraCommand,
};

export type DrawInput = {
  instance: React.Component<any>,
  command: Command<any>,
  drawProps: Props,
  layerIndex: ?number,
};

export type PaintFn = () => void;

export type WorldviewContextType = {
  onMount(instance: Command<any>, command: RawCommand<any>): void,
  registerDrawCall(drawInput: DrawInput): void,
  registerHitmapCall(drawInput: DrawInput): void,
  registerPaintCallback(PaintFn): void,
  unregisterPaintCallback(PaintFn): void,
  onUnmount(instance: Command<any>): void,
  onDirty(): void,
  +dimension: Dimensions,
  +initializedData: ?InitializedData,
};

// Compile instructions with an initialized regl context into a regl command.
// If the instructions are a function, pass the context to the instructions and compile the result
// of the function; otherwise, compile the instructions directly
function compile<T>(regl: any, cmd: RawCommand<T>): CompiledReglCommand<T> {
  const src = cmd(regl);
  return typeof src === "function" ? src : regl(src);
}

// This is made available to every Command component as `this.context`.
// It contains all the regl interaction code and is responsible for collecting and executing
// draw calls, hitmap calls, and raycasting.
export class WorldviewContext {
  _commands: Set<RawCommand<any>> = new Set();
  _compiled: Map<Function, CompiledReglCommand<any>> = new Map();
  _drawCalls: Map<React.Component<any>, any> = new Map();
  _hitmapCalls: Map<React.Component<any>, any> = new Map();
  _paintCalls: Map<PaintFn, PaintFn> = new Map();
  // store every compiled command object compiled for debugging purposes
  reglCommandObjects: { stats: { count: number } }[] = [];
  counters: { paint?: number, render?: number } = {};
  dimension: Dimensions;
  onDirty: () => void;
  cameraStore: CameraStore;
  canvasBackgroundColor: Vec4 = [0, 0, 0, 1];
  // group all initialized data together so it can be checked for existence to verify initialization is complete
  initializedData: ?InitializedData;

  constructor({ dimension, canvasBackgroundColor, cameraState, onCameraStateChange }: ConstructorArgs) {
    // used for children to call paint() directly
    this.onDirty = this._debouncedPaint;
    this.dimension = dimension;
    this.canvasBackgroundColor = canvasBackgroundColor;
    this.cameraStore = new CameraStore((cameraState: CameraState) => {
      if (onCameraStateChange) {
        onCameraStateChange(cameraState);
      } else {
        // this must be called for Worldview with defaultCameraState prop
        this.paint();
      }
    }, cameraState);
  }

  initialize(canvas: HTMLCanvasElement) {
    if (this.initializedData) {
      throw new Error("can not initialize regl twice");
    }

    const regl = this._instrumentCommands(
      createREGL({
        canvas,
        extensions: ["angle_instanced_arrays", "oes_texture_float", "oes_element_index_uint"],
        profile: getNodeEnv() !== "production",
      })
    );
    // compile any components which mounted before regl is initialized
    this._commands.forEach((uncompiledCommand) => {
      const compiledCommand = compile(regl, uncompiledCommand);
      this._compiled.set(uncompiledCommand, compiledCommand);
    });

    const Camera = compile(regl, camera);
    const compiledCameraCommand = new Camera();
    // framebuffer object from regl context
    const fbo = regl.framebuffer({
      width: Math.round(this.dimension.width),
      height: Math.round(this.dimension.height),
    });

    this.initializedData = {
      _fbo: fbo,
      camera: compiledCameraCommand,
      regl,
    };
  }

  destroy() {
    if (this.initializedData) {
      this.initializedData.regl.destroy();
    }
  }

  // compile a command when it is first mounted, and try to register in _commands and _compiled maps
  onMount(instance: React.Component<any>, command: RawCommand<any>) {
    const { initializedData } = this;
    // do nothing if regl hasn't been initialized yet
    if (!initializedData || this._commands.has(command)) {
      return;
    }
    this._commands.add(command);

    // for components that mount after regl is initialized
    this._compiled.set(command, compile(initializedData.regl, command));
  }

  // unregister children hitmap and draw calls
  onUnmount(instance: React.Component<any>) {
    this._hitmapCalls.delete(instance);
    this._drawCalls.delete(instance);
  }

  unregisterPaintCallback(paintFn: PaintFn) {
    this._paintCalls.delete(paintFn);
  }

  registerDrawCall(drawInput: DrawInput) {
    this._drawCalls.set(drawInput.instance, drawInput);
  }

  registerPaintCallback(paintFn: PaintFn) {
    this._paintCalls.set(paintFn, paintFn);
  }

  registerHitmapCall(drawInput: DrawInput) {
    this._hitmapCalls.set(drawInput.instance, drawInput);
  }

  setDimension(dimension: Dimensions) {
    this.dimension = dimension;
  }

  raycast = (canvasX: number, canvasY: number) => {
    if (!this.initializedData) {
      return undefined;
    }

    const { width, height } = this.dimension;
    return getRayFromClick(this.initializedData.camera, {
      clientX: canvasX,
      clientY: canvasY,
      width,
      height,
    });
  };

  paint() {
    const start = Date.now();
    this.reglCommandObjects.forEach((cmd) => (cmd.stats.count = 0));
    if (!this.initializedData) {
      return;
    }
    const { regl, camera } = this.initializedData;
    this._clearCanvas(regl);
    camera.draw(this.cameraStore.state, () => {
      const x = Date.now();
      this._drawInput();
      this.counters.paint = Date.now() - x;
    });

    this._paintCalls.forEach((paint) => {
      paint();
    });
    this.counters.render = Date.now() - start;
  }

  _debouncedPaint = debounce(this.paint, 10);

  readHitmap(canvasX: number, canvasY: number): Promise<number> {
    if (!this.initializedData) {
      return new Promise((_, reject) => reject(new Error("regl data not initialized yet")));
    }

    const { regl, camera, _fbo } = this.initializedData;
    const { width, height } = this.dimension;

    const x = canvasX;
    // 0,0 corresponds to the bottom left in the webgl context, but the top left in window coordinates
    const y = height - canvasY;

    // regl will only resize the framebuffer if the size changed
    // it uses floored whole pixel values
    _fbo.resize(Math.floor(width), Math.floor(height));

    return new Promise((resolve) => {
      // tell regl to use a framebuffer for this render
      regl({ framebuffer: _fbo })(() => {
        // clear the framebuffer
        regl.clear({ color: [0, 0, 0, 1], depth: 1 });

        // draw the hitmap components to the framebuffer
        camera.draw(this.cameraStore.state, () => {
          this._drawInput(true);

          let objectId = 0;

          // it's possible to get x/y values outside the framebuffer size
          // if the mouse quickly leaves the draw area during a read operation
          // reading outside the bounds of the framebuffer causes errors
          // and puts regl into a bad internal state.
          // https://github.com/regl-project/regl/blob/28fbf71c871498c608d9ec741d47e34d44af0eb5/lib/read.js#L57
          if (x < Math.floor(width) && y < Math.floor(height) && x >= 0 && y >= 0) {
            const pixel = new Uint8Array(4);

            // read pixel value from the frame buffer
            regl.read({
              x,
              y,
              width: 1,
              height: 1,
              data: pixel,
            });

            objectId = getIdFromColor(pixel);
          }
          resolve(objectId);
        });
      });
    });
  }

  callComponentHandlers = (objectId: number, ray: Ray, e: MouseEvent, mouseEventName: MouseEventEnum) => {
    this._hitmapCalls.forEach((_, component) => {
      if (component instanceof Command) {
        component.handleMouseEvent(objectId, e, ray, mouseEventName);
      }
    });
  };

  _drawInput = (isHitmap?: boolean) => {
    const drawCallsMap = isHitmap ? this._hitmapCalls : this._drawCalls;
    const sortedDrawCalls = Array.from(drawCallsMap.values()).sort((a, b) => (a.layerIndex || 0) - (b.layerIndex || 0));

    sortedDrawCalls.forEach((drawInput: DrawInput) => {
      const { command, drawProps, instance } = drawInput;
      if (!drawProps) {
        return console.debug(`${isHitmap ? "hitmap" : ""} draw skipped, props was falsy`, drawInput);
      }
      const cmd = this._compiled.get(command);
      if (!cmd) {
        return console.warn("could not find draw command for", instance.constructor.displayName);
      }
      cmd(drawProps);
    });
  };

  _clearCanvas = (regl: any) => {
    // Since we aren't using regl.frame and only rendering when we need to,
    // we need to tell regl to update its internal state.
    regl.poll();
    regl.clear({
      color: this.canvasBackgroundColor,
      depth: 1,
    });
  };

  _instrumentCommands(regl: any) {
    if (getNodeEnv() === "production") {
      return regl;
    }
    return new Proxy(regl, {
      apply: (target, thisArg, args) => {
        const command = target(...args);
        if (typeof command.stats === "object") {
          this.reglCommandObjects.push(command);
        }
        return command;
      },
    });
  }
}
