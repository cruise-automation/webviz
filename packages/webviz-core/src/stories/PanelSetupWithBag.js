// @flow
//
//  Copyright (c) 2018-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import * as React from "react"; // eslint-disable-line import/no-duplicates
import { useEffect, useState } from "react"; // eslint-disable-line import/no-duplicates
import rosbag from "rosbag";

import PanelSetup, { type Fixture } from "webviz-core/src/stories/PanelSetup";
import Logger from "webviz-core/src/util/Logger";

const log = new Logger(__filename);

type Props = {
  bagFileUrl?: string,
  children: React.Node,
  topics?: string[],
  // merge the bag data with existing fixture data
  getMergedFixture?: (bagFixture: Fixture) => Fixture,
  mapTopicToDatatype?: (topic: string) => string,
  hasNestedMessageHistory?: ?boolean,
  onMount?: (HTMLDivElement) => void,
};

const defaultGetMergedFixture = (bagFixture) => bagFixture;
const defaultMapTopicToDatatype = () => "dummyType";
// A util component for testing panels that need to load the raw ROS bags.
// Make sure the bag is uncompressed and is small (only contains related topics).
// If the final fixture data is a mix of bag data (e.g. audio, image) and json/js data, you can
// merge them together using getMergedFixture
export default function PanelSetupWithBag({
  bagFileUrl,
  children,
  hasNestedMessageHistory,
  getMergedFixture = defaultGetMergedFixture,
  mapTopicToDatatype = defaultMapTopicToDatatype,
  topics = [],
  onMount,
}: Props) {
  const [fixture, setFixture] = useState();
  // load the bag when component is mounted or updated
  useEffect(
    () => {
      async function loadBag() {
        if (!bagFileUrl || topics.length === 0) {
          return;
        }

        const response = await fetch(bagFileUrl);
        if (!response) {
          log.error("failed to fetch the bag");
        }
        const blobs = await response.blob();
        const bagFile = new File([blobs], "temp.bag");
        const bag = await rosbag.open(bagFile).catch((err) => {
          log.error("error openning the bag", err);
        });
        if (bag == null) {
          log.error("bag is not valid");
        }

        // build the basic shape for fixture
        const tempFixture = {
          topics: topics.map((topic) => ({ name: topic, datatype: mapTopicToDatatype(topic) })),
          frame: topics.reduce((memo, topic) => {
            memo[topic] = [];
            return memo;
          }, {}),
        };

        await bag
          .readMessages({ topics }, (result) => {
            const { message, topic } = result;
            tempFixture.frame[topic].push({
              datatype: mapTopicToDatatype(topic),
              topic,
              op: "message",
              receiveTime: result.timestamp,
              message,
            });
          })
          .catch((err) => {
            log.error("error reading messages from the bag", err);
          });

        const fixture = getMergedFixture(tempFixture);
        setFixture(fixture);

        // Nesting two message history components within eachother causes the message history cache of messages to topics
        // to not be refreshed properly since both components mount at the same time.  This is a hack to support
        // stories for the image panel, which involve nested message histories, until we can get a proper fix for having
        // nested message histories with different topic subscriptions working.
        if (hasNestedMessageHistory) {
          setFixture({ ...fixture });
        }
      }
      loadBag();
    },
    [bagFileUrl, topics, getMergedFixture, hasNestedMessageHistory, mapTopicToDatatype]
  );

  return fixture ? (
    <PanelSetup fixture={fixture} onMount={onMount}>
      {children}
    </PanelSetup>
  ) : null;
}
