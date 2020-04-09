/* eslint-disable header/header */

//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import * as Sentry from "@sentry/browser";
import React from "react";
import ReactDOM from "react-dom";

// We put all the internal requires inside functions, so that when they load the hooks have been properly set.

let importedPanelsByCategory;
let importedPerPanelHooks;
const defaultHooks = {
  areHooksImported: () => importedPanelsByCategory && importedPerPanelHooks,
  getEventLogger: () => undefined,
  async importHooksAsync() {
    return new Promise((resolve, reject) => {
      if (importedPanelsByCategory && importedPerPanelHooks) {
        resolve();
      }
      import(/* webpackChunkName: "hooks_bundle" */ "./hooksImporter")
        .then((hooksImporter) => {
          importedPerPanelHooks = hooksImporter.perPanelHooks();
          importedPanelsByCategory = hooksImporter.panelsByCategory();
          resolve();
        })
        .catch((reason) => {
          Sentry.captureException(new Error(reason));
          reject(`Failed to import hooks bundle: ${reason}`);
        });
    });
  },
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
  panelsByCategory: () => {
    if (!importedPanelsByCategory) {
      throw new Error("panelsByCategory requested before hooks have been imported");
    }
    return importedPanelsByCategory;
  },
  helpPageFootnote: () => null,
  perPanelHooks: () => {
    if (!importedPerPanelHooks) {
      throw new Error("perPanelHooks requested before hooks have been imported");
    }
    return importedPerPanelHooks;
  },
  startupPerPanelHooks: () => {
    return {
      ThreeDimensionalViz: {
        getDefaultTopicSettingsByColumn(topicName) {
          return undefined;
        },
        getDefaultTopicTree: () => ({
          name: "root",
          children: [{ name: "TF", children: [], description: "Visualize relationships between /tf frames." }],
        }),
      },
    };
  },
  Root({ store }) {
    const Root = require("webviz-core/src/components/Root").default;
    return <Root store={store} />;
  },
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
      diskBagCaching: {
        name: "Disk Bag Caching (requires reload)",
        description:
          "When streaming bag data, persist it on disk, so that when reloading the page we don't have to download the data again. However, this might result in an overall slower experience, and is generally experimental, so we only recommend it if you're on a slow network connection. Alternatively, you can download the bag to disk manually, and drag it into Webviz.",
        developmentDefault: false,
        productionDefault: false,
      },
      unlimitedMemoryCache: {
        name: "Unlimited in-memory cache (requires reload)",
        description:
          "If you have a lot of memory in your computer, and you frequently have to play all the way through large bags, you can turn this on to fully buffer the bag into memory. However, use at your own risk, as this might crash the browser.",
        developmentDefault: false,
        productionDefault: false,
      },
    };
  },
  linkMessagePathSyntaxToHelpPage: () => true,
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
  const installDevtoolsFormatters = require("webviz-core/src/util/installDevtoolsFormatters").default;
  const overwriteFetch = require("webviz-core/src/util/overwriteFetch").default;
  const { hideLoadingLogo } = require("webviz-core/src/util/hideLoadingLogo");
  const { clearIndexedDbWithoutConfirmation } = require("webviz-core/src/util/indexeddb/clearIndexedDb");

  prepareForScreenshots(); // For integration screenshot tests.
  installDevtoolsFormatters();
  overwriteFetch();
  window.clearIndexedDb = clearIndexedDbWithoutConfirmation; // For integration tests.

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
    hideLoadingLogo();
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
