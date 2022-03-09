// @flow
//
//  Copyright (c) 2021-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.
import React, { useEffect, useState } from "react";
import { hot } from "react-hot-loader/root";

import helpContent from "./index.help.md";
import { getExperimentalFeature } from "webviz-core/src/components/ExperimentalFeatures/storage";
import Flex from "webviz-core/src/components/Flex";
import Panel from "webviz-core/src/components/Panel";
import PanelToolbar from "webviz-core/src/components/PanelToolbar";
import type { SaveConfig } from "webviz-core/src/types/panels";
import { useZaplibContext } from "webviz-core/src/util/ZaplibContext";

type Config = {};

type Props = { config: Config, saveConfig: SaveConfig<Config> };

function ZaplibVersion(_props: Props) {
  const [version, setVersion] = useState("");

  const zaplibEnabled = getExperimentalFeature("zaplib");
  const zaplib = useZaplibContext();

  useEffect(() => {
    if (zaplibEnabled) {
      if (zaplib) {
        zaplib.callRustAsync("get_zaplib_version").then(([versionStr]) => {
          if (typeof versionStr === "string") {
            setVersion(`Using Zaplib ${versionStr}`);
          } else {
            setVersion("Invalid version information");
          }
        });
      }
    } else {
      setVersion("Cannot get Zaplib version information. Did you enable Webviz Rust Framework experimental flag?");
    }
  }, [zaplib, zaplibEnabled]);

  return (
    <Flex grow col style={{ height: "100%" }}>
      <PanelToolbar helpContent={helpContent} floating />
      <p>{version}</p>
    </Flex>
  );
}

export const defaultConfig: Config = {};

ZaplibVersion.displayName = "ZaplibVersion";
ZaplibVersion.panelType = "ZaplibVersion";
ZaplibVersion.defaultConfig = defaultConfig;

export default hot(Panel<Config>(ZaplibVersion));
