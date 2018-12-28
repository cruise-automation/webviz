webviz is a collection of packages for visualizing 2D and 3D views on the web.

- regl-worldview: React library for rendering 2D and 3D scenes using [regl](https://github.com/regl-project/regl).
- react-key-listener: React component for handling keyboard events, without interfering with editable fields and buttons.
- @cruise-automation/button: Button component that supports animated progress for destructive actions, "pulse" animation, and Bulma classes.
- @cruise-automation/tooltip: React component using [popper.js](https://popper.js.org/) to add rich, customizable tooltips to DOM elements.

## Documentation

Visit [docs page](https://cruise-automation.github.io/webviz/) to see more guides, examples and APIs.

## Developing

- `npm run bootstrap` in the root directory to install dependencies
- `npm run build` to run a single build or `npm run watch` to watch and build
- `npm run storybook` in the root directory to run storybook
- `npm run docs` to run the docs app

## Flow

- `npm run flow` to run Flow.
- `npm run flow-typed-rebuild` to update the flow-typed definitions (any time when changing packages).

## Testing

- `npm test` in the root directory which will trigger jest to run in each package

## Publishing

- `npm run publish` in the root directory

## Contributing

PRs and bug reports are welcome!
