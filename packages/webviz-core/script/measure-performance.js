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
const _ = require("lodash");
const path = require("path");

require("@babel/register")();
const delay = require("../shared/delay").default;
const measurePlaybackPerformance = require("../shared/measurePlaybackPerformance").default;
const { withBrowser, runInPage } = require("../shared/runInBrowser");
const aggregateStats = require("../src/util/aggregateStats").default;

function parseFileString(string) {
  const resolvedPath = path.resolve(string);
  if (!fs.existsSync(resolvedPath)) {
    throw new Error(`File not found: ${string}`);
  }
  return resolvedPath;
}

function parseFileStringList(string) {
  return string.split(",").map(parseFileString);
}

function parsePositiveNumber(string) {
  const number = parseFloat(string);
  if (isNaN(number) || number <= 0) {
    throw new Error("Must be a positive number");
  }
  return number;
}

program
  .option("--mode <string>", "Type of performance to measure: 'playback' or 'load'", "playback")
  .option("--bag <path>", "Input .bag files, separated by commas", parseFileStringList)
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
  .option("--experimentalFeaturesSettings <string>", "Experimental feature settings in JSON")
  .option("--url <url>", "Base URL", "https://webviz.io/app")
  .option("--waitForEventName <event>", "Recording stops when this event is seen", "perf.playback.time_to_first_msgs")
  .parse(process.argv);

if (!program.testName) {
  throw new Error("Please describe the test you are running with the parameter '--testName'");
}

if (!program.bag && !program.urlParams) {
  throw new Error("One of bag or urlParams must be specified");
}

if (!["playback", "load"].includes(program.mode)) {
  throw new Error("You must include a mode '--mode'");
}

function buildUrl() {
  let url = `${program.url}?measure-${program.mode}-performance-mode`;

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

async function doPlaybackPerformanceMeasurements() {
  const url = buildUrl();
  const numberOfRuns = program.runs || 1;
  const runsOutput = [];
  for (let i = 0; i < numberOfRuns; i++) {
    runsOutput.push(
      await measurePlaybackPerformance({
        filePaths: program.bag,
        url,
        panelLayout: program.layout ? JSON.parse(fs.readFileSync(program.layout)) : {},
        experimentalFeaturesSettings: program.experimentalFeaturesSettings
          ? program.experimentalFeaturesSettings
          : undefined,
      })
    );
  }
  return runsOutput;
}

async function measureLoadPerformanceRun({ url, browser, layoutOptions, pageOptions, onBeforeUnloadPage }) {
  const runMetrics = {};
  const testTimeout = 120000;
  const runStartEpoch = Date.now();

  let timeoutCount = 0;
  return runInPage(
    async (page) => {
      let runtimeMs = 0;

      // Loop until we see the event or timeout
      while (runMetrics[program.waitForEventName] === undefined) {
        // Print a dot every so often as a sign of life
        process.stdout.write(".");
        await delay(500);

        runtimeMs = Date.now() - runStartEpoch;
        if (runtimeMs > testTimeout) {
          const errorText = `Timeout waiting for event, '${program.waitForEventName}'`;
          console.error(errorText);
          if (timeoutCount++ >= 3) {
            throw new Error("Too many timeouts in a row. Failing!");
          }
          return { stats: runMetrics, logs: [], errors: [errorText] };
        }
      }
      process.stdout.write("\n");

      if (onBeforeUnloadPage) {
        await onBeforeUnloadPage(page);
      }
      return { stats: runMetrics, logs: [], errors: [] };
    },
    {
      browser,
      beforeLoad: async ({ page }) => {
        await page.exposeFunction("onRecordMetric", ({ name, value }) => (runMetrics[name] = value), []);
      },
      pageLoadTimeout: testTimeout,
      layoutOptions,
      pageOptions,
      url,
    }
  );
}

async function recordNetworkActivity(page) {
  console.log("Recording all network traffic to replay for subsequent runs...");
  await page.evaluate(() => window.polly.stop());
  await delay(1000);
}

async function doLoadPerformanceMeasurements() {
  const url = buildUrl();
  const runsOutput = [];
  const numberOfRuns = program.runs || 1;

  console.log(`=== Starting up Polly server to record network activity...`);
  const pollyProccess = child_process.spawn(
    "./node_modules/.bin/polly",
    "listen --port 3010 --recordings-dir /tmp/__pollyRecordings".split(" "),
    // Redirect all output and errors to the current process so we can see them
    { stdio: [process.stdout, process.stderr, "ipc"] }
  );
  pollyProccess.on("exit", (code, signal) => {
    console.log("polly process exited with " + `code ${code} and signal ${signal}`);
  });
  await delay(1000);

  try {
    await withBrowser(
      async (browser) => {
        for (let i = 0; i < numberOfRuns + 1; i++) {
          const isWarmupRun = i === 0;
          if (isWarmupRun) {
            console.log(`=== Preparing for first run...`);
          } else {
            console.log(`=== Starting run #${i}`);
          }

          const runStats = await measureLoadPerformanceRun({
            url,
            browser,
            pageOptions: {
              onLog: _.noop,
              onError: _.noop,
              captureLogs: false,
            },
            layoutOptions: {
              bagPath: program.bag,
              panelLayout: program.layout ? JSON.parse(fs.readFileSync(program.layout)) : {},
              experimentalFeaturesSettings: program.experimentalFeaturesSettings
                ? program.experimentalFeaturesSettings
                : undefined,
            },
            onBeforeUnloadPage: isWarmupRun ? recordNetworkActivity : null,
          });
          runsOutput.push(runStats);
        }
      },
      {
        dimensions: { width: 1920, height: 1080 },
        loadBrowserTimeout: 180000,
      }
    );
  } catch (e) {
    throw e;
  } finally {
    console.log(`=== Polly server terminated`);
    pollyProccess.kill("SIGINT");
  }

  // Throw out the first result to account for webpack bundle caching
  return runsOutput.slice(1);
}

function processOutput(mode, runsOutput) {
  const stats = runsOutput.map(({ stats: eachStats }) => eachStats);

  if (runsOutput.length > 1) {
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
  for (let i = 0; i < runsOutput.length; i++) {
    const { logs = [] } = runsOutput[i];
    const logLocation = `${logsDir}/${filename}_${i}.txt`;
    fs.writeFileSync(logLocation, logs.join("\n"));
    logFilePaths.push(logLocation);
  }

  console.log(`Writing stats to ${statsDir}/${filename}.json`);
  const dataToWrite = {
    mode,
    testName: program.testName,
    arguments: program.opts(),
    commit,
    aggregatedStats: aggregateStats(stats),
    stats,
    logFilePaths,
  };
  fs.writeFileSync(`${statsDir}/${filename}.json`, JSON.stringify(dataToWrite, null, 2));
}

async function main() {
  let runsOutput;
  if (program.mode === "playback") {
    runsOutput = await doPlaybackPerformanceMeasurements();
  } else if (program.mode === "load") {
    runsOutput = await doLoadPerformanceMeasurements();
  }

  processOutput(program.mode, runsOutput);
  process.exit(0);
}

main().catch((err) => {
  console.error("Measure performance failed:", err);
  process.exit(1);
});
