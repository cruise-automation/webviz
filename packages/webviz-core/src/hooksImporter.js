/* eslint-disable header/header */

//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import memoize from "lodash/memoize";

import { getGlobalHooks } from "./loadWebviz";
import { DIAGNOSTIC_TOPIC } from "./util/globalConstants";

/*
We've split this code out seperately from the rest of the hooks so that we can lazy load these components by
lazily importing this file at runtime. 
*/

export function panelsByCategory() {
  const GlobalVariables = require("webviz-core/src/panels/GlobalVariables").default;
  const DiagnosticStatusPanel = require("webviz-core/src/panels/diagnostics/DiagnosticStatusPanel").default;
  const DiagnosticSummary = require("webviz-core/src/panels/diagnostics/DiagnosticSummary").default;
  const ImageViewPanel = require("webviz-core/src/panels/ImageView").default;
  const Internals = require("webviz-core/src/panels/Internals").default;
  const NodePlayground = require("webviz-core/src/panels/NodePlayground").default;
  const Note = require("webviz-core/src/panels/Note").default;
  const NumberOfRenders = require("webviz-core/src/panels/NumberOfRenders").default;
  const PlaybackPerformance = require("webviz-core/src/panels/PlaybackPerformance").default;
  const Plot = require("webviz-core/src/panels/Plot").default;
  const RawMessages = require("webviz-core/src/panels/RawMessages").default;
  const Rosout = require("webviz-core/src/panels/Rosout").default;
  const StateTransitions = require("webviz-core/src/panels/StateTransitions").default;
  const SubscribeToList = require("webviz-core/src/panels/SubscribeToList").default;
  const TwoDimensionalPlot = require("webviz-core/src/panels/TwoDimensionalPlot").default;
  const ThreeDimensionalViz = require("webviz-core/src/panels/ThreeDimensionalViz").default;
  const { ndash } = require("webviz-core/src/util/entities");

  const ros = [
    { title: "2D Plot", component: TwoDimensionalPlot },
    { title: "3D", component: ThreeDimensionalViz },
    { title: `Diagnostics ${ndash} Summary`, component: DiagnosticSummary },
    { title: `Diagnostics ${ndash} Detail`, component: DiagnosticStatusPanel },
    { title: "Image", component: ImageViewPanel },
    { title: "Plot", component: Plot },
    { title: "Raw Messages", component: RawMessages },
    { title: "rosout", component: Rosout },
    { title: "State Transitions", component: StateTransitions },
  ];

  const utilities = [
    { title: "Global Variables", component: GlobalVariables },
    { title: "Node Playground", component: NodePlayground },
    { title: "Notes", component: Note },
    { title: "Webviz Internals", component: Internals },
  ];

  const debugging = [
    { title: "Number of Renders", component: NumberOfRenders },
    { title: "Playback Performance", component: PlaybackPerformance },
    { title: "Subscribe to List", component: SubscribeToList },
  ];

  return { ros, utilities, debugging };
}

