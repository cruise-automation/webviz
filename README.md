# [Webviz](https://webviz.io/) [![CircleCI](https://circleci.com/gh/cruise-automation/webviz.svg?style=svg)](https://circleci.com/gh/cruise-automation/webviz)

**Drag and drop your own bag files into [Webviz](https://webviz.io/try/) to explore your robotics data.**

**View a demo of Webviz in action [here](https://webviz.io/try/?demo).**

**Webviz** is a web-based application for playback and visualization of [ROS](http://www.ros.org/) [bag files](http://wiki.ros.org/Bags). This repository also contains some libraries that can be used independently to build web-based visualization tools.

- **webviz-core** ([homepage](https://webviz.io/), [tool](https://webviz.io/try), [github](https://github.com/cruise-automation/webviz/tree/master/packages/webviz-core)): A tool to inspect [ROS bags](http://wiki.ros.org/ROS/Tutorials/Recording%20and%20playing%20back%20data).
- **regl-worldview** ([homepage](https://webviz.io/worldview/), [npm](https://www.npmjs.com/package/regl-worldview), [github](https://github.com/cruise-automation/webviz/tree/master/packages/regl-worldview)): React library for rendering 2D and 3D scenes using [regl](https://github.com/regl-project/regl).
- **react-key-listener** ([npm](https://www.npmjs.com/package/react-key-listener), [github](https://github.com/cruise-automation/webviz/tree/master/packages/react-key-listener)): React component for handling keyboard events, without interfering with editable fields and buttons.
- **@cruise-automation/hooks** ([npm](https://www.npmjs.com/package/@cruise-automation/hooks), [github](https://github.com/cruise-automation/webviz/tree/master/packages/@cruise-automation/hooks)): A list of resusable React hooks.
- **@cruise-automation/button** ([npm](https://www.npmjs.com/package/@cruise-automation/button), [github](https://github.com/cruise-automation/webviz/tree/master/packages/@cruise-automation/button)): React button component that supports animated progress for destructive actions, "pulse" animation, and Bulma classes.
- **@cruise-automation/tooltip** ([npm](https://www.npmjs.com/package/@cruise-automation/tooltip), [github](https://github.com/cruise-automation/webviz/tree/master/packages/@cruise-automation/tooltip)): React component that uses [popper.js](https://popper.js.org/) to add rich, customizable tooltips to DOM elements.

Please see the individual package READMEs for details on how to install and use them.

## Developing

- `npm run bootstrap` in the root directory to install dependencies.
- `npm run docs` to run the docs app (e.g. go to http://localhost:8080/try to open Webviz).
- `npm run build` to run a single build or `npm run watch` to watch and build.
- `npm run storybook` to run storybook.
- `npm run screenshot-debug` to generate screenshots from stories.
- `npm run lint` to run the linters (and `npm run lint:fix` to automatically fix issues).
- `npm run flow` to run Flow.
- `npm run flow-typed-rebuild` to update the flow-typed definitions (any time when changing packages).
- `npm test` to run tests.

If you have the right permissions, you can publish:

- `npm run publish` to publish npm packages.
- `npm run docs-deploy` to deploy that statically hosted website (this is also done automatically in CI on the master branch).

## Contributing

PRs, bug reports, and feature requests are welcome! Please observe [CONTRIBUTING.md](CONTRIBUTING.md) and [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) when making a contribution.
