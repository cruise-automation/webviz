# Webviz Zipline fork

This is a fork of the [Webviz project](https://github.com/cruise-automation/webviz), modified for use with ITC files. We can also extend it with other Zipline-specific functionality later.

This is a pure frontend application, and is therefore hosted directly on Github Pages, from the `gh-pages` branch.

To develop locally:
- `npm run bootstrap`
- `npm run webviz-dev`

To then publish it to Github Pages:
- `npm run build-static-webviz`
- `npm run serve-static-webviz` (to verify)
- `npm run publish-zipline`
