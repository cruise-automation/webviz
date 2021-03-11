// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import AlphaR from "@mdi/svg/svg/alpha-r.svg";
import ArrowCollapseUp from "@mdi/svg/svg/arrow-collapse-up.svg";
import ArrowDecision from "@mdi/svg/svg/arrow-decision.svg";
import ArrowLeft from "@mdi/svg/svg/arrow-left.svg";
import ArrowRight from "@mdi/svg/svg/arrow-right.svg";
import Bike from "@mdi/svg/svg/bike.svg";
import BusSchool from "@mdi/svg/svg/bus-school.svg";
import Bus from "@mdi/svg/svg/bus.svg";
import CarBrakeAlert from "@mdi/svg/svg/car-brake-alert.svg";
import Car from "@mdi/svg/svg/car.svg";
import CubeOutline from "@mdi/svg/svg/cube-outline.svg";
import HazardLights from "@mdi/svg/svg/hazard-lights.svg";
import HelpCircleOutline from "@mdi/svg/svg/help-circle-outline.svg";
import Help from "@mdi/svg/svg/help.svg";
import Motorbike from "@mdi/svg/svg/motorbike.svg";
import Octagon from "@mdi/svg/svg/octagon.svg";
import RoadVariant from "@mdi/svg/svg/road-variant.svg";
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
  // signal icons, deprecated.
  "100001": Car, // open door, for both left and right
  "100002": ArrowLeft, // left signal
  "100003": ArrowRight, // right signal
  "100004": HazardLights, // hazard
  "100005": CarBrakeAlert, // brakes
  "100006": AlphaR, // reverse lights
  "100007": SignalOff, // signal off
  "100008": HelpCircleOutline, // signal unknown

  // Supported icons, add more if needed.
  "alpha-r": AlphaR,
  "arrow-collapse-up": ArrowCollapseUp,
  "arrow-decision": ArrowDecision,
  "arrow-left": ArrowLeft,
  "arrow-right": ArrowRight,
  "bus-school": BusSchool,
  "car-brake-alert": CarBrakeAlert,
  "hazard-lights": HazardLights,
  "help-circle-outline": HelpCircleOutline,
  "road-variant": RoadVariant,
  "signal-off": SignalOff,
  bike: Bike,
  bus: Bus,
  car: Car,
  help: Help,
  motorbike: Motorbike,
  octagon: Octagon,
  train: Train,
  truck: Truck,
  walk: Walk,
  DEFAULT: CubeOutline,
};
