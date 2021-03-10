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
  scale: number,
};

const DEFAULT_OPTIONS: GifOptions = {
  fps: 12,
  scale: 1,
};

async function convertVideoToGif(inputVideoPath: string, outputGifPath: string, options?: GifOptions) {
  const { fps, scale } = options || DEFAULT_OPTIONS;

  console.log(`Converting video '${inputVideoPath}' to gif '${outputGifPath}'...`);
  await exec(
    [
      `ffmpeg`,
      // TODO: Support creating a gif for only a portion of the video
      // `-ss 61.0`, // start the gif this many seconds into the video
      // `-t 2.5`, // duration of gif in seconds
      `-i ${inputVideoPath}`,
      `-filter_complex "[0:v] fps=${fps},scale=iw*${scale}:-1,split [a][b];[a] palettegen [p];[b][p] paletteuse"`,
      ` ${outputGifPath}`,
    ].join(" ")
  );
  console.info(`Gif saved at ${outputGifPath}`);
}

export default convertVideoToGif;
