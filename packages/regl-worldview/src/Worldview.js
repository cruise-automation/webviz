// @flow

//  Copyright (c) 2018-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import mapValues from "lodash/mapValues";
import pickBy from "lodash/pickBy";
import * as React from "react";
import ContainerDimensions from "react-container-dimensions";

import { CameraListener, DEFAULT_CAMERA_STATE } from "./camera/index";
import type { MouseHandler, Dimensions, Vec4, CameraState } from "./types";
import { Ray } from "./utils/Raycast";
import { WorldviewContext } from "./WorldviewContext";
import WorldviewReactContext from "./WorldviewReactContext";

const DEFAULT_BACKGROUND_COLOR = [0, 0, 0, 1];

export type BaseProps = {|
  backgroundColor?: Vec4,
  hitmapOnMouseMove?: boolean,
  showDebug?: boolean,
  children?: React.Node,

  defaultCameraState: CameraState,
  // Worldview is controlled if cameraState and onCameraStateChange are both present
  cameraState?: CameraState,
  onCameraStateChange?: (CameraState) => void,

  // interactions
  onDoubleClick?: MouseHandler,
  onMouseDown?: MouseHandler,
  onMouseUp?: MouseHandler,
  onMouseMove?: MouseHandler,
  onClick?: MouseHandler,
  ...Dimensions,
|};

export type Props = $Diff<BaseProps, Dimensions>;

type State = {|
  worldviewContext: WorldviewContext,
|};

function handleMouseInteraction(objectId: number, ray: Ray, e: MouseEvent, handler: MouseHandler) {
  try {
    handler(e, {
      ray,
      clickedObjectId: objectId !== 0 ? objectId : undefined,
    });
  } catch (err) {
    console.error("Error during mouse handler", err);
  }
}

// responsible for camera and scene state management
// takes in children that declaritively define what should be rendered
export class WorldviewBase extends React.Component<BaseProps, State> {
  _canvas: { current: HTMLCanvasElement | null } = React.createRef();
  _tick: AnimationFrameID | void;

  static defaultProps = {
    // rendering the hitmap on mouse move is expensive, so disable it by default
    hitmapOnMouseMove: false,
    backgroundColor: DEFAULT_BACKGROUND_COLOR,
  };

  constructor(props: BaseProps) {
    super(props);
    const { width, height, top, left, backgroundColor } = props;
    this.state = {
      worldviewContext: new WorldviewContext({
        dimension: { width, height, top, left },
        canvasBackgroundColor: backgroundColor || DEFAULT_BACKGROUND_COLOR,
        cameraState: props.cameraState || props.defaultCameraState,
        onCameraStateChange: props.onCameraStateChange || undefined,
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
    // no need to update cameraStore's state if the component is uncontrolled
    if (this.props.cameraState && this.props.onCameraStateChange) {
      worldviewContext.cameraStore.setCameraState(this.props.cameraState);
    }

    // queue up a paint operation on the next frame, if we haven't already
    if (!this._tick) {
      this._tick = requestAnimationFrame(() => {
        this._tick = undefined;
        worldviewContext.paint();
      });
    }
  }

  _onClick = (e: MouseEvent) => {
    if (!this.props.onClick) {
      return;
    }
    this._onMouseInteraction(e, this.props.onClick);
  };

  _onDoubleClick = (e: MouseEvent) => {
    if (!this.props.onDoubleClick) {
      return;
    }
    this._onMouseInteraction(e, this.props.onDoubleClick);
  };

  _onMouseDown = (e: MouseEvent) => {
    if (!this.props.onMouseDown) {
      return;
    }
    this._onMouseInteraction(e, this.props.onMouseDown);
  };

  _onMouseMove = (e: MouseEvent) => {
    if (!this.props.onMouseMove) {
      return;
    }
    this._onMouseInteraction(e, this.props.onMouseMove, this.props.hitmapOnMouseMove);
  };

  _onMouseUp = (e: MouseEvent) => {
    if (!this.props.onMouseUp) {
      return;
    }
    this._onMouseInteraction(e, this.props.onMouseUp);
  };

  _onMouseInteraction = (e: MouseEvent, handler: MouseHandler, readHitmap: boolean = true) => {
    if (!(e.target instanceof window.HTMLElement) || e.button !== 0) {
      return;
    }
    const { worldviewContext } = this.state;
    const { clientX, clientY } = e;
    const { top: clientTop, left: clientLeft } = e.target.getBoundingClientRect();

    const canvasX = clientX - clientLeft;
    const canvasY = clientY - clientTop;
    const ray = worldviewContext.raycast(canvasX, canvasY);
    if (!ray) {
      return;
    }

    if (!readHitmap) {
      return handleMouseInteraction(0, ray, e, handler);
    }

    // reading hitmap is async so we need to persist the event to use later in the event handler
    (e: any).persist();
    worldviewContext
      .readHitmap(canvasX, canvasY)
      .then((objectId) => handleMouseInteraction(objectId, ray, e, handler))
      .catch((e) => {
        console.error(e);
      });
  };

  _renderDebug() {
    const { worldviewContext } = this.state;
    const initializedData = worldviewContext.initializedData;

    if (process.env.NODE_ENV === "production" || !initializedData) {
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
    const { width, height, showDebug } = this.props;
    const { worldviewContext } = this.state;
    const style = { width, height };

    return (
      <React.Fragment>
        <CameraListener cameraStore={worldviewContext.cameraStore}>
          <canvas
            style={style}
            width={width}
            height={height}
            ref={this._canvas}
            onMouseUp={this._onMouseUp}
            onMouseDown={this._onMouseDown}
            onDoubleClick={this._onDoubleClick}
            onMouseMove={this._onMouseMove}
            onClick={this._onClick}
          />
          {showDebug ? this._renderDebug() : null}
        </CameraListener>
        {worldviewContext.initializedData && (
          <WorldviewReactContext.Provider value={worldviewContext}>
            {this.props.children}
          </WorldviewReactContext.Provider>
        )}
      </React.Fragment>
    );
  }
}

const Worldview = (props: Props) => (
  <ContainerDimensions>
    {({ width, height, left, top }) => <WorldviewBase width={width} height={height} left={left} top={top} {...props} />}
  </ContainerDimensions>
);

Worldview.defaultProps = {
  defaultCameraState: DEFAULT_CAMERA_STATE,
};

Worldview.displayName = "Worldview";

export default Worldview;
