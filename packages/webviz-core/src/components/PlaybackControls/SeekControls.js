// @flow
//
//  Copyright (c) 2021-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.
import RefreshIcon from "@mdi/svg/svg/refresh.svg";
import classnames from "classnames";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import type { Time } from "rosbag";

import styles from "./index.module.scss";
import Button from "webviz-core/src/components/Button";
import Icon from "webviz-core/src/components/Icon";
import KeyListener from "webviz-core/src/components/KeyListener";
import {
  ARROW_SEEK_TYPES,
  ARROW_SEEK_MS,
  ARROW_LABELS_BY_VALUE,
  DIRECTION,
  getSeekType,
  type SeekType,
} from "webviz-core/src/components/PlaybackControls/sharedHelpers";
import { Select, Option } from "webviz-core/src/components/Select";
import { useShallowMemo } from "webviz-core/src/util/hooks";
import { logBatchedEventTotals } from "webviz-core/src/util/logBatchedEvents.js";
import { getEventTags, getEventInfos, logEventAction } from "webviz-core/src/util/logEvent";
import { toMillis, fromMillis, getNextFrame } from "webviz-core/src/util/time";

const cx = classnames.bind(styles);
export type SeekControlsProps = {|
  hasActiveData: boolean,
  seek: (Time) => void,
  currentTime?: Time,
  timestamps?: string[],
|};

