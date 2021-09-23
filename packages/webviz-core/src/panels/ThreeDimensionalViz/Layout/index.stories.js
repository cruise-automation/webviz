// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.
import React, { useState } from "react";

import delay from "webviz-core/shared/delay";
import Flex from "webviz-core/src/components/Flex";
import ThreeDimensionalViz from "webviz-core/src/panels/ThreeDimensionalViz";
import storiesWithEventsOf from "webviz-core/src/panels/ThreeDimensionalViz/stories/storiesWithEventsOf";
import PanelSetup from "webviz-core/src/stories/PanelSetup";
import { SExpectedResult } from "webviz-core/src/stories/storyHelpers";

const emptyFixture = { topics: [], datatypes: {}, frame: {}, layout: "NumberOfRenders!a" };

const LayoutStory = ({ onFirstMount, perspective }) => {
  const [config, setConfig] = useState({
    settingsByKey: {},
    expandedKeys: ["name:Map", "t:/metadata"],
    checkedKeys: ["name:Map", "t:/metadata", perspective ? "ns:/metadata:height" : null].filter(Boolean),
    modifiedNamespaceTopics: ["/metadata"],
    pinTopics: true,
    cameraState: {
      perspective,
      target: [1322.127197265625, -1484.3931884765625, -20.19326400756836],
      distance: 75,
      phi: 0.7853981633974483,
      targetOffset: [0, 0, 0],
      targetOrientation: [0, 0, 0, 1],
      thetaOffset: 0,
    },
    diffModeEnabled: false,
  });
  const saveConfig = (newConfig) => setConfig((oldConfig) => ({ ...oldConfig, ...newConfig }));
  return (
    <PanelSetup fixture={emptyFixture} onFirstMount={onFirstMount}>
      <Flex col>
        <ThreeDimensionalViz config={config} saveConfig={saveConfig} />
      </Flex>
    </PanelSetup>
  );
};

storiesWithEventsOf("<3DViz> / Layout", module)
  .addParameters({ screenshot: { delay: 500 } })
  .add("enables height when enabling 3D camera perspective", () => {
    const onSaveConfig = () => {};
    return (
      <Flex>
        <LayoutStory
          perspective={false}
          onSaveConfig={onSaveConfig}
          onFirstMount={() =>
            setImmediate(async () => {
              await delay(100);
              document.querySelectorAll('[data-test="MainToolbar-toggleCameraMode"]')[0].click();
            })
          }
        />
        <SExpectedResult style={{ left: "200px", top: "125px" }}>height should be enabled</SExpectedResult>
      </Flex>
    );
  })
  .add("disables height when disabling 3D camera perspective", () => {
    const onSaveConfig = () => {};
    return (
      <div style={{ display: "flex", flex: "1 1" }}>
        <LayoutStory
          onSaveConfig={onSaveConfig}
          perspective
          onFirstMount={() =>
            setImmediate(async () => {
              await delay(100);
              document.querySelectorAll('[data-test="MainToolbar-toggleCameraMode"]')[0].click();
            })
          }
        />
        <SExpectedResult style={{ left: "200px", top: "125px" }}>height should be disabled</SExpectedResult>
      </div>
    );
  });
