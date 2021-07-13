// @flow
//
//  Copyright (c) 2021-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.
import audioBufferToWav from "audiobuffer-to-wav";

import { DEFAULT_SAMPLE_VALUE } from "./index";
import type { RosDatatypes } from "webviz-core/src/types/RosDatatypes";
import { isNumberType } from "webviz-core/src/util/binaryObjects/messageDefinitionUtils";

export type AudioSample = number[];

export type AudioFrame = {
  channels: $ReadOnlyArray<number>,
};

export const isAudioDatatype = (typeName: string, datatypes: RosDatatypes) => {
  const datatype = datatypes[typeName];
  if (datatype == null) {
    return false;
  }
  return (
    datatype.fields.some(({ name, type }) => name === "sampling_rate_hz" && isNumberType(type)) &&
    datatype.fields.some(({ name, isArray }) => name === "frames" && isArray) &&
    datatype.fields.some(({ name }) => name === "header")
  );
};

type Bound = {
  min: number,
  max: number,
  missingData: boolean,
};

type WaveformConfig = {
  color: string,
  playedColor: string,
  missingDataColor: string,
  activeChannelColor: string,
  activeChannelPlayedColor: string,
  markerColor: string,
  pointWidth: number,
  heightScaleFactor: number,
  multiChannelHeightScaleFactor: number,
};

// convert the frame data we got from ROS messages to audio samples
export function generateSamplesFromFrames(frames: $ReadOnlyArray<AudioFrame>): AudioSample[] {
  const samples = new Array(frames[0].channels.length).fill().map(() => []);
  for (let i = 0; i < frames.length; i++) {
    const channels = frames[i].channels;
    for (let c = 0; c < channels.length; c++) {
      // scale the AudioFrame which is formatted as int32 to [-1, 1]
      // by dividing by 2**31
      samples[c].push(channels[c] / 2147483648);
    }
  }
  return samples;
}

export function generateAudioBuffersFromSample(
  samples: AudioSample[],
  selectedChanel: number,
  showAllChannels: boolean,
  audioContext: AudioContext,
  samplingRate: number
): AudioBuffer[] {
  const samplesAlt = showAllChannels ? samples : [samples[selectedChanel]];
  return samplesAlt.map((sample) => {
    // left and right output will have the data from the same selected channel
    const newBuffer = audioContext.createBuffer(1, sample.length, samplingRate);
    const floatArray = Float32Array.from(sample);
    newBuffer.copyToChannel(floatArray, 0, 0);
    return newBuffer;
  });
}

// Get the min and max value of an array, more performant to use for loop.
// Mark the bound as missing data if both min and max are equal DEFAULT_SAMPLE_VALUE.
function getBound(values) {
  let min = Infinity;
  let max = -Infinity;
  for (let i = 0; i < values.length; i++) {
    const value = values[i];
    min = value > min ? min : value;
    max = value < max ? max : value;
  }
  return { min, max, missingData: min === DEFAULT_SAMPLE_VALUE && max === DEFAULT_SAMPLE_VALUE };
}

// calculate the bounds of each step in the buffer
function getBoundArray(wave: Float32Array, pointCount: number, step: number): Bound[] {
  const bounds = [];
  for (let i = 0; i < pointCount; i++) {
    // get the max and min values at this step
    bounds.push(getBound(wave.slice(i * step, i * step + step)));
  }
  return bounds;
}

// generate wave data based on the audio buffer, canvas width and pointWidth
export function calculateWaveformData(buffer: ?AudioBuffer, width: number, pointWidth: number): Bound[] {
  if (!buffer) {
    return [];
  }
  const wave = buffer.getChannelData(0);
  const pointCount = width / pointWidth;
  // total steps we are drawing
  const step = Math.ceil(wave.length / pointCount);
  // get the bounds (min and max) for each step
  return getBoundArray(wave, pointCount, step);
}

