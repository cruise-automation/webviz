// @flow
//
//  Copyright (c) 2020-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.
import React, { useState, useCallback, useMemo, useRef, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { type Time } from "rosbag";
import styled from "styled-components";

import styles from "./index.module.scss";
import { setPlaybackConfig } from "webviz-core/src/actions/panels";
import Dropdown from "webviz-core/src/components/Dropdown";
import Flex from "webviz-core/src/components/Flex";
import { ndash } from "webviz-core/src/util/entities";
import { formatDate, formatTime, getValidatedTimeAndMethodFromString } from "webviz-core/src/util/formatTime";
import { colors } from "webviz-core/src/util/sharedStyleConstants";
import { formatTimeRaw, isTimeInRangeInclusive } from "webviz-core/src/util/time";

const MAX_WIDTH = 200;

const SInput = styled.input`
  margin-top: 2px;
  padding: 8px 4px;
  width: calc(100% - 4px);
  color: ${colors.LIGHT};
`;
const STimestamp = styled.span`
  margin-top: 2px;
  padding: 8px 4px;
  cursor: pointer;
  border-radius: 4px;
  color: ${colors.LIGHT};

  &:hover {
    background-color: ${colors.DARK3};
    opacity: 0.8;
  }
`;

const PlaybackTimeDisplayMethod = ({
  currentTime,
  startTime,
  endTime,
  timezone,
  onSeek,
  onPause,
  isPlaying,
}: {
  currentTime: Time,
  startTime: Time,
  endTime: Time,
  timezone?: ?string,
  onSeek: (Time) => void,
  onPause: () => void,
  isPlaying: boolean,
}) => {
  const timeDisplayMethod = useSelector(
    (state) => state.persistedState.panels.playbackConfig.timeDisplayMethod || "ROS"
  );
  const dispatch = useDispatch();
  const setTimeDisplayMethod = useCallback(
    (newTimeDisplayMethod) => dispatch(setPlaybackConfig({ timeDisplayMethod: newTimeDisplayMethod })),
    [dispatch]
  );

  const timestampInputRef = useRef();
  const [isEditing, setIsEditing] = useState<boolean>(false);

  const currentTimeString = useMemo(() => {
    if (currentTime) {
      return timeDisplayMethod === "ROS" ? formatTimeRaw(currentTime) : formatTime(currentTime, timezone);
    }
    return null;
  }, [currentTime, timeDisplayMethod, timezone]);
  const [inputText, setInputText] = useState<?string>(currentTimeString);
  const [hasError, setHasError] = useState<boolean>(false);

  const onSubmit = useCallback((e) => {
    e.preventDefault();

    if (!inputText?.length) {
      return;
    }

    const validTimeAndMethod = getValidatedTimeAndMethodFromString({
      text: inputText,
      date: formatDate(currentTime, timezone),
      timezone,
    });

    if (!validTimeAndMethod) {
      setHasError(true);
      return;
    }

    // If input is valid, clear error state, exit edit mode, and seek to input timestamp
    setHasError(false);
    setIsEditing(false);
    if (
      validTimeAndMethod &&
      validTimeAndMethod.time &&
      isTimeInRangeInclusive(validTimeAndMethod.time, startTime, endTime)
    ) {
      onSeek(validTimeAndMethod.time);
      if (validTimeAndMethod.method !== timeDisplayMethod) {
        setTimeDisplayMethod(validTimeAndMethod.method);
      }
    }
  }, [currentTime, endTime, inputText, onSeek, setTimeDisplayMethod, startTime, timeDisplayMethod, timezone]);

  useEffect(() => {
    // If user submits an empty input field or resumes playback, clear error state and show current timestamp
    if (hasError && (!inputText?.length || isPlaying)) {
      setIsEditing(false);
      setHasError(false);
    }
  }, [hasError, inputText, isPlaying]);

  return (
    <Flex start style={{ maxWidth: `${MAX_WIDTH}px`, alignItems: "center", marginLeft: "8px" }}>
      {currentTime ? (
        isEditing ? (
          <form onSubmit={onSubmit} style={{ width: "100%" }}>
            <SInput
              ref={timestampInputRef}
              data-test="PlaybackTime-text"
              style={hasError ? { border: `1px solid ${colors.RED}` } : {}}
              value={inputText}
              autoFocus
              onFocus={(e) => e.target.select()}
              onBlur={onSubmit}
              onChange={({ target: { value } }) => setInputText(value)}
            />
          </form>
        ) : (
          <STimestamp
            data-test="PlaybackTime-text"
            onClick={() => {
              onPause();
              setIsEditing(true);
              setInputText(currentTimeString);
            }}>
            {currentTimeString}
          </STimestamp>
        )
      ) : (
        <span data-test="PlaybackTime-text">{ndash}</span>
      )}
      <Dropdown
        position="above"
        value={timeDisplayMethod}
        menuStyle={{
          width: `${MAX_WIDTH - 45}px`,
          marginLeft: currentTime ? `-${MAX_WIDTH - 90}px` : `-${MAX_WIDTH - 90}px`,
        }}
        text={timeDisplayMethod}
        onChange={(val) => setTimeDisplayMethod(val)}
        btnClassname={styles.timeDisplayMethodButton}>
        <span key="day" value="TOD">
          Time of day (TOD)
        </span>
        <span key="ros" value="ROS">
          ROS time
        </span>
      </Dropdown>
    </Flex>
  );
};

export default PlaybackTimeDisplayMethod;
