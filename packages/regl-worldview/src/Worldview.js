// @flow

//  Copyright (c) 2018-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import mapValues from "lodash/mapValues";
import pickBy from "lodash/pickBy";
import * as React from "react";

import { CameraListener, DEFAULT_CAMERA_STATE } from "./camera/index";
import Command from "./commands/Command";
import type {
  MouseHandler,
  Dimensions,
  Vec4,
  CameraState,
  CameraKeyMap,
  MouseEventEnum,
  MouseEventObject,
} from "./types";
import aggregate from "./utils/aggregate";
import { getNodeEnv } from "./utils/common";
import ContainerDimensions from "./utils/Dimensions";
import { Ray } from "./utils/Raycast";
import { WorldviewContext } from "./WorldviewContext";
import WorldviewReactContext from "./WorldviewReactContext";

const DEFAULT_BACKGROUND_COLOR = [0, 0, 0, 1];
export const DEFAULT_MOUSE_CLICK_RADIUS = 3;
const DEFAULT_MAX_NUMBER_OF_HITMAP_LAYERS = 100;

export type BaseProps = {|
  keyMap?: CameraKeyMap,
  shiftKeys: boolean,
  backgroundColor?: Vec4,
  // (Deprecated) rendering the hitmap on mouse move is expensive, so disable it by default
  hitmapOnMouseMove?: boolean,
  // Disable hitmap generation for specific mouse events
  // For example, if you want to disable hitmap generating on drag, use: ["onMouseDown", "onMouseMove", "onMouseUp"]
  disableHitmapForEvents?: MouseEventEnum[],
  // getting events for objects stacked on top of each other is expensive, so disable it by default
  enableStackedObjectEvents?: boolean,
  // allow users to specify the max stacked object count
  maxStackedObjectCount: number,
  showDebug?: boolean,
  children?: React.Node,
  style: { [styleAttribute: string]: number | string },

  cameraState?: $Shape<CameraState>,
  onCameraStateChange?: (CameraState) => void,
  defaultCameraState?: $Shape<CameraState>,
  // interactions
  onDoubleClick?: MouseHandler,
  onMouseDown?: MouseHandler,
  onMouseUp?: MouseHandler,
  onMouseMove?: MouseHandler,
  onClick?: MouseHandler,

  // Used to scale the canvas resolution and provide a higher image quality
  resolutionScale?: number,
  ...Dimensions,

  // Context attributes passed into canvas.getContext.
  contextAttributes?: ?{ [string]: any },
  canvas?: HTMLCanvasElement,
|};

type State = {|
  worldviewContext: WorldviewContext,
|};

function handleWorldviewMouseInteraction(
  objects: MouseEventObject[],
  ray: Ray,
  e: SyntheticMouseEvent<HTMLCanvasElement>,
  handler: MouseHandler
) {
  const args = { ray, objects };

  try {
    handler(e, args);
  } catch (err) {
    console.error("Error during mouse handler", err);
  }
}

// responsible for camera and scene state management
// takes in children that declaritively define what should be rendered
export class WorldviewBase extends React.Component<BaseProps, State> {
  _canvas: { current: HTMLCanvasElement | null } = React.createRef();
  _cameraListener: { current: CameraListener | null } = React.createRef();
  _tick: AnimationFrameID | void;
  _dragStartPos: ?{ x: number, y: number } = null;

  static defaultProps = {
    maxStackedObjectCount: DEFAULT_MAX_NUMBER_OF_HITMAP_LAYERS,
    backgroundColor: DEFAULT_BACKGROUND_COLOR,
    shiftKeys: true,
    style: {},
    resolutionScale: 1,
  };

  constructor(props: BaseProps) {
    super(props);
    const {
      width,
      height,
      top,
      left,
      backgroundColor,
      onCameraStateChange,
      cameraState,
      defaultCameraState,
      hitmapOnMouseMove,
      disableHitmapForEvents,
      canvas,
    } = props;
    if (canvas) {
      this._canvas.current = canvas;
    }
    if (onCameraStateChange) {
      if (!cameraState) {
        console.warn(
          "You provided `onCameraStateChange` without `cameraState`. Use Worldview as a controlled component with `cameraState` and `onCameraStateChange`, or uncontrolled with `defaultCameraState`."
        );
      }
      if (cameraState && defaultCameraState) {
        console.warn("You provided both `cameraState` and `defaultCameraState`. `defaultCameraState` will be ignored.");
      }
    } else {
      if (cameraState) {
        console.warn(
          "You provided `cameraState` without an `onCameraStateChange` handler. This will prevent moving the camera. If the camera should be movable, use `defaultCameraState`, otherwise set `onCameraStateChange`."
        );
      }
    }

    if (hitmapOnMouseMove) {
      if (disableHitmapForEvents) {
        throw new Error(
          "Property 'hitmapOnMouseMove' is deprectated and will be ignored when used along with 'disableHitmapForEvents'."
        );
      } else {
        console.warn(
          "Property 'hitmapOnMouseMove' is deprectated. Please use 'disableHitmapForEvents' property instead."
        );
      }
    }

    this.state = {
      worldviewContext: new WorldviewContext({
        dimension: { width, height, top, left },
        canvasBackgroundColor: backgroundColor || DEFAULT_BACKGROUND_COLOR,
        // DEFAULT_CAMERA_STATE is applied if both `cameraState` and `defaultCameraState` are not present
        cameraState: props.cameraState || props.defaultCameraState || DEFAULT_CAMERA_STATE,
        onCameraStateChange: props.onCameraStateChange || undefined,
        contextAttributes: props.contextAttributes || {},
      }),
    };
  }

