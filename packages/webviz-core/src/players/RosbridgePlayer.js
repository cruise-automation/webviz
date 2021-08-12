// @flow
//
//  Copyright (c) 2019-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { isEqual, sortBy, partition } from "lodash";
import * as React from "react";
import { MessageReader, type Time, parseMessageDefinition } from "rosbag";
import uuid from "uuid";

import renderToBody from "webviz-core/src/components/renderToBody";
import WssErrorModal from "webviz-core/src/components/WssErrorModal";
import {
  type AdvertisePayload,
  type BobjectMessage,
  type Message,
  type Player,
  PlayerCapabilities,
  type PlayerState,
  type PublishPayload,
  type SubscribePayload,
  type Topic,
  type ParsedMessageDefinitionsByTopic,
} from "webviz-core/src/players/types";
import type { RosDatatypes } from "webviz-core/src/types/RosDatatypes";
import { objectValues } from "webviz-core/src/util";
import { bagConnectionsToDatatypes } from "webviz-core/src/util/bagConnectionsHelper";
import { wrapJsObject } from "webviz-core/src/util/binaryObjects";
import debouncePromise from "webviz-core/src/util/debouncePromise";
import { FREEZE_MESSAGES } from "webviz-core/src/util/globalConstants";
import { getTopicsByTopicName } from "webviz-core/src/util/selectors";
import sendNotification from "webviz-core/src/util/sendNotification";
import { fromMillis, type TimestampMethod } from "webviz-core/src/util/time";

import "roslib/build/roslib";

const ROSLIB = window.ROSLIB;

const capabilities = [PlayerCapabilities.advertise];
const NO_WARNINGS = Object.freeze({});

// Connects to `rosbridge_server` instance using `roslibjs`. Currently doesn't support seeking or
// showing simulated time, so current time from Date.now() is always used instead. Also doesn't yet
// support raw ROS messages; instead we use the CBOR compression provided by roslibjs, which
// unmarshalls into plain JS objects.
export default class RosbridgePlayer implements Player {
  _url: string; // WebSocket URL.
  _rosClient: ?ROSLIB.Ros; // The roslibjs client when we're connected.
  _id: string = uuid.v4(); // Unique ID for this player.
  _listener: (PlayerState) => Promise<void>; // Listener for _emitState().
  _closed: boolean = false; // Whether the player has been completely closed using close().
  _providerTopics: ?(Topic[]); // Topics as published by the WebSocket.
  _providerDatatypes: ?RosDatatypes; // Datatypes as published by the WebSocket.
  _messageReadersByDatatype: { [datatype: string]: MessageReader };
  _start: ?Time; // The time at which we started playing.
  _topicSubscriptions: { [topicName: string]: ROSLIB.Topic } = {}; // Active subscriptions.
  _requestedSubscriptions: SubscribePayload[] = []; // Requested subscriptions by setSubscriptions()
  _parsedMessages: Message[] = []; // Queue of messages that we'll send in next _emitState() call.
  _bobjects: BobjectMessage[] = []; // Queue of bobjects that we'll send in next _emitState() call.
  _messageOrder: TimestampMethod = "receiveTime";
  _requestTopicsTimeout: ?TimeoutID; // setTimeout() handle for _requestTopics().
  _topicPublishers: { [topicName: string]: ROSLIB.Topic } = {};
  _parsedMessageDefinitionsByTopic: ParsedMessageDefinitionsByTopic = {};
  _bobjectTopics: Set<string> = new Set();
  _parsedTopics: Set<string> = new Set();
  _receivedBytes: number = 0;

  constructor(url: string) {
    this._url = url;
    this._start = fromMillis(Date.now());
    this._open();
  }

