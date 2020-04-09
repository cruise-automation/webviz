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

import { DEFAULT_GROUP_PREFIXES_BY_COLUMN } from "./topicGroupsUtils";
import TopicSettingsEditor from "./TopicSettingsEditor";
import type { TopicItem } from "./types";
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
  message,
  showBag2,
  showUpdate,
  showReset,
  topicItem: initialTopicItem,
}: {
  message?: any,
  showBag2?: boolean,
  showUpdate?: boolean,
  showReset?: boolean,
  topicItem: TopicItem,
}) {
  const [topicGroups, setTopicGroups] = useState([
    {
      displayName: "My Group",
      visibilityByColumn: [true, false],
      derivedFields: {
        id: "1",
        isShownInList: true,
        keyboardFocusIndex: 0,
        addTopicKeyboardFocusIndex: 3,
        prefixesByColumn: DEFAULT_GROUP_PREFIXES_BY_COLUMN,
        expanded: true,
        hasFeatureColumn: true,
      },
      items: [initialTopicItem],
    },
  ]);
  const hasRenderedRef = useRef(false);
  const objectPath = "[0].items.[0]";
  return (
    <div
      style={{ display: "flex", height: "100vh", overflow: "auto", backgroundColor: "#404047" }}
      ref={() => {
        if (hasRenderedRef.current) {
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
        hasRenderedRef.current = true;
      }}>
      <div style={{ width: 400, height: 600 }}>
        <TopicSettingsEditor
          objectPath={objectPath}
          dataTestDefaultTabKey={showBag2 ? "1" : "0"}
          sceneCollectorMsgForTopicSetting={message}
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

const SINGLE_BAG_SHARED_PROPS = {
  topicName: "/some_topic_name",
  derivedFields: {
    datatype: POINT_CLOUD_DATATYPE,
    displayName: "Some Topic",
    displayVisibilityByColumn: [{ isParentVisible: true, badgeText: "B1", visible: true, available: true }],
    id: "some_uniq_id",
    isShownInList: true,
    keyboardFocusIndex: 1,
    prefixByColumn: ["", "/webviz_bag_2"],
  },
};
const MULTI_BAG_SHARED_PROPS = {
  topicName: "/some_topic_name",
  derivedFields: {
    datatype: POINT_CLOUD_DATATYPE,
    displayName: "Some Topic",
    displayVisibilityByColumn: [{ isParentVisible: true, badgeText: "B1", visible: true, available: true }],
    id: "some_uniq_id",
    isShownInList: true,
    keyboardFocusIndex: 1,
    prefixByColumn: ["", "/webviz_bag_2"],
  },
};

storiesOf("<TopicGroups> - Settings", module)
  .addDecorator(withScreenshot())
  .add(`single bag - ${POINT_CLOUD_DATATYPE}`, () => {
    return <Example topicItem={SINGLE_BAG_SHARED_PROPS} />;
  })
  .add(`two bags - ${POINT_CLOUD_DATATYPE}`, () => {
    return <Example topicItem={MULTI_BAG_SHARED_PROPS} />;
  })
  .add(`two bags - ${POINT_CLOUD_DATATYPE} - with message`, () => {
    return <Example topicItem={MULTI_BAG_SHARED_PROPS} message={{ fields: [{ name: "one" }, { name: "two" }] }} />;
  })
  .add(`show saved settings - ${POINT_CLOUD_DATATYPE}`, () => {
    return <Example showUpdate topicItem={MULTI_BAG_SHARED_PROPS} />;
  })
  .add(`merge settings - ${POINT_CLOUD_DATATYPE}`, () => {
    return (
      <Example
        showUpdate
        showBag2
        topicItem={{
          ...MULTI_BAG_SHARED_PROPS,
          settingsByColumn: [{ pointSize: 4 }, { decayTime: 0.3 }],
        }}
      />
    );
  })
  .add(`reset settings - ${POINT_CLOUD_DATATYPE}`, () => {
    return (
      <Example
        showUpdate
        showReset
        topicItem={{ ...MULTI_BAG_SHARED_PROPS, settingsByColumn: [{ pointSize: 4 }, undefined] }}
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
          ...MULTI_BAG_SHARED_PROPS,
          settingsByColumn: [{ pointSize: 4 }, { decayTime: 0.3 }],
        }}
      />
    );
  });

// TODO(Audrey): add colorMode toggle story
