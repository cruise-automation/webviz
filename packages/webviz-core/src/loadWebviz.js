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
  getEventLogger: () => {
    return {
      logger: (_args) => undefined,
      eventNames: {},
      eventTags: {},
    };
  },
  getLayoutFromUrl: async (search) => {
    const { LAYOUT_URL_QUERY_KEY } = require("webviz-core/src/util/globalConstants");
    const params = new URLSearchParams(search);
    const layoutUrl = params.get(LAYOUT_URL_QUERY_KEY);
    return fetch(layoutUrl)
      .then((result) => {
        try {
          return result.json();
        } catch (e) {
          throw new Error(`Failed to parse JSON layout: ${e.message}`);
        }
      })
      .catch((e) => {
        throw new Error(`Failed to fetch layout from URL: ${e.message}`);
      });
  },
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
  getDefaultPersistedState() {
    const { defaultPlaybackConfig } = require("webviz-core/src/reducers/panels");
    /* eslint-disable no-restricted-modules */
    const { CURRENT_LAYOUT_VERSION } = require("webviz-core/migrations/constants");
    // All panel fields have to be present.
    return {
      fetchedLayout: { isLoading: false, data: undefined },
      panels: {
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
        version: CURRENT_LAYOUT_VERSION,
      },
    };
  },
  migratePanels(panels) {
    const migratePanels = require("webviz-core/migrations").default;
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
        getDefaultTopicSettingsByColumn(_topicName) {
          return undefined;
        },
        getDefaultSettings: () => ({}),
        getDefaultTopicTree: () => ({
          name: "root",
          children: [
            { name: "TF", topicName: "/tf", children: [], description: "Visualize relationships between /tf frames." },
          ],
        }),
        getStaticallyAvailableNamespacesByTopic: () => ({}),
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
      groupLines: {
        name: "Group Lines When Rendering",
        description: "A faster method of rendering lines in the 3D panel by grouping them together.",
        developmentDefault: true,
        productionDefault: true,
      },
      diskBagCaching: {
        name: "Disk Bag Caching (requires reload)",
        description:
          "When streaming bag data, persist it on disk, so that when reloading the page we don't have to download the data again. However, this might result in an overall slower experience, and is generally experimental, so we only recommend it if you're on a slow network connection. Alternatively, you can download the bag to disk manually, and drag it into Webviz.",
        developmentDefault: false,
        productionDefault: false,
      },
      preloading: {
        name: "Preloading",
        description: "Allow panels to use data from caches directly, without playback.",
        developmentDefault: true,
        productionDefault: true,
      },
      unlimitedMemoryCache: {
        name: "Unlimited in-memory cache (requires reload)",
        description:
          "If you have a lot of memory in your computer, and you frequently have to play all the way through large bags, you can turn this on to fully buffer the bag into memory. However, use at your own risk, as this might crash the browser.",
        developmentDefault: false,
        productionDefault: false,
      },
      globalVariableColorOverrides: {
        name: "Global variable color overrides",
        description: "Change the color of markers when they match a linkedGlobalVariable.",
        developmentDefault: false,
        productionDefault: false,
      },
      useBinaryTranslation: {
        name: "Use binary messages in the 3D panel instead of parsed messages",
        description:
          "Either use binary messages or _pretend_ to use binary messages in the 3D panel. Very broken, work in progress.",
        developmentDefault: false,
        productionDefault: false,
      },
    };
  },
  linkMessagePathSyntaxToHelpPage: () => true,
  getSecondSourceUrlParams() {
    const { REMOTE_BAG_URL_2_QUERY_KEY } = require("webviz-core/src/util/globalConstants");
    return [REMOTE_BAG_URL_2_QUERY_KEY];
  },
  getUpdatedUrlToTrackLayout: async ({ search, _state, _skipPatch }) => {
    await Promise.resolve();
    return search;
  },
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

  const initializationResult = hooks.load();

  const waitForFonts = require("webviz-core/src/styles/waitForFonts").default;
  const Confirm = require("webviz-core/src/components/Confirm").default;

  // Importing from /webviz-core/shared/delay seems to not work for some reason (maybe a bundle issue)? Just duplicate
  // it here.
  async function delay(timeoutMs) {
    return new Promise((resolve) => setTimeout(resolve, timeoutMs));
  }

  async function render() {
    const rootEl = document.getElementById("root");
    if (!rootEl) {
      // appease flow
      throw new Error("missing #root element");
    }

    await waitForFonts();
    // Wait for any async load functions to start running while we are doing the initial render.
    // The number isn't really important here, we just want to make sure that other async callbacks have a chance to
    // run, because once we start the initial Webviz render we hold the main thread for ~500ms.
    await delay(5);
    ReactDOM.render(<hooks.Root history={history} initializationResult={initializationResult} />, rootEl);
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
