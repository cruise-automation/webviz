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

require("@babel/register")();
const measurePerformance = require("../shared/measurePerformance").default;
const aggregateStats = require("../src/util/aggregateStats").default;

function parseFileString(string) {
  const resolvedPath = path.resolve(string);
  if (!fs.existsSync(resolvedPath)) {
    throw new Error(`File not found: ${string}`);
  }
  return resolvedPath;
}

function parsePositiveNumber(string) {
  const number = parseFloat(string);
  if (isNaN(number) || number <= 0) {
    throw new Error("Must be a positive number");
  }
  return number;
}

program
  .option("--bag <path>", "Input .bag file", parseFileString)
  .option("--urlParams <string>", "Additional URL params")
  .option("--layout <path>", "Input layout .json file", parseFileString)
  .option("--framerate <number>", "Framerate to run at (FPS)", parsePositiveNumber)
  .option(
    "--runs <number>",
    "Number of times to run performance measurements. Measurements are averaged together.",
    parsePositiveNumber
  )
  .option("--speed <number>", "Speed to play back bag at", parsePositiveNumber)
  .option("--testName <string>", "A descriptor of the kind of test you are running")
  .option("--experimentalFeatureSettings <string>", "Experimental feature settings in JSON")
  .option("--url <url>", "Base URL", "https://webviz.io/app")
  .parse(process.argv);

if (!program.testName) {
  throw new Error("Please describe the test you are running with the parameter '--testName'");
}

if (!program.bag && !program.urlParams) {
  throw new Error("One of bag or urlParams must be specified");
}

function buildUrl() {
  let url = `${program.url}?performance-measuring-mode`;
  if (program.bag) {
    // Do nothing.
  } else if (program.urlParams) {
    url += `&${program.urlParams}`;
  }

  if (program.framerate) {
    url += `&performance-measuring-framerate=${program.framerate}`;
  }
  if (program.speed) {
    url += `&performance-measuring-speed=${program.speed}`;
  }
  return url;
}

async function main() {
  const url = buildUrl();
  const numberOfRuns = program.runs || 1;
  const runOutput = [];
  for (let i = 0; i < numberOfRuns; i++) {
    runOutput.push(
      await measurePerformance({
        bagPath: program.bag,
        url,
        panelLayout: program.layout ? JSON.parse(fs.readFileSync(program.layout)) : {},
        experimentalFeatureSettings: program.experimentalFeatureSettings
          ? program.experimentalFeatureSettings
          : undefined,
      })
    );
  }

  const stats = runOutput.map(({ stats: eachStats }) => eachStats);

  if (numberOfRuns > 1) {
    console.log("Final stats, unaggregated:");
    console.log(JSON.stringify(stats));
    console.log("Final stats, aggregated:");
    console.log(JSON.stringify(aggregateStats(stats), null, 2));
  } else {
    console.log("Final stats:");
    console.log(JSON.stringify(stats[0], null, 2));
  }

  const commit = child_process.execSync("git rev-parse HEAD | head -c 8").toString();
  const filename = `${program.testName}_${commit}_${new Date().toJSON()}`;

  const statsDir = `${__dirname}/stats`;
  if (!fs.existsSync(statsDir)) {
    fs.mkdirSync(statsDir);
  }
  const logsDir = `${__dirname}/logs`;
  if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir);
  }

  console.log("Writing browser logs...");
  const logFilePaths = [];
  for (let i = 0; i < runOutput.length; i++) {
    const { logs } = runOutput[i];
    const logLocation = `${logsDir}/${filename}_${i}.txt`;
    fs.writeFileSync(logLocation, logs.join("\n"));
    logFilePaths.push(logLocation);
  }

  console.log(`Writing stats to ${statsDir}/${filename}.json`);
  const dataToWrite = {
    testName: program.testName,
    arguments: program.opts(),
    commit,
    aggregatedStats: aggregateStats(stats),
    stats,
    logFilePaths,
  };
  fs.writeFileSync(`${statsDir}/${filename}.json`, JSON.stringify(dataToWrite, null, 2));

  process.exit(0);
}

main().catch((err) => {
  console.error("Measure performance failed:", err);
  process.exit(1);
});
