// @flow
//
//  Copyright (c) 2019-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { isEqual, sortBy, uniq } from "lodash";
import type { Time } from "rosbag";
import uuid from "uuid";

import {
  type RoslibTypedef,
  messageDetailsToRosDatatypes,
  sanitizeMessage,
} from "webviz-core/src/players/RosbridgePlayer/utils";
import type {
  AdvertisePayload,
  Message,
  Player,
  PlayerState,
  PublishPayload,
  SubscribePayload,
  Topic,
} from "webviz-core/src/players/types";
import type { RosDatatypes } from "webviz-core/src/types/RosDatatypes";
import debouncePromise from "webviz-core/src/util/debouncePromise";
import reportError from "webviz-core/src/util/reportError";
import { topicsByTopicName } from "webviz-core/src/util/selectors";
import { fromMillis } from "webviz-core/src/util/time";

import "roslib/build/roslib";

const ROSLIB = window.ROSLIB;

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
  _validProviderTopics: ?(Topic[]); // Same topics as above, but only the ones that have valid datatypes.
  _providerDatatypes: ?RosDatatypes; // Datatypes as published by the WebSocket.
  _start: ?Time; // The time at which we started playing.
  _topicSubscriptions: { [topicName: string]: ROSLIB.Topic } = {}; // Active subscriptions.
  _requestedSubscriptions: SubscribePayload[] = []; // Requested subscriptions by setSubscriptions()
  _messages: Message[] = []; // Queue of messages that we'll send in next _emitState() call.
  _requestTopicsTimeout: ?TimeoutID; // setTimeout() handle for _requestTopics().

  constructor(url: string) {
    this._url = url;
    this._start = fromMillis(Date.now());
    this._open();
  }

  _open = () => {
    if (this._closed) {
      return;
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
      // actually show to the user. E.g. does a SecurityError when connecting from https:// to ws://
      // show up here?
      console.warn("WebSocket error", error);
    });

    rosClient.on("close", () => {
      clearTimeout(this._requestTopicsTimeout);
      for (const topicName in this._topicSubscriptions) {
        this._topicSubscriptions[topicName].unsubscribe();
        delete this._topicSubscriptions[topicName];
      }
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
      // First get the topics and put them in our format.
      const topicsResult = await new Promise((resolve, reject) => rosClient.getTopics(resolve, reject));
      const topics: Topic[] = [];
      for (let i = 0; i < topicsResult.topics.length; i++) {
        topics.push({ name: topicsResult.topics[i], datatype: topicsResult.types[i] });
      }

      // Sort them for easy comparison. If nothing has changed here, bail out.
      const sortedTopics = sortBy(topics, "name");
      if (isEqual(sortedTopics, this._providerTopics)) {
        return;
      }

      // Fetch all the datatypes in parallel.
      const uniqueTypes = uniq(topicsResult.types);
      const messageDetailsResults = await Promise.all(
        uniqueTypes.map((type) => new Promise((resolve, reject) => rosClient.getMessageDetails(type, resolve, resolve)))
      );

      // Separate datatypes into actual type definitions, and errors.
      const typedefs: RoslibTypedef[] = [];
      const errors: string[] = [];
      for (let i = 0; i < messageDetailsResults.length; i++) {
        const result = messageDetailsResults[i];
        if (typeof result === "string") {
          errors.push(`Error for message type '${uniqueTypes[i]}':\n${result}`);
        } else {
          for (const typedef of result) {
            typedefs.push(typedef);
          }
        }
      }
      if (errors.length > 0) {
        reportError("Could not resolve all message types", errors.join("\n\n"), "user");
      }
      const datatypes = messageDetailsToRosDatatypes(typedefs);

      this._providerTopics = sortedTopics;
      this._validProviderTopics = sortedTopics.filter(({ datatype }) => datatypes[datatype]);
      this._providerDatatypes = datatypes;
      // Try subscribing again, since we might now be able to subscribe to some new topics.
      this.setSubscriptions(this._requestedSubscriptions);
      this._emitState();
    } catch (error) {
      reportError("Error in fetching topics and datatypes", error, "app");
    } finally {
      // Regardless of what happens, request topics again in a little bit.
      this._requestTopicsTimeout = setTimeout(this._requestTopics, 3000);
    }
  };

  _emitState = debouncePromise(() => {
    if (!this._listener || this._closed) {
      return Promise.resolve();
    }

    const { _validProviderTopics, _providerDatatypes, _start } = this;
    if (!_validProviderTopics || !_providerDatatypes || !_start) {
      return this._listener({
        isPresent: true,
        showSpinner: true,
        showInitializing: !!this._rosClient,
        progress: {},
        capabilities: [],
        playerId: this._id,
        activeData: undefined,
      });
    }

    // Time is always moving forward even if we don't get messages from the server.
    setTimeout(this._emitState, 100);

    const currentTime = fromMillis(Date.now());
    const messages = this._messages;
    this._messages = [];
    return this._listener({
      isPresent: true,
      showSpinner: !this._rosClient,
      showInitializing: false,
      progress: {},
      capabilities: [],
      playerId: this._id,

      activeData: {
        messages,
        startTime: _start,
        endTime: currentTime,
        currentTime,
        isPlaying: true,
        speed: 1,
        // We don't support seeking, so we need to set this to any fixed value. Just avoid 0 so
        // that we don't accidentally hit falsy checks.
        lastSeekTime: 1,
        topics: _validProviderTopics,
        datatypes: _providerDatatypes,
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

    // See what topics we actually can subscribe to.
    const availableTopicsByTopicName = topicsByTopicName(this._validProviderTopics);
    const topicNames = subscriptions
      .map(({ topic }) => topic)
      .filter((topicName) => availableTopicsByTopicName[topicName]);

    // Subscribe to all topics that we aren't subscribed to yet.
    for (const topicName of topicNames) {
      if (!this._topicSubscriptions[topicName]) {
        this._topicSubscriptions[topicName] = new ROSLIB.Topic({
          ros: this._rosClient,
          name: topicName,
          compression: "cbor",
        });
        this._topicSubscriptions[topicName].subscribe((message) => {
          if (!this._validProviderTopics) {
            return;
          }
          sanitizeMessage(message);
          this._messages.push({
            op: "message",
            topic: topicName,
            datatype: availableTopicsByTopicName[topicName].datatype,
            receiveTime: fromMillis(Date.now()),
            message,
          });
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

  // Bunch of unsupported stuff. Just don't do anything for these.
  setPublishers(publishers: AdvertisePayload[]) {}
  publish(request: PublishPayload) {}
  startPlayback() {}
  pausePlayback() {}
  seekPlayback(time: Time) {}
  setPlaybackSpeed(speedFraction: number) {}
}