export function perPanelHooks() {
  const BlurIcon = require("@mdi/svg/svg/blur.svg").default;
  const GridIcon = require("@mdi/svg/svg/grid.svg").default;
  const HexagonIcon = require("@mdi/svg/svg/hexagon.svg").default;
  const HexagonMultipleIcon = require("@mdi/svg/svg/hexagon-multiple.svg").default;
  const PentagonOutlineIcon = require("@mdi/svg/svg/pentagon-outline.svg").default;
  const RadarIcon = require("@mdi/svg/svg/radar.svg").default;
  const RobotIcon = require("@mdi/svg/svg/robot.svg").default;
  const LaserScanVert = require("webviz-core/src/panels/ThreeDimensionalViz/LaserScanVert").default;
  const { defaultMapPalette } = require("webviz-core/src/panels/ThreeDimensionalViz/commands/utils");
  const { POINT_CLOUD_DATATYPE, POSE_STAMPED_DATATYPE } = require("webviz-core/src/util/globalConstants");

  const SUPPORTED_MARKER_DATATYPES = {
    // generally supported datatypes
    VISUALIZATION_MSGS_MARKER_DATATYPE: "visualization_msgs/Marker",
    VISUALIZATION_MSGS_MARKER_ARRAY_DATATYPE: "visualization_msgs/MarkerArray",
    POSE_STAMPED_DATATYPE,
    POINT_CLOUD_DATATYPE,
    SENSOR_MSGS_LASER_SCAN_DATATYPE: "sensor_msgs/LaserScan",
    NAV_MSGS_OCCUPANCY_GRID_DATATYPE: "nav_msgs/OccupancyGrid",
    GEOMETRY_MSGS_POLYGON_STAMPED_DATATYPE: "geometry_msgs/PolygonStamped",
  };

  return {
    DiagnosticSummary: {
      defaultConfig: {
        pinnedIds: [],
        hardwareIdFilter: "",
        topicToRender: DIAGNOSTIC_TOPIC,
      },
    },
    ImageView: {
      defaultConfig: {
        cameraTopic: "",
        enabledMarkerTopics: [],
        scale: 0.2,
        transformMarkers: false,
        synchronize: false,
        mode: "fit",
        zoomPercentage: 100,
        offset: [0, 0],
      },
      imageMarkerDatatypes: ["visualization_msgs/ImageMarker"],
      imageMarkerArrayDatatypes: [],
      canTransformMarkersByTopic: (topic) => !topic.includes("rect"),
    },
    StateTransitions: { defaultConfig: { paths: [] }, customStateTransitionColors: {} },
    ThreeDimensionalViz: {
      defaultConfig: {
        checkedNodes: ["name:Topics"],
        expandedNodes: ["name:Topics"],
        followTf: null,
        cameraState: {},
        modifiedNamespaceTopics: [],
        pinTopics: false,
        topicSettings: {},
        autoSyncCameraState: false,
      },
      SUPPORTED_MARKER_DATATYPES,
      allSupportedMarkers: [
        "arrow",
        "cube",
        "cubeList",
        "cylinder",
        "filledPolygon",
        "grid",
        "instancedLineList",
        "laserScan",
        "linedConvexHull",
        "lineList",
        "lineStrip",
        "pointcloud",
        "points",
        "poseMarker",
        "sphere",
        "sphereList",
        "text",
        "triangleList",
      ],
      renderAdditionalMarkers: () => {},
      topics: [],
      iconsByDatatype: {
        "visualization_msgs/Marker": HexagonIcon,
        "visualization_msgs/MarkerArray": HexagonMultipleIcon,
        "nav_msgs/OccupancyGrid": GridIcon,
        "sensor_msgs/LaserScan": RadarIcon,
        "geometry_msgs/PolygonStamped": PentagonOutlineIcon,
        [POINT_CLOUD_DATATYPE]: BlurIcon,
        [POSE_STAMPED_DATATYPE]: RobotIcon,
      },
      // TODO(Audrey): remove icons config after topic group release
      icons: {},
      AdditionalToolbarItems: () => null,
      LaserScanVert,
      setGlobalVariablesInSceneBuilder: (globalVariables, selectionState, topicsToRender) => ({
        selectionState,
        topicsToRender,
      }),
      consumeMessage: (topic, msg, consumeMethods, { errors }) => {
        errors.topicsWithError.set(topic, `Unrecognized topic datatype for scene: ${msg.datatype}`);
      },
      getMessagePose: (msg) => msg.message.pose,
      addMarkerToCollector: () => {},
      getSyntheticArrowMarkerColor: () => ({ r: 0, g: 0, b: 1, a: 0.5 }),
      getFlattenedPose: () => undefined,
      getOccupancyGridValues: (topic) => [0.5, "map"],
      getMapPalette() {
        return defaultMapPalette;
      },
      consumePose: () => {},
      getMarkerColor: (topic, markerColor) => markerColor,
      hasBlacklistTopics: () => false,
      ungroupedNodesCategory: "Topics",
      rootTransformFrame: "map",
      defaultFollowTransformFrame: null,
      skipTransformFrame: null,
    },
    RawMessages: { docLinkFunction: () => undefined },
    installChartJs: () => {
      require("webviz-core/src/util/installChartjs").default();
    },
  };
}

// Helper function to bypass lazy fetch when running tests
export function testSetup() {
  const hooks = getGlobalHooks();
  hooks.panelsByCategory = memoize(() => {
    return panelsByCategory();
  });
  hooks.perPanelHooks = memoize(() => {
    return perPanelHooks();
  });
  hooks.areHooksImported = () => true;
}
