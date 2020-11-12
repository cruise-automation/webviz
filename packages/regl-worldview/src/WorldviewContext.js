// @flow

//  Copyright (c) 2018-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import * as React from "react";
import createREGL from "regl";
import shallowequal from "shallowequal";

import { camera, CameraStore } from "./camera/index";
import Command from "./commands/Command";
import type {
  Dimensions,
  RawCommand,
  CompiledReglCommand,
  CameraCommand,
  Vec4,
  CameraState,
  MouseEventObject,
  GetChildrenForHitmap,
  AssignNextColorsFn,
} from "./types";
import { getIdFromPixel, intToRGB } from "./utils/commandUtils";
import { getNodeEnv } from "./utils/common";
import HitmapObjectIdManager from "./utils/HitmapObjectIdManager";
import queuePromise from "./utils/queuePromise";
import { getRayFromClick } from "./utils/Raycast";

type Props = any;

type ConstructorArgs = {
  dimension: Dimensions,
  canvasBackgroundColor: Vec4,
  cameraState: CameraState,
  defaultCameraState?: CameraState,
  onCameraStateChange: ?(CameraState) => void,
  contextAttributes?: ?any,
};

type InitializedData = {
  _fbo: any,
  regl: any,
  camera: CameraCommand,
};

export type DrawInput = {
  instance: Command<any>,
  reglCommand: RawCommand<any>,
  children: Props,
  layerIndex: ?number,
  getChildrenForHitmap: ?GetChildrenForHitmap,
};

export type PaintFn = () => void;

