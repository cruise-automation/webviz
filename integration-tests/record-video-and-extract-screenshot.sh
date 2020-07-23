#!/usr/bin/env bash
set -euo pipefail

# Per https://stackoverflow.com/a/16349776
cd "${0%/*}/.."

# Make sure the __screenshots__ directory exists.
mkdir -p __screenshots__/

# We assume that `npm run bootstrap` and `npm run build` have run already, so just do the
# static build and run the server in the background.
npm run build-static-webviz
npm run serve-static-webviz &

# Actually record the video!
packages/webviz-core/script/record-local-bag-video.js --bag packages/webviz-core/public/fixtures/example.bag --layout integration-tests/video-recording-layout.json --out ./temp.mp4 --url http://localhost:8080/ --framerate 1

# Extract a single frame at a fixed timestamp, and put it in the __screenshots__ folder,
# so it will be shown by reg-suit.
ffmpeg -y -i temp.mp4 -ss 00:00:05 -vframes 1 __screenshots__/record-video-single-frame.png
