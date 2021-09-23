/* eslint-disable header/header */

//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import memoize from "lodash/memoize";

import { getGlobalHooks } from "./loadWebviz";

/*
We've split this code out seperately from the rest of the hooks so that we can lazy load these components by
lazily importing this file at runtime.
*/

export function panelsByCategory() {
  const Audio = require("webviz-core/src/panels/Audio").default;
  const DiagnosticStatusPanel = require("webviz-core/src/panels/diagnostics/DiagnosticStatusPanel").default;
  const DiagnosticSummary = require("webviz-core/src/panels/diagnostics/DiagnosticSummary").default;
  const GlobalVariables = require("webviz-core/src/panels/GlobalVariables").default;
  const GlobalVariableSlider = require("webviz-core/src/panels/GlobalVariableSlider").default;
  const GlobalVariableDropdown = require("webviz-core/src/panels/GlobalVariableDropdown").default;
  const ImageViewPanel = require("webviz-core/src/panels/ImageView").default;
  const Internals = require("webviz-core/src/panels/Internals").default;
  const NodePlayground = require("webviz-core/src/panels/NodePlayground").default;
  const Note = require("webviz-core/src/panels/Note").default;
  const NumberOfRenders = require("webviz-core/src/panels/NumberOfRenders").default;
  const PlaybackPerformance = require("webviz-core/src/panels/PlaybackPerformance").default;
  const Plot = require("webviz-core/src/panels/Plot").default;
  const Publish = require("webviz-core/src/panels/Publish").default;
  const RawMessages = require("webviz-core/src/panels/RawMessages").default;
  const Rosout = require("webviz-core/src/panels/Rosout").default;
  const SourceInfo = require("webviz-core/src/panels/SourceInfo").default;
  const StateTransitions = require("webviz-core/src/panels/StateTransitions").default;
  const SubscribeToList = require("webviz-core/src/panels/SubscribeToList").default;
  const Tab = require("webviz-core/src/panels/Tab").default;
  const TwoDimensionalPlot = require("webviz-core/src/panels/TwoDimensionalPlot").default;
  const ThreeDimensionalViz = require("webviz-core/src/panels/ThreeDimensionalViz").default;
  const { ndash } = require("webviz-core/src/util/entities");
  const Table = require("webviz-core/src/panels/Table").default;

  const ros = [
    { title: "2D Plot", component: TwoDimensionalPlot },
    { title: "3D", component: ThreeDimensionalViz },
    { title: "Audio", component: Audio },
    { title: `Diagnostics ${ndash} Summary`, component: DiagnosticSummary },
    { title: `Diagnostics ${ndash} Detail`, component: DiagnosticStatusPanel },
    { title: "Image", component: ImageViewPanel },
    { title: "Plot", component: Plot },
    { title: "Publish", component: Publish },
    { title: "Raw Messages", component: RawMessages },
    { title: "rosout", component: Rosout },
    { title: "State Transitions", component: StateTransitions },
    { title: "Table", component: Table },
  ];

  const utilities = [
    { title: "Global Variables", component: GlobalVariables },
    { title: "Global Variable Slider", component: GlobalVariableSlider },
    { title: "Global Variable Dropdown", component: GlobalVariableDropdown },
    { title: "Node Playground", component: NodePlayground },
    { title: "Notes", component: Note },
    { title: "Tab", component: Tab },
    { title: "Webviz Internals", component: Internals },
    { title: "Data Source Info", component: SourceInfo },
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
  const ChartIcon = require("@mdi/svg/svg/chart-line-variant.svg").default;
  const HexagonIcon = require("@mdi/svg/svg/hexagon.svg").default;
  const HexagonMultipleIcon = require("@mdi/svg/svg/hexagon-multiple.svg").default;
  const PentagonOutlineIcon = require("@mdi/svg/svg/pentagon-outline.svg").default;
  const RadarIcon = require("@mdi/svg/svg/radar.svg").default;
  const RobotIcon = require("@mdi/svg/svg/robot.svg").default;
  const {
    GEOMETRY_MSGS$POLYGON_STAMPED,
    NAV_MSGS$OCCUPANCY_GRID,
    NAV_MSGS$PATH,
    SENSOR_MSGS$POINT_CLOUD_2,
    GEOMETRY_MSGS$POSE_STAMPED,
    SENSOR_MSGS$LASER_SCAN,
    TF2_MSGS$TF_MESSAGE,
    VISUALIZATION_MSGS$MARKER,
    VISUALIZATION_MSGS$MARKER_ARRAY,
    VISUALIZATION_MSGS$WEBVIZ_MARKER,
    VISUALIZATION_MSGS$WEBVIZ_MARKER_ARRAY,
    WEBVIZ_ICON_MSGS$WEBVIZ_3D_ICON_ARRAY,
    $DIAGNOSTICS,
    RADAR_POINT_CLOUD,
    WRAPPED_POINT_CLOUD,
  } = require("webviz-core/src/util/globalConstants");

  const sceneBuilderHooks = require("webviz-core/src/panels/ThreeDimensionalViz/SceneBuilder/defaultHooks").default;
  const supportsOffscreenCanvas = require("webviz-core/src/util/supportsOffscreenCanvas").default;
  const initLayoutNonWorker = require("webviz-core/src/panels/ThreeDimensionalViz/Layout/LayoutWorker").default;
  const useStaticTransformsData = require("webviz-core/src/panels/ThreeDimensionalViz/Transforms/useStaticTransformsData")
    .default;

  const SUPPORTED_MARKER_DATATYPES = {
    // generally supported datatypes
    VISUALIZATION_MSGS$MARKER,
    VISUALIZATION_MSGS$MARKER_ARRAY,
    VISUALIZATION_MSGS$WEBVIZ_MARKER,
    VISUALIZATION_MSGS$WEBVIZ_MARKER_ARRAY,
    WEBVIZ_ICON_MSGS$WEBVIZ_3D_ICON_ARRAY,
    GEOMETRY_MSGS$POSE_STAMPED,
    SENSOR_MSGS$POINT_CLOUD_2,
    SENSOR_MSGS$LASER_SCAN,
    NAV_MSGS$PATH,
    NAV_MSGS$OCCUPANCY_GRID,
    GEOMETRY_MSGS$POLYGON_STAMPED,
    TF2_MSGS$TF_MESSAGE,
  };

  return {
    Audio: { defaultTopic: null },
    DiagnosticSummary: {
      defaultConfig: {
        pinnedIds: [],
        hardwareIdFilter: "",
        topicToRender: $DIAGNOSTICS,
      },
    },
    ImageView: {
      defaultConfig: {
        cameraTopic: "",
        enabledMarkerTopics: [],
        customMarkerTopicOptions: [],
        scale: 0.2,
        transformMarkers: false,
        synchronize: false,
        mode: "fit",
        zoomPercentage: 100,
        offset: [0, 0],
      },
      imageMarkerDatatypes: ["visualization_msgs/ImageMarker", "webviz_msgs/ImageMarkerArray"],
      canTransformMarkersByTopic: (topic) => !topic.includes("rect"),
    },
    GlobalVariableSlider: {
      getVariableSpecificOutput: () => null,
    },
    StateTransitions: { defaultConfig: { paths: [] }, customStateTransitionColors: {} },
    ThreeDimensionalViz: {
      defaultConfig: {
        checkedKeys: ["name:Topics"],
        expandedKeys: ["name:Topics"],
        followTf: null,
        cameraState: {},
        modifiedNamespaceTopics: [],
        pinTopics: false,
        settingsByKey: {},
        autoSyncCameraState: false,
        autoTextBackgroundColor: true,
      },
      topicSettingsEditors: {},
      SUPPORTED_MARKER_DATATYPES,
      BLACKLIST_TOPICS: [],
      additionalSubscriptions: [],
      iconsByDatatype: {
        // Named datatypes
        [VISUALIZATION_MSGS$MARKER]: HexagonIcon,
        [VISUALIZATION_MSGS$MARKER_ARRAY]: HexagonMultipleIcon,
        [NAV_MSGS$OCCUPANCY_GRID]: GridIcon,
        [NAV_MSGS$PATH]: ChartIcon,
        [SENSOR_MSGS$LASER_SCAN]: RadarIcon,
        [GEOMETRY_MSGS$POLYGON_STAMPED]: PentagonOutlineIcon,
        [SENSOR_MSGS$POINT_CLOUD_2]: BlurIcon,
        [GEOMETRY_MSGS$POSE_STAMPED]: RobotIcon,
        [VISUALIZATION_MSGS$WEBVIZ_MARKER]: HexagonIcon,
        [VISUALIZATION_MSGS$WEBVIZ_MARKER_ARRAY]: HexagonMultipleIcon,
        // Structural datatypes
        [RADAR_POINT_CLOUD]: BlurIcon,
        [WRAPPED_POINT_CLOUD]: BlurIcon,
      },
      // TODO(Audrey): remove icons config after topic group release
      icons: {},
      AdditionalToolbarItems: () => null,
      // TODO(useWorkerIn3DPanel): Remove sceneBuilderHooks when flag is deleted.
      sceneBuilderHooks,
      useWorldContextValue: require("webviz-core/src/panels/ThreeDimensionalViz/SceneBuilder/useWorldContextValue")
        .default,
      getLayoutWorker: () => {
        if (supportsOffscreenCanvas()) {
          const WorkerType = require("webviz-core/src/panels/ThreeDimensionalViz/Layout/Layout.worker");
          return new WorkerType();
        }
        return initLayoutNonWorker(sceneBuilderHooks);
      },
      // Duplicated in sceneBuilderHooks
      skipTransformFrame: null,
      useDynamicTransformsData: () => null,
      useStaticTransformsData,

      ungroupedNodesCategory: "Topics",
      rootTransformFrame: "map",
      defaultFollowTransformFrame: null,
    },
    RawMessages: { docLinkFunction: (filename) => `https://www.google.com/search?q=${filename}` },
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
