//  Copyright (c) 2018-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

const rehypePrism = require("@mapbox/rehype-prism");
const CaseSensitivePathsPlugin = require("case-sensitive-paths-webpack-plugin");
const { spawnSync } = require("child_process");
const MonacoWebpackPlugin = require("monaco-editor-webpack-plugin");
const path = require("path");
const retext = require("retext");
const retextSmartypants = require("retext-smartypants");
const TerserPlugin = require("terser-webpack-plugin");
const visit = require("unist-util-visit");
const webpack = require("webpack");

const STATIC_WEBVIZ = process.env.STATIC_WEBVIZ === "true";

// Enable smart quotes:
// https://github.com/mdx-js/mdx/blob/ad58be384c07672dc415b3d9d9f45dcebbfd2eb8/docs/advanced/retext-plugins.md
const smartypantsProcessor = retext().use(retextSmartypants);
function remarkSmartypants() {
  function transformer(tree) {
    visit(tree, "text", (node) => {
      node.value = String(smartypantsProcessor.processSync(node.value));
    });
  }
  return transformer;
}

const config = {
  ravenUrl: undefined,
  currentVersion: "0.0.1",
  minimumChromeVersion: parseInt(process.env.MINIMUM_CHROME_VERSION) || 68,
};

const gitInfo = (() => {
  const revParse = spawnSync("git", ["rev-parse", "--short", "HEAD"], { timeout: 5000 });
  const diffIndex = spawnSync("git", ["diff-index", "--quiet", "HEAD", "--"], { timeout: 5000 });
  if (revParse.error) {
    console.log("Error getting git commit hash:", revParse.error); // eslint-disable-line no-console
    return undefined;
  }
  if (diffIndex.error) {
    console.log("Error getting git status:", diffIndex.error); // eslint-disable-line no-console
  }
  return {
    hash: revParse.status === 0 && revParse.stdout.toString().trim(),
    dirty: diffIndex.status && diffIndex.status !== 0,
  };
})();

module.exports = {
  devtool: "cheap-module-eval-source-map",
  entry: STATIC_WEBVIZ
    ? {
        webvizCoreBundle: "./packages/webviz-core/src/index.js",
      }
    : {
        docs: "./docs/src/index.js",
        webvizCoreBundle: "./packages/webviz-core/src/index.js",
      },
  output: {
    path: STATIC_WEBVIZ
      ? path.resolve(`${__dirname}/__static_webviz__`)
      : path.resolve(`${__dirname}/docs/public/dist`),
    publicPath: STATIC_WEBVIZ ? "" : "/dist/",
    pathinfo: true,
    filename: "[name].js",
    devtoolModuleFilenameTemplate: (info) => path.resolve(info.absoluteResourcePath),
  },
  resolve: {
    modules: [path.resolve("."), path.resolve(`${__dirname}/packages`), "node_modules"],
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
        test: /\.wasm$/,
        // Bypass webpack's default importing logic for .wasm files.
        // https://webpack.js.org/configuration/module/#ruletype
        type: "javascript/auto",
        use: {
          loader: "file-loader",
          options: {
            name: "[name]-[hash].[ext]",
          },
        },
      },
      {
        test: /\.worker\.js$/,
        exclude: /node_modules/,
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
      {
        test: /\.mdx$/,
        use: [
          "babel-loader?cacheDirectory",
          {
            loader: "@mdx-js/loader",
            options: {
              hastPlugins: [rehypePrism],
              mdPlugins: [remarkSmartypants],
            },
          },
        ],
      },
      {
        // We use stringified Typescript in Node Playground.
        // eslint-disable-next-line no-useless-escape
        test: /typescript\/[\.\/\w]*\.ts$/,
        exclude: /node_modules/,
        use: { loader: "raw-loader" },
      },
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
      { test: /\.(glb|bag|ttf|bin)$/, loader: "file-loader" },
      {
        test: /node_modules\/compressjs\/.*\.js/,
        loader: "string-replace-loader",
        options: {
          search: "if (typeof define !== 'function') { var define = require('amdefine')(module); }",
          replace: "/* webviz: removed broken amdefine shim (https://github.com/webpack/webpack/issues/5316) */",
        },
      },
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
    new webpack.DefinePlugin({
      RAVEN_URL: JSON.stringify(config.ravenUrl),
      GIT_INFO: JSON.stringify(gitInfo),
      CURRENT_VERSION: JSON.stringify(config.currentVersion),
      MINIMUM_CHROME_VERSION: JSON.stringify(config.minimumChromeVersion),
    }),
    new CaseSensitivePathsPlugin(),
    // https://github.com/jmblog/how-to-optimize-momentjs-with-webpack
    new webpack.IgnorePlugin(/^\.\/locale$/, /moment$/),
    new MonacoWebpackPlugin({
      // available options: https://github.com/Microsoft/monaco-editor-webpack-plugin#options
      languages: ["typescript", "javascript"],
    }),
  ],
  node: {
    fs: "empty",
    // Originally put in due to the 'source-map-support' dependency pulled in from TypeScript.
    module: "empty",
    __filename: true,
  },
  performance: { hints: false },
  devServer: {
    contentBase: path.resolve(`${__dirname}/docs/public`),
    hot: true,
    open: true,
  },
};

if (process.env.NODE_ENV === "production") {
  module.exports.mode = "production";
  module.exports.devtool = "source-map";
} else {
  if (STATIC_WEBVIZ) {
    throw new Error("If STATIC_WEBVIZ=true is set the NODE_ENV=production must be set!");
  }
  module.exports.mode = "development";
  module.exports.entry.docs = [module.exports.entry.docs, "webpack-hot-middleware/client"];
  module.exports.plugins.push(new webpack.HotModuleReplacementPlugin());
  module.exports.output.globalObject = "this"; // Workaround for https://github.com/webpack/webpack/issues/6642#issuecomment-370222543
}
