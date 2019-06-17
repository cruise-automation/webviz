// @flow
//
//  Copyright (c) 2018-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

// URL params
export const REMOTE_BAG_URL_QUERY_KEY = "remote-bag-url";
export const LOAD_ENTIRE_BAG_QUERY_KEY = "load-entire-bag";
export const MEASURE_DATA_PROVIDERS_QUERY_KEY = "_measureDataProviders";
export const PANEL_PERF_QUERY_KEY = "_panelperf";
export const DEMO_QUERY_KEY = "demo";

export const TRANSFORM_TOPIC = "/tf";
export const DIAGNOSTIC_TOPIC = "/diagnostics";
export const SOCKET_KEY = "dataSource.websocket";
export const SECOND_BAG_PREFIX = "/webviz_bag_2";

export const POINT_CLOUD_DATATYPE = "sensor_msgs/PointCloud2";
export const POSE_STAMPED_DATATYPE = "geometry_msgs/PoseStamped";
export const LASER_SCAN_DATATYPE = "sensor_msgs/LaserScan";

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
};

export const POSE_MARKER_SCALE = { x: 2, y: 2, z: 0.1 };

// Planning
export const MILES_PER_HOUR_TO_METERS_PER_SECOND = 0.44703;
export const METERS_PER_SECOND_TO_MILES_PER_HOUR = 2.23694;
