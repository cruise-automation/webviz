# Storybook integration tests

This module enables integration testing using jest/puppeteer and storybook. This is NOT a module for end-to-end tests using webviz - instead we use storybook to compile and run the code. It allows us to screen test parts of our code without a difficult setup process.

At the time of writing, the only module with integration tests written is `regl-worldview`.

## Adding a new module

To add a new module, create it in a subfolder and then require it in `allTestModules`. The module should have a default export of `IntegrationTestModule`.

## Adding a new test

Tests are of the type `IntegrationTest` (see `types.js`). They require a name, a `story` function, and a `test` function. The `story` function is run in the context of storybook, and the `test` functions are run in the context of jest with access to puppeteer.

```
const Test: IntegrationTestModule = {
  name: "A module",
  tests: [
    {
      name: "A test",
      story: (setTestData) => {
        // Render a story. Optionally set test data using `setTestData`.
      },
      test: async (getTestData) => {
        // Make assertions on the storybook story, or test data passed by `getTestData`. Puppeteer's `page` global
        // variable is in scope.
      },
    },
  ],
};
```

Adding a test is easy: just write a storybook test in `story` and assert on it in `test`. We remove all the padding that normally surrounds a story in the default storybook interface, so that the top left pixel of the story is at pixel `[0,0]`. To pass data between the story and the test, use the `setTestData` and `getTestData` functions passed in.

No tests in the same module can have overlapping names, because their storybook stories might overwrite each other. We have a test to prevent this.
