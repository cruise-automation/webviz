// @flow
//
//  Copyright (c) 2020-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import child_process from "child_process";
import util from "util";

const exec = util.promisify(child_process.exec);

type GifOptions = {
  fps: number,
};

const DEFAULT_OPTIONS: GifOptions = {
  fps: 12,
};

const PALETTE_PATH = "palette.png";

async function convertVideoToGif(inputVideoPath: string, outputGifPath: string, options?: GifOptions) {
  const { fps } = options || DEFAULT_OPTIONS;
  const filters = `fps=${fps}`;

  console.log(`Generating palette from video '${inputVideoPath}'...`);
  await exec(
    [
      `ffmpeg -y`, //
      `-i ${inputVideoPath}`,
      `-filter_complex "${filters},palettegen"`,
      `${PALETTE_PATH}`,
    ].join(" ")
  );

  console.log(`Converting video '${inputVideoPath}' to gif '${outputGifPath}'...`);
  await exec(
    [
      `ffmpeg -y`,
      `-i ${inputVideoPath}`,
      `-i ${PALETTE_PATH}`,
      `-filter_complex "${filters},paletteuse"`,
      `${outputGifPath}`,
    ].join(" ")
  );
  console.info(`Gif saved at ${outputGifPath}`);
}

export default convertVideoToGif;