  _open = () => {
    if (this._closed) {
      return;
    }

    try {
      // Create a dummy socket. This will throw if there's a SecurityError.
      const tempSocket = new WebSocket(this._url);
      tempSocket.binaryType = "arraybuffer";
      tempSocket.close();
    } catch (error) {
      if (error && error.name === "SecurityError") {
        const modal = renderToBody(<WssErrorModal onRequestClose={() => modal.remove()} />);
        return;
      }
      console.error("Unknown WebSocket error", error);
    }

    // `workersocket` will open the actual WebSocket connection in a WebWorker.
    const rosClient = new ROSLIB.Ros({ url: this._url, transportLibrary: "workersocket" });

    rosClient.on("connection", () => {
      if (this._closed) {
        return;
      }
      this._rosClient = rosClient;
      this._requestTopics();
    });

    rosClient.on("error", (error) => {
      // TODO(JP): Figure out which kinds of errors we can get here, and which ones we should
      // actually show to the user.
      console.warn("WebSocket error", error);
    });

    rosClient.on("close", () => {
      clearTimeout(this._requestTopicsTimeout);
      for (const topicName in this._topicSubscriptions) {
        this._topicSubscriptions[topicName].unsubscribe();
        delete this._topicSubscriptions[topicName];
      }
      rosClient.close();
      delete this._rosClient;
      this._emitState();

      // Try connecting again.
      setTimeout(this._open, 1000);
    });
  };

  _requestTopics = async () => {
    clearTimeout(this._requestTopicsTimeout);
    const rosClient = this._rosClient;
    if (!rosClient || this._closed) {
      return;
    }

    try {
      const result = await new Promise((resolve, reject) => rosClient.getTopicsAndRawTypes(resolve, reject));

      const topicsMissingDatatypes: string[] = [];
      const topics = [];
      const datatypeDescriptions = [];
      const messageReaders = {};

      for (let i = 0; i < result.topics.length; i++) {
        const topicName = result.topics[i];
        const type = result.types[i];
        const messageDefinition = result.typedefs_full_text[i];

        if (!type || !messageDefinition) {
          topicsMissingDatatypes.push(topicName);
          continue;
        }
        topics.push({ name: topicName, datatype: type });
        datatypeDescriptions.push({ type, messageDefinition });
        const parsedDefinition =
          typeof messageDefinition === "string" ? parseMessageDefinition(messageDefinition) : messageDefinition;
        messageReaders[type] = messageReaders[type] || new MessageReader(parsedDefinition, { freeze: FREEZE_MESSAGES });
        this._parsedMessageDefinitionsByTopic[topicName] = parsedDefinition;
      }

      // Sort them for easy comparison. If nothing has changed here, bail out.
      const sortedTopics = sortBy(topics, "name");
      if (isEqual(sortedTopics, this._providerTopics)) {
        return;
      }

      if (topicsMissingDatatypes.length > 0) {
        sendNotification(
          "Could not resolve all message types",
          `This can happen e.g. when playing a bag from a different codebase. Message types could not be found for these topics:\n${topicsMissingDatatypes.join(
            "\n"
          )}`,
          "user",
          "warn"
        );
      }

      this._providerTopics = sortedTopics;
      this._providerDatatypes = bagConnectionsToDatatypes(datatypeDescriptions);
      this._messageReadersByDatatype = messageReaders;

      // Try subscribing again, since we might now be able to subscribe to some new topics.
      this.setSubscriptions(this._requestedSubscriptions);
      this._emitState();
    } catch (error) {
      sendNotification("Error in fetching topics and datatypes", error, "app", "error");
    } finally {
      // Regardless of what happens, request topics again in a little bit.
      this._requestTopicsTimeout = setTimeout(this._requestTopics, 3000);
    }
  };

  _emitState = debouncePromise(() => {
    if (!this._listener || this._closed) {
      return Promise.resolve();
    }

    const { _providerTopics, _providerDatatypes, _start } = this;
    if (!_providerTopics || !_providerDatatypes || !_start) {
      return this._listener({
        isPresent: true,
        showSpinner: true,
        showInitializing: !!this._rosClient,
        progress: {},
        capabilities,
        playerId: this._id,
        activeData: undefined,
      });
    }

    // Time is always moving forward even if we don't get messages from the server.
    setTimeout(this._emitState, 100);

    const currentTime = fromMillis(Date.now());
    const messages = this._parsedMessages;
    this._parsedMessages = [];
    const bobjects = this._bobjects;
    this._bobjects = [];
    return this._listener({
      isPresent: true,
      showSpinner: !this._rosClient,
      showInitializing: false,
      progress: {},
      capabilities,
      playerId: this._id,

      activeData: {
        messages,
        bobjects,
        totalBytesReceived: this._receivedBytes,
        messageOrder: this._messageOrder,
        startTime: _start,
        endTime: currentTime,
        currentTime,
        isPlaying: true,
        speed: 1,
        // We don't support seeking, so we need to set this to any fixed value. Just avoid 0 so
        // that we don't accidentally hit falsy checks.
        lastSeekTime: 1,
        topics: _providerTopics,
        datatypes: _providerDatatypes,
        parsedMessageDefinitionsByTopic: this._parsedMessageDefinitionsByTopic,
        playerWarnings: NO_WARNINGS,
      },
    });
  });

