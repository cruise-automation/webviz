// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import AccountIcon from "@mdi/svg/svg/account.svg";
import CheckIcon from "@mdi/svg/svg/check.svg";
import CloseIcon from "@mdi/svg/svg/close.svg";
import { noop } from "lodash";
import * as React from "react";

import { setExperimentalFeature, useAllExperimentalFeatures } from "./hooks";
import { getDefaultKey, getExperimentalFeaturesList } from "./storage";
import type { FeatureDescriptions, FeatureSettings } from "./types";
import Modal, { Title } from "webviz-core/src/components/Modal";
import Radio from "webviz-core/src/components/Radio";
import TextContent from "webviz-core/src/components/TextContent";
import Tooltip from "webviz-core/src/components/Tooltip";
import colors from "webviz-core/src/styles/colors";

function IconOn() {
  return (
    <Tooltip contents="on" placement="top">
      <span>
        <CheckIcon style={{ fill: colors.GREENL1, verticalAlign: "-6px" }} />
      </span>
    </Tooltip>
  );
}

function IconOff() {
  return (
    <Tooltip contents="off" placement="top">
      <span>
        <CloseIcon style={{ fill: colors.RED2, verticalAlign: "-6px" }} />
      </span>
    </Tooltip>
  );
}

function IconManuallySet() {
  return (
    <Tooltip contents="manually set" placement="top">
      <span>
        <AccountIcon style={{ fill: colors.YELLOWL1, verticalAlign: "-6px" }} />
      </span>
    </Tooltip>
  );
}

export function ExperimentalFeaturesModal(props: {|
  onRequestClose?: () => void,
  listForStories?: FeatureDescriptions,
  settingsForStories?: FeatureSettings,
|}) {
  const actualSettings = useAllExperimentalFeatures();
  const settings = props.settingsForStories || actualSettings;
  const list = props.listForStories || getExperimentalFeaturesList();

  return (
    <Modal onRequestClose={props.onRequestClose || noop}>
      <div style={{ maxWidth: 500, maxHeight: "90vh", overflow: "auto" }}>
        <Title>Experimental features</Title>
        <hr />
        <div style={{ padding: "32px" }}>
          <TextContent>
            <p>
              Enable or disable any experimental features. These settings will be stored your the browser’s{" "}
              <a href="https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage">local storage</a> for{" "}
              <em>{window.location.host}</em>. They will <em>not</em> be associated with your layout, user account, or
              persisted in any backend.
            </p>
            {Object.keys(list).length === 0 && (
              <p>
                <em>Currently there are no experimental features.</em>
              </p>
            )}
          </TextContent>
          {Object.keys(list).map((id: string) => {
            const feature = list[id];
            return (
              <div key={id} style={{ marginTop: 24 }}>
                <TextContent>
                  <h2>
                    {feature.name} <code style={{ fontSize: 12 }}>{id}</code>{" "}
                    <span style={{ whiteSpace: "nowrap" }}>
                      {settings[id].enabled ? <IconOn /> : <IconOff />}
                      {settings[id].manuallySet ? <IconManuallySet /> : undefined}
                    </span>
                  </h2>
                  {feature.description}
                </TextContent>
                <div style={{ marginTop: 8 }}>
                  <Radio
                    selectedId={
                      settings[id].manuallySet ? (settings[id].enabled ? "alwaysOn" : "alwaysOff") : "default"
                    }
                    onChange={(value) => {
                      if (value !== "default" && value !== "alwaysOn" && value !== "alwaysOff") {
                        throw new Error(`Invalid value for radio button: ${value}`);
                      }
                      setExperimentalFeature(id, value);
                    }}
                    options={[
                      {
                        id: "default",
                        label: `Default for ${window.location.host} (${feature[getDefaultKey()] ? "on" : "off"})`,
                      },
                      { id: "alwaysOn", label: "Always on" },
                      { id: "alwaysOff", label: "Always off" },
                    ]}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </Modal>
  );
}
