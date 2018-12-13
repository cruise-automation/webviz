webviz is a collection of packages for visualizing 2D and 3D views on the web.

- regl-worldview: a react library for rendering 2D and 3D views using [regl](https://github.com/regl-project/regl).

## Documentation

## Developing

- `npm run bootstrap` in the root directory to install dependencies
- `npm run build` to run a single build or `npm run watch` to watch and build
- `npm run storybook` in the root directory to run storybook
- `npm run docs` to run the docs app

## Flow

- `npm flow-mono` to set up symlink for flow (reload the editor or recompile the component package if flow can not locate the module)
- `npm flow-mono-install` to update local flow-typed cache and parallel install in all packages

## Testing

- `npm test` in the root directory which will trigger jest to run in each package

## Publishing

- `lerna run publish` in the root directory

## Contributing

PRs and bug reports are welcome!