const SeekControls = ({ hasActiveData, seek, currentTime, timestamps }: SeekControlsProps) => {
  const hasTimestamps = !!timestamps?.length;
  // overall value based on mod keys and selection
  const [seekValue, setSeekValue] = useState<SeekType>(ARROW_SEEK_TYPES.DEFAULT);
  // user's selected preference from dropdown
  const [selectedSeekValue, setSelectedSeekValue] = useState<SeekType>(ARROW_SEEK_TYPES.DEFAULT);

  // Timestamps load after the component, so this sets the default dropdown state if they show up
  useEffect(() => {
    setSeekValue(hasTimestamps ? ARROW_SEEK_TYPES.TICKS : ARROW_SEEK_TYPES.DEFAULT);
    setSelectedSeekValue(hasTimestamps ? ARROW_SEEK_TYPES.TICKS : ARROW_SEEK_TYPES.DEFAULT);
  }, [hasTimestamps]);

  const selectOptions = useMemo(() => {
    const options = Object.keys(ARROW_SEEK_MS)
      .filter((key) => hasTimestamps || key !== ARROW_SEEK_TYPES.TICKS) // only show Ticks option if there are timestamps
      .map((key) => (
        <Option value={key} key={key}>
          {ARROW_LABELS_BY_VALUE[key]}
        </Option>
      ));

    return options;
  }, [hasTimestamps]);

  const jumpSeek = useCallback((directionSign: $Values<typeof DIRECTION>, value: SeekType) => {
    if (!hasActiveData || !currentTime || currentTime.sec === null) {
      return;
    }

    // If timestamps exist and are selected as the seek value, seek to the previous/next timestamp
    if (value === ARROW_SEEK_TYPES.TICKS) {
      const isPrev = directionSign === DIRECTION.BACKWARD;
      const newTime = getNextFrame(currentTime, timestamps, isPrev);
      if (newTime) {
        seek(newTime);
      }
      // else, seek forward/backward in time
    } else {
      const timeMs = toMillis(currentTime);
      const deltaMs = ARROW_SEEK_MS[value];
      seek(fromMillis(timeMs + deltaMs * directionSign));
    }
  }, [seek, currentTime, hasActiveData, timestamps]);

  const handleSeek = useCallback((directionSign: $Values<typeof DIRECTION>) => {
    logBatchedEventTotals(
      "action",
      "SEEK_RELATIVE",
      {
        [getEventTags().FROM]: "Click",
        [getEventTags().TYPE]: ARROW_LABELS_BY_VALUE[seekValue],
        [getEventTags().DESTINATION]: directionSign === DIRECTION.FORWARD ? "Forward" : "Backward",
      },
      {
        [getEventTags().SIZE]: 1,
      }
    );
    jumpSeek(directionSign, seekValue);
  }, [jumpSeek, seekValue]);

  const handleChange = useCallback((value) => {
    logEventAction(getEventInfos().CHANGE_SEEK_DEFAULT, {
      [getEventTags().SIZE]: ARROW_LABELS_BY_VALUE[value],
    });
    setSelectedSeekValue(value);
    setSeekValue(value);
  }, []);

  const getSeekValue = useCallback((ev: KeyboardEvent) => {
    const seekType: $Keys<typeof ARROW_SEEK_MS> = getSeekType(ev);

    if (selectedSeekValue === ARROW_SEEK_TYPES.TICKS && seekType === ARROW_SEEK_TYPES.DEFAULT) {
      return ARROW_SEEK_TYPES.TICKS;
    }
    return seekType;
  }, [selectedSeekValue]);

  const modKeyHandler = useCallback((ev: KeyboardEvent) => setSeekValue(getSeekValue(ev)), [getSeekValue]);
  const modKeyHandlers = useShallowMemo({
    Shift: modKeyHandler,
    Meta: modKeyHandler,
    Alt: modKeyHandler,
    Control: modKeyHandler,
  });

  // Todo: Combine this with click handler. Currently having issues testing key events with modifier keys.
  // It's better to have this duplicated and tested than DRY and untested.
  const keyHandler = useCallback((ev: KeyboardEvent, direction) => {
    logBatchedEventTotals(
      "action",
      "SEEK_RELATIVE",
      {
        [getEventTags().FROM]: "Keydown",
        [getEventTags().TYPE]: ARROW_LABELS_BY_VALUE[getSeekValue(ev)],
        [getEventTags().DESTINATION]: direction === DIRECTION.FORWARD ? "Forward" : "Backward",
      },
      {
        [getEventTags().SIZE]: 1,
      }
    );

    jumpSeek(direction, getSeekValue(ev));
  }, [getSeekValue, jumpSeek]);

  const keyHandlers = useMemo(
    () => ({
      ArrowLeft: (ev: KeyboardEvent) => keyHandler(ev, DIRECTION.BACKWARD),
      ArrowRight: (ev: KeyboardEvent) => keyHandler(ev, DIRECTION.FORWARD),
    }),
    [keyHandler]
  );

  const keyDownHandlers = useShallowMemo({
    ...modKeyHandlers,
    ...keyHandlers,
  });

  return (
    <div className={styles.seekControls}>
      <KeyListener global keyDownHandlers={keyDownHandlers} keyUpHandlers={modKeyHandlers} />
      <Button
        onClick={() => handleSeek(DIRECTION.BACKWARD)}
        dataTestId="seek-backwards"
        disabled={!hasActiveData}
        className={cx([styles.seekBtn, styles.leftSeekBtn])}>
        <Icon
          medium
          tooltip="Seek backwards"
          style={{
            transform: "scaleX(-1)",
          }}>
          <RefreshIcon />
        </Icon>
      </Button>
      <div className={styles.seekSelect}>
        <Select
          onChange={handleChange}
          value={seekValue}
          text={ARROW_LABELS_BY_VALUE[seekValue]}
          fromBelow
          disabled={!hasActiveData}
          dataTestId="seek-select">
          {selectOptions}
        </Select>
      </div>
      <Button
        onClick={() => handleSeek(DIRECTION.FORWARD)}
        dataTestId="seek-forwards"
        disabled={!hasActiveData}
        className={cx([styles.seekBtn, styles.rightSeekBtn])}>
        <Icon medium tooltip="Seek forwards">
          <RefreshIcon />
        </Icon>
      </Button>
    </div>
  );
};

export default SeekControls;
