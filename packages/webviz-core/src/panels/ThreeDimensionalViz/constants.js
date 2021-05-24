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

export const LAYER_INDEX_TEXT = 10;
export const LAYER_INDEX_OCCUPANCY_GRIDS = -1;

// When the World is drawn in multiple passes, these values are used
// to set the base for all markers in that render pass.
export const LAYER_INDEX_DEFAULT_BASE = 0;
export const LAYER_INDEX_HIGHLIGHT_OVERLAY = 500;
export const LAYER_INDEX_HIGHLIGHT_BASE = 1000;
export const LAYER_INDEX_DIFF_MODE_BASE_PER_PASS = 100;

// Use for both 3D panel and ImageView panel. Use icon names from https://materialdesignicons.com for future icons.
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
