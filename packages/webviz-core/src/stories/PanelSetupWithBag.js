// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import microMemoize from "micro-memoize";
import * as React from "react"; // eslint-disable-line import/no-duplicates
import { useEffect, useState } from "react"; // eslint-disable-line import/no-duplicates
import rosbag from "rosbag";
import decompress from "wasm-lz4";

import { SECOND_SOURCE_PREFIX } from "../util/globalConstants";
import PanelSetup, { type Fixture } from "webviz-core/src/stories/PanelSetup";
import Logger from "webviz-core/src/util/Logger";

const log = new Logger(__filename);

type Props = {
  bagFileUrl?: string,
  bagFileUrl2?: string,
  children: React.Node,
  topics?: string[],
  // merge the bag data with existing fixture data
  getMergedFixture?: (bagFixture: Fixture) => Fixture,
  mapTopicToDatatype?: (topic: string) => string,
  hasNestedMessageHistory?: ?boolean,
  onMount?: (HTMLDivElement) => void,
  onFirstMount?: (HTMLDivElement) => void,
};

const defaultGetMergedFixture = (bagFixture) => bagFixture;
const defaultMapTopicToDatatype = () => "dummyType";

const getFixtureFromBag = async (
  bagFileUrl: string,
  topics: string[],
  mapTopicToDatatype: (topic: string) => string,
  getMergedFixture: (bagFixture: Fixture) => Fixture,
  second?: string = ""
) => {
  const response = await fetch(bagFileUrl);
  if (!response) {
    log.error(`failed to fetch the bag${second}`);
  }
  const blobs = await response.blob();
  const bagFile = new File([blobs], "temp.bag");
  const bag = await rosbag.open(bagFile).catch((err) => {
    log.error(`error opening the bag${second}`, err);
  });
  if (bag == null) {
    log.error(`bag${second} is not valid`);
  }

  // build the basic shape for fixture
  const tempFixture = {
    topics: topics.map((topic) => ({
      name: second ? `${SECOND_SOURCE_PREFIX}${topic}` : topic,
      datatype: mapTopicToDatatype(topic),
    })),
    frame: topics.reduce((memo, topic) => {
      memo[second ? `${SECOND_SOURCE_PREFIX}${topic}` : topic] = [];
      return memo;
    }, {}),
  };

  await bag
    .readMessages(
      {
        topics,
        decompress: {
          lz4: decompress,
        },
      },
      (result) => {
        const { message, topic } = result;
        tempFixture.frame[second ? `${SECOND_SOURCE_PREFIX}${topic}` : topic].push({
          topic: second ? `${SECOND_SOURCE_PREFIX}${topic}` : topic,
          receiveTime: result.timestamp,
          message,
        });
      }
    )
    .catch((err) => {
      log.error(`error reading messages from the bag${second}`, err);
    });

  return getMergedFixture(tempFixture);
};

const mergeFixtures = microMemoize((fixture1: Fixture, fixture2: Fixture) => ({
  topics: [...fixture1.topics, ...fixture2.topics],
  frame: {
    ...fixture1.frame,
    ...fixture2.frame,
  },
}));

async function loadBag(
  bagFileUrl: ?string,
  bagFileUrl2: ?string,
  hasNestedMessageHistory: ?boolean,
  getMergedFixture: (bagFixture: Fixture) => Fixture,
  mapTopicToDatatype: (topic: string) => string,
  topics: string[],
  setFixture: (any) => void
) {
  if (!bagFileUrl || topics.length === 0) {
    return;
  }

  const fixture1 = await getFixtureFromBag(bagFileUrl, topics, mapTopicToDatatype, getMergedFixture);
  const fixture2 = bagFileUrl2
    ? await getFixtureFromBag(bagFileUrl2, topics, mapTopicToDatatype, getMergedFixture, "2")
    : { topics: [], frame: {} };
  const mergedFixture = mergeFixtures(fixture1, fixture2);
  setFixture(mergedFixture);

  // Nesting two message history components within eachother causes the message history cache of messages to topics
  // to not be refreshed properly since both components mount at the same time.  This is a hack to support
  // stories for the image panel, which involve nested message histories, until we can get a proper fix for having
  // nested message histories with different topic subscriptions working.
  if (hasNestedMessageHistory) {
    setFixture({ ...mergedFixture });
  }
}

// A util component for testing panels that need to load the raw ROS bags.
// Make sure the bag is uncompressed and is small (only contains related topics).
// If the final fixture data is a mix of bag data (e.g. audio, image) and json/js data, you can
// merge them together using getMergedFixture
export default function PanelSetupWithBag({
  bagFileUrl,
  bagFileUrl2,
  children,
  hasNestedMessageHistory,
  getMergedFixture = defaultGetMergedFixture,
  mapTopicToDatatype = defaultMapTopicToDatatype,
  topics = [],
  onMount,
  onFirstMount,
}: Props) {
  const [fixture, setFixture] = useState();
  // load the bag when component is mounted or updated
  useEffect(
    () => {
      loadBag(
        bagFileUrl,
        bagFileUrl2,
        hasNestedMessageHistory,
        getMergedFixture,
        mapTopicToDatatype,
        topics,
        setFixture
      );
    },
    [bagFileUrl, bagFileUrl2, topics, getMergedFixture, hasNestedMessageHistory, mapTopicToDatatype]
  );

  return fixture ? (
    <PanelSetup fixture={fixture} onMount={onMount} onFirstMount={onFirstMount}>
      {children}
    </PanelSetup>
  ) : null;
}