// draw the waveform points
function drawPoints({
  ctx,
  color,
  missingDataColor,
  bounds,
  maxAmp,
  offsetX,
  offsetY,
  pointWidth,
  heightScaleFactor,
}: {|
  ctx: CanvasRenderingContext2D,
  color: string,
  missingDataColor: string,
  bounds: Bound[],
  maxAmp: number,
  offsetX: number,
  offsetY: number,
  pointWidth: number,
  heightScaleFactor: number,
|}) {
  ctx.fillStyle = color;

  for (let i = 0; i < bounds.length; i++) {
    const bound = bounds[i];
    const x = i * pointWidth + offsetX;
    const y = (1 + bound.min) * maxAmp + offsetY;
    const fillStyle = bound.missingData ? missingDataColor : color;
    if (ctx.fillStyle !== fillStyle) {
      ctx.fillStyle = fillStyle;
    }
    const height = Math.max(1, (bound.max - bound.min) * maxAmp);
    const offset = Math.floor(heightScaleFactor / 2);
    // draw a point, offset a little so the waveform looks centered vertically
    // the alternative is to draw: ctx.fillRect(x, y, width - 1, height);
    ctx.fillRect(x, y - height * offset, pointWidth - 1, height * heightScaleFactor);
  }
}

// draw the waveform on the provided canvas
export function drawWaveform(
  bounds: Bound[][],
  canvas: ?HTMLCanvasElement,
  waveformConfig: WaveformConfig,
  playedRatio: number = 0,
  selectedChanel: number = 0
) {
  if (!canvas || !bounds.length || !bounds[0].length) {
    return;
  }
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  const pointWidth = waveformConfig.pointWidth;
  const hasMultiWaveForms = bounds.length > 1;
  const heightScaleFactor = hasMultiWaveForms
    ? waveformConfig.multiChannelHeightScaleFactor
    : waveformConfig.heightScaleFactor;

  // find the max height we can draw
  const maxAmp = canvas.height / (2 * bounds.length);
  const maxPlayedBound = Math.ceil(bounds[0].length * playedRatio);
  const playedAll = maxPlayedBound === bounds[0].length;
  let playedBounds = [];
  let unplayedBounds = [];
  bounds.forEach((channelBounds, idx) => {
    if (playedAll) {
      playedBounds = channelBounds;
      unplayedBounds = [];
    } else if (maxPlayedBound === 0) {
      playedBounds = [];
      unplayedBounds = channelBounds;
    } else {
      playedBounds = channelBounds.slice(0, maxPlayedBound);
      unplayedBounds = channelBounds.slice(maxPlayedBound, channelBounds.length);
    }
    const useActiveChannelColor = (hasMultiWaveForms && selectedChanel === idx) || !hasMultiWaveForms;

    // set up drawing style for unplayed waveform
    const unplayedDrawColor = useActiveChannelColor ? waveformConfig.activeChannelColor : waveformConfig.color;
    const offsetX = playedBounds.length * pointWidth;
    drawPoints({
      ctx,
      color: unplayedDrawColor,
      missingDataColor: waveformConfig.missingDataColor,
      bounds: unplayedBounds,
      maxAmp,
      offsetX,
      offsetY: maxAmp * idx * 2,
      pointWidth,
      heightScaleFactor,
    });

    // set up drawing style for played waveform
    const playedDrawColor = useActiveChannelColor
      ? waveformConfig.activeChannelPlayedColor
      : waveformConfig.playedColor;
    drawPoints({
      ctx,
      color: playedDrawColor,
      missingDataColor: waveformConfig.missingDataColor,
      bounds: playedBounds,
      maxAmp,
      offsetX: 0,
      offsetY: maxAmp * idx * 2,
      pointWidth,
      heightScaleFactor,
    });
  });

  // draw the marker
  ctx.fillStyle = waveformConfig.markerColor;
  ctx.fillRect((playedBounds.length - 1) * pointWidth, 0, pointWidth, canvas.height);
}

export function bufferToFileBlob(buffer: AudioBuffer): Blob {
  const wav = audioBufferToWav(buffer, null);
  return new window.Blob([new DataView(wav)], { type: "audio/wav" });
}
