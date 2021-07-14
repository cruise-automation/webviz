const webpack = require("webpack");

const webpackConfig = require("../webpack.config");

// Return function per https://storybook.js.org/configurations/custom-webpack-config/#full-control-mode
module.exports = ({ config, mode }) => ({
  ...config,
  node: webpackConfig.node,
  module: webpackConfig.module,
  resolve: webpackConfig.resolve,
  output: { ...config.output, globalObject: "this" }, // Workaround for https://github.com/webpack/webpack/issues/6642#issuecomment-370222543
  plugins: [
    ...config.plugins,
    new webpack.DefinePlugin({
      RAVEN_URL: JSON.stringify(undefined),
      GIT_INFO: JSON.stringify({ hash: "xxxxxx" }),
      CURRENT_VERSION: JSON.stringify(undefined),
    }),
  ],
});