  setListener(listener: (PlayerState) => Promise<void>) {
    this._listener = listener;
    this._emitState();
  }

  close() {
    this._closed = true;
    if (this._rosClient) {
      this._rosClient.close();
    }
  }

  setSubscriptions(subscriptions: SubscribePayload[]) {
    this._requestedSubscriptions = subscriptions;

    if (!this._rosClient || this._closed) {
      return;
    }

    const [bobjectSubscriptions, parsedSubscriptions] = partition(subscriptions, ({ format }) => format === "bobjects");
    this._bobjectTopics = new Set(bobjectSubscriptions.map(({ topic }) => topic));
    this._parsedTopics = new Set(parsedSubscriptions.map(({ topic }) => topic));

    // See what topics we actually can subscribe to.
    const availableTopicsByTopicName = getTopicsByTopicName(this._providerTopics);
    const topicNames = subscriptions
      .map(({ topic }) => topic)
      .filter((topicName) => availableTopicsByTopicName[topicName]);

    // Subscribe to all topics that we aren't subscribed to yet.
    for (const topicName of topicNames) {
      if (!this._topicSubscriptions[topicName]) {
        this._topicSubscriptions[topicName] = new ROSLIB.Topic({
          ros: this._rosClient,
          name: topicName,
          compression: "cbor-raw",
        });
        const { datatype } = availableTopicsByTopicName[topicName];
        const messageReader = this._messageReadersByDatatype[datatype];
        this._topicSubscriptions[topicName].subscribe((message) => {
          if (!this._providerTopics) {
            return;
          }

          const topic = topicName;
          const receiveTime = fromMillis(Date.now());
          const innerMessage = messageReader.readMessage(Buffer.from(message.bytes));
          if (this._bobjectTopics.has(topicName) && this._providerDatatypes) {
            this._bobjects.push({
              topic,
              receiveTime,
              message: wrapJsObject(this._providerDatatypes, datatype, innerMessage),
            });
          }

          if (this._parsedTopics.has(topicName)) {
            this._parsedMessages.push({
              topic,
              receiveTime,
              message: innerMessage,
            });
          }

          this._emitState();
        });
      }
    }

    // Unsubscribe from topics that we are subscribed to but shouldn't be.
    for (const topicName in this._topicSubscriptions) {
      if (!topicNames.includes(topicName)) {
        this._topicSubscriptions[topicName].unsubscribe();
        delete this._topicSubscriptions[topicName];
      }
    }
  }

  setPublishers(publishers: AdvertisePayload[]) {
    // Since `setPublishers` is rarely called, we can get away with just throwing away the old
    // ROSLIB.Topic objects and creating new ones.
    for (const publisher of objectValues(this._topicPublishers)) {
      publisher.unadvertise();
    }
    this._topicPublishers = {};
    for (const { topic, datatype } of publishers) {
      this._topicPublishers[topic] = new ROSLIB.Topic({
        ros: this._rosClient,
        name: topic,
        messageType: datatype,
        queue_size: 0,
      });
    }
  }

  publish({ topic, msg }: PublishPayload) {
    if (!this._topicPublishers[topic]) {
      sendNotification(
        "Invalid publish call",
        `Tried to publish on a topic that is not registered as a publisher: ${topic}`,
        "app",
        "error"
      );
      return;
    }
    this._topicPublishers[topic].publish(msg);
  }

  // Bunch of unsupported stuff. Just don't do anything for these.
  startPlayback() {}
  pausePlayback() {}
  seekPlayback(_time: Time) {}
  setPlaybackSpeed(_speedFraction: number) {}
  requestBackfill() {}
  setGlobalVariables() {}
  setMessageOrder() {}
}
