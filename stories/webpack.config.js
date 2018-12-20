const webpackConfig = require("../webpack.config");

// Return function per https://storybook.js.org/configurations/custom-webpack-config/#full-control-mode
module.exports = (storybookBaseConfig, configType) => ({
  ...storybookBaseConfig,
  node: webpackConfig.node,
  module: webpackConfig.module,
  resolve: webpackConfig.resolve,
});
