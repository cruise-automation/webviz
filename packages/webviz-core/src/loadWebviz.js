/* eslint-disable header/header */

//  Copyright (c) 2018-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import React from "react";
import ReactDOM from "react-dom";
import { routerMiddleware } from "react-router-redux";

// We put all the internal requires inside functions, so that when they load the hooks have been properly set.

const defaultHooks = {
  nodes: () => [],
  migratePanels: (panels) => panels,
  panelList() {
    const DiagnosticStatusPanel = require("webviz-core/src/panels/diagnostics/DiagnosticStatusPanel").default;
    const DiagnosticSummary = require("webviz-core/src/panels/diagnostics/DiagnosticSummary").default;
    const ImageViewPanel = require("webviz-core/src/panels/ImageView").default;
    const Internals = require("webviz-core/src/panels/Internals").default;
    const NumberOfRenders = require("webviz-core/src/panels/NumberOfRenders").default;
    const Plot = require("webviz-core/src/panels/Plot").default;
    const Rosout = require("webviz-core/src/panels/Rosout").default;
    const StateTransitions = require("webviz-core/src/panels/StateTransitions").default;
    const ThreeDimensionalViz = require("webviz-core/src/panels/ThreeDimensionalViz").default;
    const RawMessages = require("webviz-core/src/panels/RawMessages").default;
    const { ndash } = require("webviz-core/src/util/entities");

    return [
      { title: "rosout", component: Rosout },
      { title: "Image", component: ImageViewPanel },
      { title: "Raw Messages", component: RawMessages },
      { title: "Plot", component: Plot },
      { title: "State Transitions", component: StateTransitions },
      { title: "3D", component: ThreeDimensionalViz },
      { title: `Diagnostics ${ndash} Summary`, component: DiagnosticSummary },
      { title: `Diagnostics ${ndash} Detail`, component: DiagnosticStatusPanel },
      { title: "Webviz Internals", component: Internals },
      { title: "Number of Renders", component: NumberOfRenders, hideFromList: true },
    ];
  },
  helpPageFootnote: () => null,
  perPanelHooks: () => {
    const World = require("webviz-core/src/panels/ThreeDimensionalViz/World").default;
    const LaserScanVert = require("webviz-core/src/panels/ThreeDimensionalViz/LaserScanVert").default;
    const FileMultipleIcon = require("@mdi/svg/svg/file-multiple.svg").default;
    const CheckboxBlankCircleOutline = require("@mdi/svg/svg/checkbox-blank-circle-outline.svg").default;
    const { defaultMapPalette } = require("webviz-core/src/panels/ThreeDimensionalViz/commands/utils");

    const { SECOND_BAG_PREFIX } = require("webviz-core/src/util/globalConstants");

    const getMetadata = () => {};
    getMetadata.topics = [];
    return {
      Panel: {
        topicPrefixes: {
          "": {
            labelText: "Default",
            icon: CheckboxBlankCircleOutline,
            iconPrefix: "",
          },
          [SECOND_BAG_PREFIX]: {
            labelText: "Input 2",
            icon: FileMultipleIcon,
            iconPrefix: "2",
            tooltipText: "topics prefixed with '/webviz_bag_2'",
          },
        },
      },
      DiagnosticSummary: { defaultConfig: { pinnedIds: [] } },
      ImageView: {
        defaultConfig: {
          cameraTopic: "",
          enabledMarkerNames: [],
          scale: 0.2,
          transformMarkers: false,
          synchronize: false,
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
        topics: [],
        editableTopics: [],
        icons: {},
        WorldComponent: World,
        LaserScanVert,
        getMetadata,
        migrateConfig: () => false,
        setGlobalDataInSceneBuilder: (globalData, selectionState, topicsToRender) => ({
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
        getDefaultTopicTree: () => ({ name: "root" }),
        hasBlacklistTopics: () => false,
        renderTopicSettings: () => {},
        ungroupedNodesCategory: "Topics",
        rootTransformFrame: "map",
        defaultFollowTransformFrame: null,
        skipTransformFrame: null,
      },
      RawMessages: { docLinkFunction: () => undefined },
    };
  },
  Root({ store }) {
    const Root = require("webviz-core/src/components/Root").default;
    return <Root store={store} />;
  },
  skipBrowserConfirmation: () => false,
  topicsWithIncorrectHeaders: () => [],
  heavyDatatypesWithNoTimeDependency: () => [
    "sensor_msgs/PointCloud2",
    "sensor_msgs/LaserScan",
    "nav_msgs/OccupancyGrid",
  ],
  useRaven: () => true,
  load: () => {},
  onPanelClose: () => {},
  onPanelSwap: () => {},
  onPanelSplit: () => {},
  onPanelDrag: () => {},
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

  installChartjs();
  prepareForScreenshots(); // For integration screenshot tests.

  hooks.load();

  const waitForFonts = require("webviz-core/src/styles/waitForFonts").default;
  const Confirm = require("webviz-core/src/components/Confirm").default;
  const rootReducer = require("webviz-core/src/reducers").default;
  const configureStore = require("webviz-core/src/store").default;
  const history = require("webviz-core/src/util/history").default;

  const store = configureStore(rootReducer, [routerMiddleware(history)]);

  function render() {
    const rootEl = document.getElementById("root");
    if (!rootEl) {
      // appease flow
      throw new Error("missing #root element");
    }

    waitForFonts(() => {
      ReactDOM.render(<hooks.Root store={store} history={history} />, rootEl);
    });
  }

  // Render a warning message if the user has an old browser.
  // From https://stackoverflow.com/a/4900484
  const chromeMatch = navigator.userAgent.match(/Chrom(e|ium)\/([0-9]+)\./);
  const chromeVersion = chromeMatch ? parseInt(chromeMatch[2], 10) : 0;
  if (chromeVersion < MINIMUM_CHROME_VERSION && !hooks.skipBrowserConfirmation()) {
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
