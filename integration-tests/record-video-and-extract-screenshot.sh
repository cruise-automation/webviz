#!/usr/bin/env bash
set -euo pipefail

# Per https://stackoverflow.com/a/16349776
cd "${0%/*}/.."

npm run build-static-webviz
npm run serve-static-webviz &
packages/webviz-core/script/record-local-bag-video.js --bag packages/webviz-core/public/fixtures/example.bag --layout integration-tests/video-recording-layout.json --out ./temp.mp4 --url http://localhost:8080/ --framerate 1
mkdir -p __screenshots__/
ffmpeg -y -i temp.mp4 -ss 00:00:05 -vframes 1 __screenshots__/record-video-single-frame.png
