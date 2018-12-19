// @flow
(() => {
  // Hide storybook artifacts in screenshot tests
  // https://github.com/tsuyoshiwada/storybook-chrome-screenshot/issues/58
  // https://github.com/tsuyoshiwada/storybook-chrome-screenshot/issues/89
  const style = document.createElement("style");
  style.innerHTML = `
  .Resizer.horizontal {
    display: none !important;
  }
  iframe + div {
    display: none !important;
  }
  .Pane, .Pane + div, .Pane + div + div {
    overflow: hidden !important;
  }
`;
  if (!document.body) {
    throw new Error("no document.body");
  }
  document.body.appendChild(style);
})();