export type WorldviewContextType = {
  onMount(instance: Command<any>, command: RawCommand<any>): void,
  registerDrawCall(drawInput: DrawInput): void,
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
  _drawCalls: Map<React.Component<any>, DrawInput> = new Map();
  _frame: ?AnimationFrameID;
  _paintCalls: Map<PaintFn, PaintFn> = new Map();
  _hitmapObjectIdManager: HitmapObjectIdManager = new HitmapObjectIdManager();
  _cachedReadHitmapCall: ?{
    arguments: any[],
    result: Array<[MouseEventObject, Command<any>]>,
  } = undefined;
  // store every compiled command object compiled for debugging purposes
  reglCommandObjects: { stats: { count: number } }[] = [];
  counters: { paint?: number, render?: number } = {};
  dimension: Dimensions;
  onDirty: () => void;
  cameraStore: CameraStore;
  canvasBackgroundColor: Vec4 = [0, 0, 0, 1];
  // group all initialized data together so it can be checked for existence to verify initialization is complete
  initializedData: ?InitializedData;
  contextAttributes: ?any;

  constructor({ dimension, canvasBackgroundColor, cameraState, onCameraStateChange }: ConstructorArgs) {
    // used for children to call paint() directly
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
        attributes: this.contextAttributes || {},
        extensions: [
          "angle_instanced_arrays",
          "oes_texture_float",
          "oes_element_index_uint",
          "oes_standard_derivatives",
        ],
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
    if (this._frame) {
      cancelAnimationFrame(this._frame);
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
    try {
      this._paint();
    } catch (error) {
      // Regl automatically tries to reconnect when losing the canvas 3d context.
      // We should log this error, but it's not important to throw it.
      if (error.message === "(regl) context lost") {
        console.warn(error);
      } else {
        throw error;
      }
    }
  }

  _paint() {
    const start = Date.now();
    this.reglCommandObjects.forEach((cmd) => (cmd.stats.count = 0));
    if (!this.initializedData) {
      return;
    }
    this._cachedReadHitmapCall = null; // clear the cache every time we paint
    const { regl, camera } = this.initializedData;
    this._clearCanvas(regl);
    camera.draw(this.cameraStore.state, () => {
      const x = Date.now();
      this._drawInput();
      this.counters.paint = Date.now() - x;
    });

    this._paintCalls.forEach((paintCall) => {
      paintCall();
    });
    this.counters.render = Date.now() - start;
    this._frame = undefined;
  }

  onDirty = () => {
    if (undefined === this._frame) {
      this._frame = requestAnimationFrame(() => this.paint());
    }
  };

  readHitmap = queuePromise(
    (
      canvasX: number,
      canvasY: number,
      enableStackedObjectEvents: boolean,
      maxStackedObjectCount: number
    ): Promise<Array<[MouseEventObject, Command<any>]>> => {
      if (!this.initializedData) {
        return Promise.reject(new Error("regl data not initialized yet"));
      }
      const args = [canvasX, canvasY, enableStackedObjectEvents, maxStackedObjectCount];

      const cachedReadHitmapCall = this._cachedReadHitmapCall;
      if (cachedReadHitmapCall) {
        if (shallowequal(cachedReadHitmapCall.arguments, args)) {
          // Make sure that we aren't returning the exact object identity of the mouseEventObject - we don't know what
          // callers have done with it.
          const result = cachedReadHitmapCall.result.map(([mouseEventObject, command]) => [
            { ...mouseEventObject },
            command,
          ]);
          return Promise.resolve(result);
        }
        this._cachedReadHitmapCall = undefined;
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
          regl.clear({ color: intToRGB(0), depth: 1 });
          let currentObjectId = 0;
          const excludedObjects = [];
          const mouseEventsWithCommands = [];
          let counter = 0;

          camera.draw(this.cameraStore.state, () => {
            // Every iteration in this loop clears the framebuffer, draws the hitmap objects that have NOT already been
            // seen to the framebuffer, and then reads the pixel under the cursor to find the object on top.
            // If `enableStackedObjectEvents` is false, we only do this iteration once - we only resolve with 0 or 1
            // objects.
            do {
              if (counter >= maxStackedObjectCount) {
                // Provide a max number of layers so this while loop doesn't crash the page.
                console.error(
                  `Hit ${maxStackedObjectCount} iterations. There is either a bug or that number of rendered hitmap layers under the mouse cursor.`
                );
                break;
              }
              counter++;
              regl.clear({ color: intToRGB(0), depth: 1 });
              this._drawInput(true, excludedObjects);

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

                currentObjectId = getIdFromPixel(pixel);
                const mouseEventObject = this._hitmapObjectIdManager.getObjectByObjectHitmapId(currentObjectId);

                // Check an error case: if we see an ID/color that we don't know about, it means that some command is
                // drawing a color into the hitmap that it shouldn't be.
                if (currentObjectId > 0 && !mouseEventObject) {
                  console.error(
                    `Clicked on an unknown object with id ${currentObjectId}. This likely means that a command is painting an incorrect color into the hitmap.`
                  );
                }
                // Check an error case: if we've already seen this object, then the getHitmapFromChildren function
                // is not respecting the excludedObjects correctly and we should notify the user of a bug.
                if (
                  excludedObjects.some(
                    ({ object, instanceIndex }) =>
                      object === mouseEventObject.object && instanceIndex === mouseEventObject.instanceIndex
                  )
                ) {
                  console.error(
                    `Saw object twice when reading from hitmap. There is likely an error in getHitmapFromChildren`,
                    mouseEventObject
                  );
                  break;
                }

                if (currentObjectId > 0 && mouseEventObject.object) {
                  const command = this._hitmapObjectIdManager.getCommandForObject(mouseEventObject.object);
                  excludedObjects.push(mouseEventObject);
                  if (command) {
                    mouseEventsWithCommands.push([mouseEventObject, command]);
                  }
                }
              }
              // If we haven't enabled stacked object events, break out of the loop immediately.
              // eslint-disable-next-line no-unmodified-loop-condition
            } while (currentObjectId !== 0 && enableStackedObjectEvents);

            this._cachedReadHitmapCall = {
              arguments: args,
              result: mouseEventsWithCommands,
            };
            resolve(mouseEventsWithCommands);
          });
        });
      });
    }
  );

  _drawInput = (isHitmap?: boolean, excludedObjects?: MouseEventObject[]) => {
    if (isHitmap) {
      this._hitmapObjectIdManager = new HitmapObjectIdManager();
    }

    const drawCalls = Array.from(this._drawCalls.values()).sort((a, b) => (a.layerIndex || 0) - (b.layerIndex || 0));
    drawCalls.forEach((drawInput: DrawInput) => {
      const { reglCommand, children, instance, getChildrenForHitmap } = drawInput;
      if (!children) {
        return console.debug(`${isHitmap ? "hitmap" : ""} draw skipped, props was falsy`, drawInput);
      }
      const cmd = this._compiled.get(reglCommand);
      if (!cmd) {
        return console.warn("could not find draw command for", instance ? instance.constructor.displayName : "Unknown");
      }
      // draw hitmap
      if (isHitmap && getChildrenForHitmap) {
        const assignNextColorsFn: AssignNextColorsFn = (...rest) => {
          return this._hitmapObjectIdManager.assignNextColors(instance, ...rest);
        };
        const hitmapProps = getChildrenForHitmap(children, assignNextColorsFn, excludedObjects || []);
        if (hitmapProps) {
          cmd(hitmapProps, true);
        }
      } else if (!isHitmap) {
        cmd(children, false);
      }
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
