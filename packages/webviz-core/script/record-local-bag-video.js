#! /usr/bin/env node
//  Copyright (c) 2020-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

// Disable the header linter because we don't want Flow in this file, since nodejs
// doesn't understand that (even with @babel/register).
/* eslint-disable header/header */

const child_process = require("child_process");
const program = require("commander");
const fs = require("fs");
const path = require("path");
const rmfr = require("rmfr");
const util = require("util");

require("@babel/register")();
const { recordVideoAsBuffer } = require("../shared/recordVideo");

const exec = util.promisify(child_process.exec);

function parseFileString(string) {
  const resolvedPath = path.resolve(string);
  if (!fs.existsSync(resolvedPath)) {
    throw new Error(`File not found: ${string}`);
  }
  return resolvedPath;
}

function parseNonExistingFileString(string) {
  return path.resolve(string);
}

function parseNumber(string) {
  const speed = Number(string);
  if (speed <= 0) {
    throw new Error("Number has to be positive");
  }
  return speed;
}

program
  .option("--bag <path>", "Input .bag file", parseFileString)
  .option("--layout <path>", "Input layout .json file", parseFileString)
  .option("--mp3 <path>", "Input .mp3 file", parseFileString)
  .option("--out <path>", "Output .mp4 video file", parseNonExistingFileString)
  .option("--speed <number>", "Playback speed", parseNumber)
  .option("--framerate <number>", "Framerate", parseNumber)
  .option("--duration <number>", "Restrict the recording duration specified in milliseconds")
  .option("--width <number>", "Width", parseNumber)
  .option("--height <number>", "Height", parseNumber)
  .option("--parallel <number>", "Number of simultaneous browsers to use", parseNumber)
  .option("--frameless", "Hide Webviz 'chrome' around the panels")
  .option("--url <url>", "Base URL", "https://webviz.io/app")
  .option("--crop <string>", "Crop the video dimensions: '<width>:<height>:<left>:<top>'")
  .option(
    "--experimentalFeaturesSettings <string>",
    'Stringified JSON of experimental feature settings: \'{"featureName":"alwaysOn"}\''
  )
  .parse(process.argv);

async function main() {
  try {
    await exec(`ffmpeg -h`);
  } catch {
    throw new Error(
      "ffmpeg is not installed; please install it first using `apt-get install ffmpeg` or `brew install ffmpeg` or so."
    );
  }

  const {
    duration,
    speed,
    frameless,
    framerate,
    parallel,
    bag,
    url,
    experimentalFeaturesSettings,
    width,
    height,
    crop: cropStr,
  } = program;
  const crop =
    cropStr &&
    (() => {
      const [cropWidth, cropHeight, cropLeft, cropTop] = cropStr.split(":").map((s) => parseFloat(s) || 0);
      return { width: cropWidth, height: cropHeight, left: cropLeft, top: cropTop };
    })();

  console.log("Recording video...");
  const { mediaBuffer } = await recordVideoAsBuffer({
    duration,
    speed,
    frameless,
    framerate,
    parallel,
    bagPath: bag,
    experimentalFeaturesSettings,
    errorIsWhitelisted: () => true, // Ignore errors for local recordings
    url,
    crop,
    dimensions: width && height ? { width, height } : undefined,
    puppeteerLaunchConfig: { headless: !process.env.DEBUG_CI },
    panelLayout: program.layout ? JSON.parse(fs.readFileSync(program.layout).toString()) : null,
  });

  console.log("Saving video...");
  if (program.mp3) {
    const tmpVideoFile = `${__dirname}/tmp-video.mp4`;
    fs.writeFileSync(tmpVideoFile, mediaBuffer);

    await exec(`ffmpeg -y -i tmp-video.mp4 -i ${program.mp3} -vcodec copy -b:a 320k -shortest ${program.out}`, {
      cwd: __dirname,
    });

    await rmfr(tmpVideoFile);
  } else {
    fs.writeFileSync(program.out, mediaBuffer);
  }

  console.log("Done!");
  process.exit(0); // Sometimes NodeJS might still have open handlers for some reason; just quit.
}

main().catch((err) => {
  const errorString = err.stack || (err.toString && err.toString()) || err.message || err;
  console.error("Video generation failed:", errorString);
  process.exit(1);
});
