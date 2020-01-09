// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { storiesOf } from "@storybook/react";
import { set, get, cloneDeep } from "lodash";
import React, { useState, useRef } from "react";
import TestUtils from "react-dom/test-utils";
import { withScreenshot } from "storybook-chrome-screenshot";

import TopicSettingsEditor from "./TopicSettingsEditor";
import type { TopicItem } from "./types";
import SceneBuilder from "webviz-core/src/panels/ThreeDimensionalViz/SceneBuilder";
import { POINT_CLOUD_DATATYPE } from "webviz-core/src/util/globalConstants";

export function JsonComparison({ beforeJson, afterJson }: {| beforeJson: any, afterJson: any |}) {
  return (
    <>
      <div style={{ width: 400, fontSize: 10, padding: 8 }}>
        <b>Json (before) :</b>
        <pre>{JSON.stringify(beforeJson, null, 2)}</pre>
      </div>
      <div style={{ width: 400, fontSize: 10, padding: 8 }}>
        <b>Json (after):</b>
        <pre>{JSON.stringify(afterJson, null, 2)}</pre>
      </div>
    </>
  );
}

function Example({
  showBag2,
  showUpdate,
  showReset,
  topicItem: initialTopicItem,
}: {
  showBag2?: boolean,
  showUpdate?: boolean,
  showReset?: boolean,
  topicItem: TopicItem,
}) {
  const [topicGroups, setTopicGroups] = useState([
    { displayName: "My Group", derivedFields: { id: "1" }, items: [initialTopicItem] },
  ]);
  const renderRef = useRef(0);
  const objectPath = "[0].items.[0]";
  return (
    <div
      style={{ display: "flex", height: "100vh", overflow: "auto", backgroundColor: "#404047" }}
      ref={() => {
        if (renderRef.current) {
          return;
        }
        if (showUpdate) {
          const inputEl: ?HTMLInputElement = (document.querySelector('[data-test="point-size-input"]'): any);
          if (inputEl) {
            inputEl.value = "10";
            TestUtils.Simulate.change(inputEl);
          }
        }
        if (showReset) {
          const resetBtn = document.querySelector(".test-reset-settings-btn");
          if (resetBtn) {
            resetBtn.click();
          }
        }
        renderRef.current++;
      }}>
      <div style={{ width: 400, height: 600 }}>
        <TopicSettingsEditor
          objectPath={objectPath}
          dataTestDefaultTabKey={showBag2 ? "1" : "0"}
          sceneBuilder={new SceneBuilder()}
          topicGroups={topicGroups}
          onTopicGroupsChange={(topicSettingObjectPath, value) => {
            const newTopicGroups = cloneDeep(topicGroups);
            set(newTopicGroups, topicSettingObjectPath, value);
            setTopicGroups(newTopicGroups);
          }}
        />
      </div>
      {(showUpdate || showReset) && (
        <JsonComparison beforeJson={initialTopicItem} afterJson={get(topicGroups, objectPath)} />
      )}
    </div>
  );
}

storiesOf("<TopicGroups> - Settings", module)
  .addDecorator(withScreenshot())
  .add(`single bag - ${POINT_CLOUD_DATATYPE}`, () => {
    return (
      <Example
        topicItem={{
          topicName: "/some_topic_name",
          derivedFields: {
            id: "some_uniq_id",
            displayName: "Some Topic",
            displayVisibilityBySource: {
              "": {
                isParentVisible: true,
                badgeText: "B1",
                visible: true,
                available: true,
              },
            },
            availablePrefixes: [""],
            datatype: POINT_CLOUD_DATATYPE,
            namespaceItems: [],
          },
        }}
      />
    );
  })
  .add(`two bags - ${POINT_CLOUD_DATATYPE}`, () => {
    return (
      <Example
        topicItem={{
          topicName: "/some_topic_name",
          derivedFields: {
            id: "some_uniq_id",
            displayName: "Some Topic",
            displayVisibilityBySource: {
              "": {
                isParentVisible: true,
                badgeText: "B1",
                visible: true,
                available: true,
              },
            },
            availablePrefixes: ["", "/webviz_bag_2"],
            datatype: POINT_CLOUD_DATATYPE,
            namespaceItems: [],
          },
        }}
      />
    );
  })
  .add(`show saved settings - ${POINT_CLOUD_DATATYPE}`, () => {
    return (
      <Example
        showUpdate
        topicItem={{
          topicName: "/some_topic_name",
          derivedFields: {
            id: "some_uniq_id",
            displayName: "Some Topic",
            displayVisibilityBySource: {
              "": {
                isParentVisible: true,
                badgeText: "B1",
                visible: true,
                available: true,
              },
            },
            availablePrefixes: ["", "/webviz_bag_2"],
            datatype: POINT_CLOUD_DATATYPE,
            namespaceItems: [],
          },
        }}
      />
    );
  })
  .add(`merge settings - ${POINT_CLOUD_DATATYPE}`, () => {
    return (
      <Example
        showUpdate
        showBag2
        topicItem={{
          topicName: "/some_topic_name",
          settingsBySource: {
            "": { pointSize: 4 },
            "/webviz_bag_2": { decayTime: 0.3 },
          },
          derivedFields: {
            id: "some_uniq_id",
            displayName: "Some Topic",
            displayVisibilityBySource: {
              "/webviz_bag_2": {
                isParentVisible: true,
                badgeText: "B1",
                visible: true,
                available: true,
              },
            },
            availablePrefixes: ["", "/webviz_bag_2"],
            datatype: POINT_CLOUD_DATATYPE,
            namespaceItems: [],
          },
        }}
      />
    );
  })
  .add(`reset settings - ${POINT_CLOUD_DATATYPE}`, () => {
    return (
      <Example
        showUpdate
        showReset
        topicItem={{
          topicName: "/some_topic_name",
          settingsBySource: {
            "": { pointSize: 4 },
          },
          derivedFields: {
            id: "some_uniq_id",
            displayName: "Some Topic",
            displayVisibilityBySource: {
              "": {
                isParentVisible: true,
                badgeText: "B1",
                visible: true,
                available: true,
              },
            },
            availablePrefixes: [""],
            datatype: POINT_CLOUD_DATATYPE,
            namespaceItems: [],
          },
        }}
      />
    );
  })
  .add(`reset settings per data source - ${POINT_CLOUD_DATATYPE}`, () => {
    return (
      <Example
        showUpdate
        showBag2
        showReset
        topicItem={{
          topicName: "/some_topic_name",
          settingsBySource: {
            "": { pointSize: 4 },
            "/webviz_bag_2": { decayTime: 0.3 },
          },
          derivedFields: {
            id: "some_uniq_id",
            displayName: "Some Topic",
            displayVisibilityBySource: {
              "/webviz_bag_2": {
                isParentVisible: true,
                badgeText: "B1",
                visible: true,
                available: true,
              },
            },
            availablePrefixes: ["", "/webviz_bag_2"],
            datatype: POINT_CLOUD_DATATYPE,
            namespaceItems: [],
          },
        }}
      />
    );
  });
