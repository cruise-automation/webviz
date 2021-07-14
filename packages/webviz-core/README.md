# webviz-core

This is the open source version of Webviz, the browser-based rosbag analysis tool.

Run `npm run docs` and then browse to http://localhost:8080/try. After a few moments the ui will load and bag files can be dragged in to be loaded. 

This directory gets synced from a Cruise-internal directory into
[http://github.com/cruise-automation/webviz/packages/webviz](http://github.com/cruise-automation/webviz/packages/webviz) and is hosted at
[https://cruise-automation.github.io/webviz](https://cruise-automation.github.io/webviz/).

If you're a Cruise employee, please make PRs against our internal repository
directly. If not, please make a PR here as usual, but bear in mind we will have
to test your changes against our internal version too.

In the future we should disentangle this, and provide a public API for
customizing webviz-core.