  static getDerivedStateFromProps({ width, height, top, left }: BaseProps, { worldviewContext }: State) {
    worldviewContext.setDimension({ width, height, top, left });
    return null;
  }

  componentDidMount() {
    if (!this._canvas.current) {
      return console.warn("missing canvas element");
    }
    const { worldviewContext } = this.state;
    worldviewContext.initialize(this._canvas.current);
    // trigger rendering in children that require camera to be present, e.g. Text component
    this.setState({}); //eslint-disable-line
    // call paint to set the correct viewportWidth and viewportHeight for camera so non-regl components
    // such as Text can get the correct screen coordinates for the first render
    worldviewContext.paint();
  }

  componentWillUnmount() {
    if (this._tick) {
      cancelAnimationFrame(this._tick);
    }
    this.state.worldviewContext.destroy();
  }

  componentDidUpdate() {
    const { worldviewContext } = this.state;
    // update internal cameraState
    if (this.props.cameraState) {
      worldviewContext.cameraStore.setCameraState(this.props.cameraState);
    }
    worldviewContext.onDirty();
  }

  focus() {
    if (this._cameraListener.current) {
      this._cameraListener.current.focus();
    }
  }

  handleOffscreenMouseEvent = (e: SyntheticMouseEvent<HTMLCanvasElement>, mouseEventName: MouseEventEnum) => {
    if (mouseEventName === "onDoubleClick") {
      this._onDoubleClick(e, true);
    } else if (mouseEventName === "onMouseDown") {
      this._onMouseDown(e, true);
    } else if (mouseEventName === "onMouseMove") {
      this._onMouseMove(e, true);
    } else if (mouseEventName === "onMouseUp") {
      this._onMouseUp(e, true);
    }
  };

  _onDoubleClick = (e: SyntheticMouseEvent<HTMLCanvasElement>, fromOffscreenTarget: boolean) => {
    this._onMouseInteraction(e, "onDoubleClick", fromOffscreenTarget);
  };

  _onMouseDown = (e: SyntheticMouseEvent<HTMLCanvasElement>, fromOffscreenTarget: boolean) => {
    this._dragStartPos = { x: e.clientX, y: e.clientY };
    this._onMouseInteraction(e, "onMouseDown", fromOffscreenTarget);
  };

  _onMouseMove = (e: SyntheticMouseEvent<HTMLCanvasElement>, fromOffscreenTarget: boolean) => {
    this._onMouseInteraction(e, "onMouseMove", fromOffscreenTarget);
  };

  _onMouseUp = (e: SyntheticMouseEvent<HTMLCanvasElement>, fromOffscreenTarget: boolean) => {
    this._onMouseInteraction(e, "onMouseUp", fromOffscreenTarget);
    const { _dragStartPos } = this;
    if (_dragStartPos) {
      const deltaX = e.clientX - _dragStartPos.x;
      const deltaY = e.clientY - _dragStartPos.y;
      const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
      if (distance < DEFAULT_MOUSE_CLICK_RADIUS) {
        this._onMouseInteraction(e, "onClick", fromOffscreenTarget);
      }
      this._dragStartPos = null;
    }
  };

  _onMouseInteraction = (
    e: SyntheticMouseEvent<HTMLCanvasElement>,
    mouseEventName: MouseEventEnum,
    fromOffscreenTarget: boolean
  ) => {
    const { worldviewContext } = this.state;
    const worldviewHandler = this.props[mouseEventName];

    // When working with offscreen canvases, window is not defined and the target
    // might not be a valid HTMLElement. If so, we can asume any event coming
    // from an offscreen canvas already has a relevant target.
    if (!fromOffscreenTarget && (!(e.target instanceof window.HTMLElement) || e.button !== 0)) {
      return;
    }

    // $FlowFixMe: Because of `fromOffscreenTarget`, target might not be an actual HTMLElement instance but still needs to implement `getBoundingClientRect`
    const { top: clientTop, left: clientLeft } = e.target.getBoundingClientRect();
    const { clientX, clientY } = e;

    const canvasX = clientX - clientLeft;
    const canvasY = clientY - clientTop;
    const ray = worldviewContext.raycast(canvasX, canvasY);
    if (!ray) {
      return;
    }

    // Rendering the hitmap is expensive, so we should disable it for some events.
    // If 'disableHitmapForEvents' is provided, we ignore any events contained in that property.
    // Otherwise, we ignore 'onMouseMove' events by default unless 'hitmapOnMouseMove' is 'true'
    const { hitmapOnMouseMove, disableHitmapForEvents = hitmapOnMouseMove ? [] : ["onMouseMove"] } = this.props;
    if (disableHitmapForEvents.includes(mouseEventName)) {
      if (worldviewHandler) {
        return handleWorldviewMouseInteraction([], ray, e, worldviewHandler);
      }
      return;
    }

    // reading hitmap is async so we need to persist the event to use later in the event handler
    (e: any).persist();
    worldviewContext
      .readHitmap(canvasX, canvasY, !!this.props.enableStackedObjectEvents, this.props.maxStackedObjectCount)
      .then((mouseEventsWithCommands) => {
        const mouseEventsByCommand: Map<Command<any>, Array<MouseEventObject>> = aggregate(mouseEventsWithCommands);
        for (const [command, mouseEvents] of mouseEventsByCommand.entries()) {
          command.handleMouseEvent(mouseEvents, ray, e, mouseEventName);
          if (e.isPropagationStopped()) {
            break;
          }
        }
        if (worldviewHandler && !e.isPropagationStopped()) {
          const mouseEvents = mouseEventsWithCommands.map(([mouseEventObject]) => mouseEventObject);
          handleWorldviewMouseInteraction(mouseEvents, ray, e, worldviewHandler);
        }
      })
      .catch((e) => {
        console.error(e);
      });
  };

