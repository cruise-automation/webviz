//  Copyright (c) 2018-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

const CaseSensitivePathsPlugin = require("case-sensitive-paths-webpack-plugin");
const path = require("path");
const TerserPlugin = require("terser-webpack-plugin");
const webpack = require("webpack");

module.exports = {
  devtool: "cheap-module-eval-source-map",
  entry: {
    docs: "./docs/src/index.js",
  },
  output: {
    path: path.resolve(`${__dirname}/docs/public/dist`),
    publicPath: "/dist/",
    pathinfo: true,
    filename: "[name].js",
    devtoolModuleFilenameTemplate: (info) => path.resolve(info.absoluteResourcePath),
  },
  resolve: {
    modules: [path.resolve(`${__dirname}/packages`), "node_modules"],
    extensions: [".js"],
    // Doesn't work properly with linked packages, see
    // https://webpack.js.org/configuration/resolve/#resolve-symlinks
    // and https://github.com/webpack/webpack/issues/1866
    symlinks: false,
  },
  module: {
    strictExportPresence: true,
    rules: [
      {
        test: /\.worker\.js$/,
        use: {
          loader: "worker-loader",
          options: { name: "[name].[ext]?[hash]" },
        },
      },
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: { loader: "babel-loader?cacheDirectory" },
      },
      { test: /\.mdx$/, use: ["babel-loader?cacheDirectory", "@mdx-js/loader"] },
      { test: /\.md$/, loader: "raw-loader" },
      { test: /\.svg$/, loader: "react-svg-loader" },
      { test: /\.ne$/, loader: "nearley-loader" },
      { test: /\.(png|jpg|gif)$/i, use: [{ loader: "url-loader", options: { limit: 8192 } }] },
      { test: /\.s?css$/, loader: "style-loader", options: { singleton: true } },
      {
        test: /\.s?css$/,
        oneOf: [
          {
            test: /\.module\./,
            loader: "css-loader",
            options: { localIdentName: "[path][name]-[sha512:hash:base32:5]--[local]", modules: true, sourceMap: true },
          },
          { loader: "css-loader", options: { sourceMap: true } },
        ],
      },
      {
        test: /\.s?css$/,
        loader: "postcss-loader",
        options: {
          ident: "postcss",
          sourceMap: true,
          plugins: () => [
            require("postcss-flexbugs-fixes"),
            require("autoprefixer")({
              browsers: [">1%", "last 4 versions", "Firefox ESR", "not ie < 9"],
              flexbox: "no-2009",
            }),
          ],
        },
      },
      { test: /\.scss$/, loader: "sass-loader", options: { sourceMap: true } },
      { test: /\.woff2?$/, loader: "url-loader" },
    ],
  },
  optimization: {
    // use Terser instead of Uglify for async iteration (`for await`) support
    minimizer: [
      new TerserPlugin({
        terserOptions: {
          mangle: false, // make error stack traces easier to read in production
        },
      }),
    ],
  },
  plugins: [
    new CaseSensitivePathsPlugin(),
    // https://github.com/jmblog/how-to-optimize-momentjs-with-webpack
    new webpack.IgnorePlugin(/^\.\/locale$/, /moment$/),
  ],
  node: {
    fs: "empty",
    __filename: true,
  },
  performance: { hints: false },
  devServer: {
    contentBase: path.resolve(`${__dirname}/docs/public`),
    hot: true,
  },
};

if (process.env.NODE_ENV === "production") {
  module.exports.mode = "production";
  module.exports.devtool = "source-map";
} else {
  module.exports.mode = "development";
  module.exports.entry.docs = [module.exports.entry.docs, "webpack-hot-middleware/client"];
  module.exports.plugins.push(new webpack.HotModuleReplacementPlugin());
  module.exports.output.globalObject = "this"; // Workaround for https://github.com/webpack/webpack/issues/6642#issuecomment-370222543
}
