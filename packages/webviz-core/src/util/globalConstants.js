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
export const SEEK_TO_QUERY_KEY = "seek-to"; // Used on load and set when paused
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

export const RADAR_POINT_CLOUD = "radarPointCloud";
export const WRAPPED_POINT_CLOUD = "wrappedPointCloud";
export const DEFAULT_WEBVIZ_NODE_PREFIX = "/webviz_node/";

export const $METADATA = "/metadata";
export const $TF = "/tf";
export const $TF_STATIC = "/tf_static";
export const $DIAGNOSTICS = "/diagnostics";
export const $ROSOUT = "/rosout";
export const SOCKET_KEY = "dataSource.websocket";
export const $WEBVIZ_SOURCE_2 = "/webviz_source_2";

export const GEOMETRY_MSGS$POLYGON_STAMPED = "geometry_msgs/PolygonStamped";
export const NAV_MSGS$OCCUPANCY_GRID = "nav_msgs/OccupancyGrid";
export const NAV_MSGS$PATH = "nav_msgs/Path";
export const SENSOR_MSGS$POINT_CLOUD_2 = "sensor_msgs/PointCloud2";
export const GEOMETRY_MSGS$POSE_STAMPED = "geometry_msgs/PoseStamped";
export const SENSOR_MSGS$LASER_SCAN = "sensor_msgs/LaserScan";
export const VISUALIZATION_MSGS$WEBVIZ_MARKER = "visualization_msgs/WebvizMarker";
export const VISUALIZATION_MSGS$WEBVIZ_MARKER_ARRAY = "visualization_msgs/WebvizMarkerArray";
export const FUTURE_VISUALIZATION_MSGS$WEBVIZ_MARKER_ARRAY = "future_visualization_msgs/WebvizMarkerArray";
export const TF2_MSGS$TF_MESSAGE = "tf2_msgs/TFMessage";
export const VISUALIZATION_MSGS$MARKER = "visualization_msgs/Marker";
export const VISUALIZATION_MSGS$MARKER_ARRAY = "visualization_msgs/MarkerArray";

export const WEBVIZ_ICON_MSGS$WEBVIZ_2D_ICON_ARRAY = "webviz_icon_msgs/WebViz2dIconArray";
export const WEBVIZ_ICON_MSGS$WEBVIZ_3D_ICON_ARRAY = "webviz_icon_msgs/WebViz3dIconArray";

export const MARKER_ARRAY_DATATYPES = [
  VISUALIZATION_MSGS$MARKER_ARRAY,
  FUTURE_VISUALIZATION_MSGS$WEBVIZ_MARKER_ARRAY,
  VISUALIZATION_MSGS$WEBVIZ_MARKER_ARRAY,
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

// Unit conversions
export const METERS_PER_SECOND_TO_MILES_PER_HOUR = 2.23694;
export const METERS_PER_SECOND_TO_KILOMETERS_PER_HOUR = 3.6;
export const MILES_PER_HOUR_TO_METERS_PER_SECOND = 1 / METERS_PER_SECOND_TO_MILES_PER_HOUR;
export const MILES_PER_HOUR_TO_KILOMETERS_PER_HOUR =
  MILES_PER_HOUR_TO_METERS_PER_SECOND * METERS_PER_SECOND_TO_KILOMETERS_PER_HOUR;

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

export const PANEL_LAYOUT_ROOT_ID = "PanelLayout-root";

// Feature announcements
export const FEATURE_ANNOUNCEMENTS_LOCAL_STORAGE_KEY = "webvizFeatureAnnouncements";

export const MIN_MEM_CACHE_BLOCK_SIZE_NS = 0.1e9; // Messages are laid out in blocks with a fixed number of milliseconds.

// Amount to seek into the bag from the start when loading the player, to show
// something useful on the screen. Ideally this is less than BLOCK_SIZE_NS from
// MemoryCacheDataProvider so we still stay within the first block when fetching
// initial data.
export const SEEK_ON_START_NS = 99 /* ms */ * 1e6;
if (SEEK_ON_START_NS >= MIN_MEM_CACHE_BLOCK_SIZE_NS) {
  throw new Error(
    "SEEK_ON_START_NS should be less than MIN_MEM_CACHE_BLOCK_SIZE_NS (to keep initial backfill within one block)"
  );
}
