/* eslint-disable header/header */

//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import memoize from "lodash/memoize";
import React from "react";
import ReactDOM from "react-dom";

import { DIAGNOSTIC_TOPIC } from "./util/globalConstants";

// We put all the internal requires inside functions, so that when they load the hooks have been properly set.

const defaultHooks = {
  nodes: () => [],
  getDefaultGlobalStates() {
    const { defaultPlaybackConfig } = require("webviz-core/src/reducers/panels");
    return {
      layout: {
        direction: "row",
        first: "DiagnosticSummary!3edblo1",
        second: {
          direction: "row",
          first: "RosOut!1f38b3d",
          second: "3D Panel!1my2ydk",
          splitPercentage: 50,
        },
        splitPercentage: 33.3333333333,
      },
      savedProps: {},
      globalVariables: {},
      userNodes: {},
      linkedGlobalVariables: [],
      playbackConfig: defaultPlaybackConfig,
    };
  },
  migratePanels(panels) {
    const migratePanels = require("webviz-core/src/util/migratePanels").default;
    return migratePanels(panels);
  },
  panelCategories() {
    return [
      { label: "ROS", key: "ros" },
      { label: "Utilities", key: "utilities" },
      { label: "Debugging", key: "debugging" },
    ];
  },
  panelsByCategory() {
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
  },
  helpPageFootnote: () => null,
  perPanelHooks: memoize(() => {
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
          enabledMarkerNames: [],
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
        getDefaultTopicTree: () => ({
          name: "root",
          children: [{ name: "TF", children: [], description: "Visualize relationships between /tf frames." }],
        }),
        hasBlacklistTopics: () => false,
        ungroupedNodesCategory: "Topics",
        rootTransformFrame: "map",
        defaultFollowTransformFrame: null,
        skipTransformFrame: null,
      },
      RawMessages: { docLinkFunction: () => undefined },
    };
  }),
  Root({ store }) {
    const Root = require("webviz-core/src/components/Root").default;
    return <Root store={store} />;
  },
  topicsWithIncorrectHeaders: () => [],
  load: () => {
    if (process.env.NODE_ENV === "production" && window.ga) {
      window.ga("create", "UA-82819136-10", "auto");
    } else {
      window.ga = function(...args) {
        console.log("[debug] ga:", ...args);
      };
    }
    window.ga("send", "pageview");
  },
  getWorkerDataProviderWorker: () => {
    return require("webviz-core/src/dataProviders/WorkerDataProvider.worker");
  },
  getAdditionalDataProviders: () => {},
  experimentalFeaturesList() {
    return {
      topicGrouping: {
        name: "Topic Group Management",
        description:
          "We're revamping the topic tree to be customizable directly from Webviz. You'll be able to create your own groups and toggle them easily.",
        developmentDefault: false,
        productionDefault: false,
      },
    };
  },
  linkTopicPathSyntaxToHelpPage: () => true,
};

let hooks = defaultHooks;

export function getGlobalHooks() {
  return hooks;
}

export function setHooks(hooksToSet) {
  hooks = { ...hooks, ...hooksToSet };
}

export function resetHooksToDefault() {
  hooks = defaultHooks;
}

export function loadWebviz(hooksToSet) {
  if (hooksToSet) {
    setHooks(hooksToSet);
  }

  require("webviz-core/src/styles/global.scss");
  const prepareForScreenshots = require("webviz-core/src/stories/prepareForScreenshots").default;
  const installChartjs = require("webviz-core/src/util/installChartjs").default;
  const installDevtoolsFormatters = require("webviz-core/src/util/installDevtoolsFormatters").default;

  installChartjs();
  prepareForScreenshots(); // For integration screenshot tests.
  installDevtoolsFormatters();

  hooks.load();

  const waitForFonts = require("webviz-core/src/styles/waitForFonts").default;
  const Confirm = require("webviz-core/src/components/Confirm").default;

  function render() {
    const rootEl = document.getElementById("root");
    if (!rootEl) {
      // appease flow
      throw new Error("missing #root element");
    }

    waitForFonts(() => {
      ReactDOM.render(<hooks.Root history={history} />, rootEl);
    });
  }

  // Render a warning message if the user has an old browser.
  // From https://stackoverflow.com/a/4900484
  const chromeMatch = navigator.userAgent.match(/Chrom(e|ium)\/([0-9]+)\./);
  const chromeVersion = chromeMatch ? parseInt(chromeMatch[2], 10) : 0;
  if (chromeVersion < MINIMUM_CHROME_VERSION) {
    Confirm({
      title: "Update your browser",
      prompt:
        chromeVersion === 0
          ? `You are not using Google Chrome. Please use Chrome ${MINIMUM_CHROME_VERSION} or later to continue.`
          : `Chrome ${chromeVersion} is not supported. Please use Chrome ${MINIMUM_CHROME_VERSION} or later to continue.`,
      confirmStyle: "primary",
      ok: chromeVersion === 0 ? "Download Chrome" : "Update Chrome",
      cancel: "Continue anyway",
    }).then((ok) => {
      if (ok) {
        window.location = "https://www.google.com/chrome/";
      } else {
        render();
      }
    });
  } else {
    render();
  }
}