  _renderDebug() {
    const { worldviewContext } = this.state;
    const initializedData = worldviewContext.initializedData;

    if (getNodeEnv() === "production" || !initializedData) {
      return null;
    }
    const { regl } = initializedData;
    const mem = window.performance.memory;
    const style = {
      bottom: 5,
      right: 10,
      width: 200,
      position: "absolute",
      backgroundColor: "rgba(0, 0, 0, 0.5)",
      color: "white",
      fontFamily: "monospace",
      fontSize: 10,
    };
    const { counters, reglCommandObjects } = worldviewContext;
    const data = mapValues(counters, (val) => `${val} ms`);
    data["draw calls"] = reglCommandObjects.reduce((total, cmd) => total + cmd.stats.count, 0);
    if (mem) {
      data["heap used"] = `${((mem.usedJSHeapSize / mem.jsHeapSizeLimit) * 100).toFixed(3)}%`;
    }

    Object.assign(data, pickBy(regl.stats, (val) => typeof val === "number" && val !== 0));
    if (regl.stats.bufferCount > 1000) {
      throw new Error("Memory leak: Buffer count > 1000.");
    }

    const rows = Object.keys(data).map((key) => {
      return (
        <tr key={key} style={{ backgroundColor: "transparent", border: "none" }}>
          <td style={{ paddingRight: 10, border: "none" }}>{key}</td>
          <td style={{ width: "100%", border: "none" }}>{data[key]}</td>
        </tr>
      );
    });
    return (
      <table style={style}>
        <tbody>{rows}</tbody>
      </table>
    );
  }

  render() {
    const {
      width,
      height,
      showDebug,
      keyMap,
      shiftKeys,
      style,
      cameraState,
      onCameraStateChange,
      resolutionScale,
      canvas,
    } = this.props;
    const { worldviewContext } = this.state;
    // If we are supplied controlled camera state and no onCameraStateChange callback
    // then there is a 'fixed' camera from outside of worldview itself.
    const isFixedCamera = cameraState && !onCameraStateChange;
    const canvasScale = resolutionScale || 1;
    const canvasHtml = canvas ? null : (
      <React.Fragment>
        <canvas
          style={{ width, height, maxWidth: "100%", maxHeight: "100%" }}
          width={width * canvasScale}
          height={height * canvasScale}
          ref={this._canvas}
          onMouseUp={this._onMouseUp}
          onMouseDown={this._onMouseDown}
          onDoubleClick={this._onDoubleClick}
          onMouseMove={this._onMouseMove}
        />
        {showDebug && this._renderDebug()}
      </React.Fragment>
    );

    return (
      <div style={{ position: "relative", overflow: "hidden", ...style }}>
        {/* skip rendering CameraListener if Worldview has a fixed camera */}
        {isFixedCamera ? (
          canvasHtml
        ) : (
          <CameraListener
            cameraStore={worldviewContext.cameraStore}
            keyMap={keyMap}
            shiftKeys={shiftKeys}
            ref={(el) => (this._cameraListener.current = el)}>
            {canvasHtml}
          </CameraListener>
        )}
        {worldviewContext.initializedData && (
          <WorldviewReactContext.Provider value={worldviewContext}>
            {this.props.children}
          </WorldviewReactContext.Provider>
        )}
      </div>
    );
  }
}

export type Props = $Diff<React.ElementConfig<typeof WorldviewBase>, Dimensions>;

const Worldview = React.forwardRef<Props, _>((props: Props, ref) => (
  <ContainerDimensions>
    {({ width, height, left, top }) => (
      <WorldviewBase width={width} height={height} left={left} top={top} ref={ref} {...props} />
    )}
  </ContainerDimensions>
));

Worldview.displayName = "Worldview";

export default Worldview;
