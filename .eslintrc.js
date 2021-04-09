module.exports = {
  env: { browser: true, node: true, jest: true },
  extends: [
    "eslint:recommended",
    "plugin:jest/recommended",
    "plugin:react/recommended",
    "plugin:flowtype/recommended",
    "plugin:import/recommended",
    "problems",
    "plugin:prettier/recommended",
    "prettier/flowtype",
    "prettier/react",
  ],
  plugins: ["jest", "import-order-alphabetical", "react-hooks"],
  parser: "babel-eslint",
  settings: {
    "import/external-packages": [
      "packages/@cruise-automation/button",
      "packages/@cruise-automation/hooks",
      "packages/@cruise-automation/tooltip",
      "packages/react-key-listener",
      "packages/regl-worldview",
    ],
    "import/resolver": { webpack: { config: `${__dirname}/webpack.config.js` } },
  },
  globals: {
    RAVEN_URL: false, // injected via webpack
    GIT_INFO: false, // injected via webpack
    CURRENT_VERSION: false, // injected via webpack
    MINIMUM_CHROME_VERSION: false, // injected via webpack
  },
  rules: {
    curly: "error",
    "prettier/prettier": "error",
    "no-console": ["error", { allow: ["warn", "error", "debug"] }],
    "no-unused-vars": ["error", { args: "none", varsIgnorePattern: "^_" }],
    "flowtype/no-unused-expressions": "error",
    "no-underscore-dangle": ["error", { allowAfterThis: true }],
    "react/prop-types": "off", // We use Flow instead.
    "no-useless-computed-key": "off", // https://github.com/facebook/flow/issues/380#issuecomment-224380551
    yoda: "off", // https://github.com/RyanZim/eslint-config-problems/pull/1 and https://github.com/eslint/eslint/issues/10591
    // Some good ones that people really should be adding to import/recommended:
    "import/first": "error",
    "import/no-self-import": "error",
    "import/no-useless-path-segments": "error",
    "import/no-mutable-exports": "error",
    "import/newline-after-import": "error",
    "import/no-duplicates": "error", // https://github.com/benmosher/eslint-plugin-import/issues/242#issuecomment-230118951
    "no-duplicate-imports": "off", // False positives on flow type imports, so we use import/no-duplicates instead which handles them correctly.
    // Group imports into two groups: packages and files. Sort alphabetically
    // within those groups.
    "import-order-alphabetical/order": [
      "error",
      { "newlines-between": "always", groups: [["builtin", "external"], ["internal", "parent", "sibling", "index"]] },
    ],
    // TODO(JP): Fix this instead of disabling it:
    "import/no-named-as-default": "off",
    "prefer-arrow-callback": ["error", { allowNamedFunctions: true }],
    "react-hooks/rules-of-hooks": "error",
  },
};
