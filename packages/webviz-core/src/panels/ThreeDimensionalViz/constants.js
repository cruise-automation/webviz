// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import AlphaR from "@mdi/svg/svg/alpha-r.svg";
import AlphaT from "@mdi/svg/svg/alpha-t.svg";
import ArrowCollapseDown from "@mdi/svg/svg/arrow-collapse-down.svg";
import ArrowCollapseLeft from "@mdi/svg/svg/arrow-collapse-left.svg";
import ArrowCollapseRight from "@mdi/svg/svg/arrow-collapse-right.svg";
import ArrowCollapseUp from "@mdi/svg/svg/arrow-collapse-up.svg";
import ArrowDecision from "@mdi/svg/svg/arrow-decision.svg";
import ArrowLeft from "@mdi/svg/svg/arrow-left.svg";
import ArrowRight from "@mdi/svg/svg/arrow-right.svg";
import ArrowTopLeft from "@mdi/svg/svg/arrow-top-left.svg";
import ArrowTopRight from "@mdi/svg/svg/arrow-top-right.svg";
import Bike from "@mdi/svg/svg/bike.svg";
import BusSchool from "@mdi/svg/svg/bus-school.svg";
import Bus from "@mdi/svg/svg/bus.svg";
import CarBrakeAlert from "@mdi/svg/svg/car-brake-alert.svg";
import CarParkingLights from "@mdi/svg/svg/car-parking-lights.svg";
import Car from "@mdi/svg/svg/car.svg";
import CubeOutline from "@mdi/svg/svg/cube-outline.svg";
import HazardLights from "@mdi/svg/svg/hazard-lights.svg";
import HelpCircleOutline from "@mdi/svg/svg/help-circle-outline.svg";
import Help from "@mdi/svg/svg/help.svg";
import Motorbike from "@mdi/svg/svg/motorbike.svg";
import Octagon from "@mdi/svg/svg/octagon.svg";
import RoadVariant from "@mdi/svg/svg/road-variant.svg";
import RobotOffOutline from "@mdi/svg/svg/robot-off-outline.svg";
import RobotOutline from "@mdi/svg/svg/robot-outline.svg";
import SignalOff from "@mdi/svg/svg/signal-off.svg";
import Train from "@mdi/svg/svg/train.svg";
import Truck from "@mdi/svg/svg/truck.svg";
import Walk from "@mdi/svg/svg/walk.svg";

import type { ArrowMarker, ClearingMarker } from "webviz-core/src/types/Messages";

export const LAYER_INDEX_TEXT = 10;
export const LAYER_INDEX_OCCUPANCY_GRIDS = -1;

// When the World is drawn in multiple passes, these values are used
// to set the base for all markers in that render pass.
export const LAYER_INDEX_DEFAULT_BASE = 0;
export const LAYER_INDEX_HIGHLIGHT_OVERLAY = 500;
export const LAYER_INDEX_HIGHLIGHT_BASE = 1000;
export const LAYER_INDEX_DIFF_MODE_BASE_PER_PASS = 100;

// Used by the ImageView panel. Use icon names from https://materialdesignicons.com for future icons.
export const ICON_BY_TYPE = {
  // Supported icons, add more if needed.
  "alpha-r": AlphaR,
  "alpha-t": AlphaT,
  "arrow-collapse-down": ArrowCollapseDown,
  "arrow-collapse-left": ArrowCollapseLeft,
  "arrow-collapse-right": ArrowCollapseRight,
  "arrow-collapse-up": ArrowCollapseUp,
  "arrow-decision": ArrowDecision,
  "arrow-left": ArrowLeft,
  "arrow-right": ArrowRight,
  "arrow-top-left": ArrowTopLeft,
  "arrow-top-right": ArrowTopRight,
  "bus-school": BusSchool,
  "car-brake-alert": CarBrakeAlert,
  "car-parking-lights": CarParkingLights,
  "hazard-lights": HazardLights,
  "help-circle-outline": HelpCircleOutline,
  "road-variant": RoadVariant,
  "signal-off": SignalOff,
  "robot-outline": RobotOutline,
  "robot-off-outline": RobotOffOutline,
  bike: Bike,
  bus: Bus,
  car: Car,
  DEFAULT: CubeOutline,
  help: Help,
  motorbike: Motorbike,
  octagon: Octagon,
  train: Train,
  truck: Truck,
  walk: Walk,
};

// Used by the 3D panel's GLIcon command.
// Use icon unicode values from https://pictogrammers.github.io/@mdi/font/6.5.95/ for future icons.
export const ICON_CHAR_BY_TYPE = {
  "alpha-r": "\u{F0AFF}",
  "alpha-t": "\u{F0B01}",
  "arrow-collapse-down": "\u{F0792}",
  "arrow-collapse-left": "\u{F0793}",
  "arrow-collapse-right": "\u{F0794}",
  "arrow-collapse-up": "\u{F0795}",
  "arrow-decision": "\u{F09BB}",
  "arrow-left": "\u{F004D}",
  "arrow-right": "\u{F0054}",
  "arrow-top-left": "\u{F005B}",
  "arrow-top-right": "\u{F005C}",
  "bus-school": "\u{F079F}",
  "car-brake-alert": "\u{F0C48}",
  "car-parking-lights": "\u{F0D63}",
  "hazard-lights": "\u{F0C89}",
  "help-circle-outline": "\u{F0625}",
  "road-variant": "\u{F0462}",
  "signal-off": "\u{F0783}",
  "robot-outline": "\u{F167A}",
  "robot-off-outline": "\u{F167B}",
  bike: "\u{F00A3}",
  bus: "\u{F00E7}",
  car: "\u{F010B}",
  DEFAULT: "\u{F01A7}",
  help: "\u{F02D6}",
  motorbike: "\u{F037C}",
  octagon: "\u{F03C3}",
  train: "\u{F052C}",
  truck: "\u{F053D}",
  walk: "\u{F0583}",
};

export const EMPTY_MARKER: ArrowMarker = {
  header: {
    frame_id: "",
    stamp: { sec: 0, nsec: 0 },
    seq: 0,
  },
  pose: {
    orientation: { w: 0, x: 0, y: 0, z: 0 },
    position: { x: 0, y: 0, z: 0 },
  },
  type: 0,
  scale: { x: 0.0, y: 0, z: 0 },
  lifetime: { sec: 0, nsec: 0 },
  frame_locked: false,
  text: "",
  mesh_resource: "",
  mesh_use_embedded_materials: false,
  ns: "",
  color: { r: 0, g: 0, b: 0, a: 0 },
  id: "",
  action: 0,
  colors: [],
  metadata: {},
  points: [],
};

export const CLEARING_MARKER: ClearingMarker = {
  header: {
    frame_id: "",
    stamp: { sec: 0, nsec: 0 },
    seq: 0,
  },
  pose: {
    orientation: { w: 0, x: 0, y: 0, z: 0 },
    position: { x: 0, y: 0, z: 0 },
  },
  type: 0,
  scale: { x: 0.0, y: 0, z: 0 },
  lifetime: { sec: 0, nsec: 0 },
  frame_locked: false,
  text: "",
  mesh_resource: "",
  mesh_use_embedded_materials: false,
  ns: "",
  color: { r: 0, g: 0, b: 0, a: 0 },
  id: "",
  action: 3,
  colors: [],
  metadata: {},
  points: [],
};
