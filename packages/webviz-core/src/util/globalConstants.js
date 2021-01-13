// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.
import { colors } from "webviz-core/src/util/sharedStyleConstants";

// URL params
// DANGER: if you change this you break existing urls
export const REMOTE_BAG_URL_QUERY_KEY = "remote-bag-url";
export const REMOTE_BAG_URL_2_QUERY_KEY = "remote-bag-url-2";
export const ROSBRIDGE_WEBSOCKET_URL_QUERY_KEY = "rosbridge-websocket-url";
export const MEASURE_DATA_PROVIDERS_QUERY_KEY = "_measureDataProviders";
export const DEMO_QUERY_KEY = "demo";
export const DISABLE_WORKERS_QUERY_KEY = "no-workers";
export const SEEK_TO_UNIX_MS_QUERY_KEY = "seek-to"; // Used on load and set when paused
export const SEEK_TO_RELATIVE_MS_QUERY_KEY = "seek-by"; // Only used on load. Can be negative.
export const SEEK_TO_FRACTION_QUERY_KEY = "seek-fraction"; // Only used on load
export const LAYOUT_QUERY_KEY = "layout";
export const LAYOUT_URL_QUERY_KEY = "layout-url";
export const PATCH_QUERY_KEY = "patch";
export const OLD_GLOBAL_VARIABLES_QUERY_KEY = "global-data";
export const GLOBAL_VARIABLES_QUERY_KEY = "global-variables";
export const TITLE_QUERY_KEY = "title";
export const TEST_EVERYTHING_LAYOUT_QUERY_VAL = "_integration-test-everything-layout";
export const FRAMELESS = "frameless";

export const DEFAULT_WEBVIZ_NODE_PREFIX = "/webviz_node/";

export const TRANSFORM_TOPIC = "/tf";
export const TRANSFORM_STATIC_TOPIC = "/tf_static";
export const DIAGNOSTIC_TOPIC = "/diagnostics";
export const ROSOUT_TOPIC = "/rosout";
export const SOCKET_KEY = "dataSource.websocket";
export const SECOND_SOURCE_PREFIX = "/webviz_source_2";

export const GEOMETRY_MSGS_POLYGON_STAMPED_DATATYPE = "geometry_msgs/PolygonStamped";
export const NAV_MSGS_OCCUPANCY_GRID_DATATYPE = "nav_msgs/OccupancyGrid";
export const POINT_CLOUD_DATATYPE = "sensor_msgs/PointCloud2";
export const POSE_STAMPED_DATATYPE = "geometry_msgs/PoseStamped";
export const SENSOR_MSGS_LASER_SCAN_DATATYPE = "sensor_msgs/LaserScan";
export const WEBVIZ_MARKER_DATATYPE = "visualization_msgs/WebvizMarker";
export const WEBVIZ_MARKER_ARRAY_DATATYPE = "visualization_msgs/WebvizMarkerArray";
export const FUTURE_VIZ_MSGS_DATATYPE = "future_visualization_msgs/WebvizMarkerArray";
export const TF_DATATYPE = "tf2_msgs/TFMessage";
export const VISUALIZATION_MSGS_MARKER_DATATYPE = "visualization_msgs/Marker";
export const VISUALIZATION_MSGS_MARKER_ARRAY_DATATYPE = "visualization_msgs/MarkerArray";

export const MARKER_ARRAY_DATATYPES = [
  "visualization_msgs/MarkerArray",
  FUTURE_VIZ_MSGS_DATATYPE,
  WEBVIZ_MARKER_ARRAY_DATATYPE,
];

export const USER_ERROR_PREFIX = "[WEBVIZ USER ERROR]";

// In testing there seems to be a small (~4%) performance penalty to freezing messages, so for now
// we only do it in development/testing. StackOverflow says that there should be no difference
// though: https://stackoverflow.com/questions/8435080/any-performance-benefit-to-locking-down-javascript-objects
// So maybe we want to always do the freezing at some point? Probably requires some more testing to
// be sure.
export const FREEZE_MESSAGES = process.env.NODE_ENV !== "production";

export const COLORS = {
  RED: { r: 1.0, g: 0.2, b: 0.2, a: 1.0 },
  BLUE: { r: 0.4, g: 0.4, b: 1.0, a: 1.0 },
  YELLOW: { r: 0.9, g: 1.0, b: 0.1, a: 1.0 },
  ORANGE: { r: 1.0, g: 0.6, b: 0.2, a: 1.0 },
  GREEN: { r: 0.1, g: 0.9, b: 0.3, a: 1.0 },
  GRAY: { r: 0.4, g: 0.4, b: 0.4, a: 1.0 },
  PURPLE: { r: 1.0, g: 0.2, b: 1.0, a: 1.0 },
  WHITE: { r: 1.0, g: 1.0, b: 1.0, a: 1.0 },
  PINK: { r: 1.0, g: 0.4, b: 0.6, a: 1.0 },
  LIGHT_RED: { r: 0.9, g: 0.1, b: 0.1, a: 1.0 },
  LIGHT_GREEN: { r: 0.4, g: 0.9, b: 0.4, a: 1.0 },
  LIGHT_BLUE: { r: 0.4, g: 0.4, b: 1, a: 1.0 },
  CLEAR: { r: 0, g: 0, b: 0, a: 0 },
};

// http://docs.ros.org/melodic/api/visualization_msgs/html/msg/Marker.html
export const MARKER_MSG_TYPES = {
  ARROW: 0,
  CUBE: 1,
  SPHERE: 2,
  CYLINDER: 3,
  LINE_STRIP: 4,
  LINE_LIST: 5,
  CUBE_LIST: 6,
  SPHERE_LIST: 7,
  POINTS: 8,
  TEXT_VIEW_FACING: 9,
  MESH_RESOURCE: 10,
  TRIANGLE_LIST: 11,
  FILLED_POLYGON: 107,
  INSTANCED_LINE_LIST: 108,
  OVERLAY_ICON: 109,
};

export const POSE_MARKER_SCALE = { x: 2, y: 2, z: 0.1 };

// Planning
export const MILES_PER_HOUR_TO_METERS_PER_SECOND = 0.44703;
export const METERS_PER_SECOND_TO_MILES_PER_HOUR = 2.23694;

export const jsonTreeTheme = {
  base00: "transparent", // bg
  base07: colors.BLUEL1, // text
  base0B: colors.YELLOW1, // string & date, item string
  base09: colors.REDL1, // # & boolean
  base08: colors.RED, // null, undefined, function, & symbol
  base0D: colors.BLUEL1, // label & arrow
  base03: colors.DARK9, // item string expanded
};

export const TAB_PANEL_TYPE = "Tab";

export const LINED_CONVEX_HULL_RENDERING_SETTING = "LinedConvexHull";
