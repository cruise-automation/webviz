const path = require("path");
const webpack = require("webpack");

const webpackConfig = require("../webpack.config");

// Return function per https://storybook.js.org/configurations/custom-webpack-config/#full-control-mode
module.exports = (storybookBaseConfig, configType) => ({
  ...storybookBaseConfig,
  node: webpackConfig.node,
  module: webpackConfig.module,
  resolve: {
    ...webpackConfig.resolve,
    modules: [path.resolve("."), path.resolve(`${__dirname}/packages`), "node_modules"],
  },
  output: { ...storybookBaseConfig.output, globalObject: "this" }, // Workaround for https://github.com/webpack/webpack/issues/6642#issuecomment-370222543
  plugins: [
    ...storybookBaseConfig.plugins,
    new webpack.DefinePlugin({
      RAVEN_URL: JSON.stringify(undefined),
      GIT_INFO: JSON.stringify({ hash: "xxxxxx" }),
      CURRENT_VERSION: JSON.stringify(undefined),
    }),
  ],
});
