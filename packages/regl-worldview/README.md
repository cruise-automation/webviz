# regl-worldview

**Worldview** is a React library for rendering 2D and 3D scenes using [regl](https://github.com/regl-project/regl).

Visit the [homepage](https://cruise-automation.github.io/webviz/worldview) to see more guides, examples and APIs.

## Quick start

Add regl-worldview to your React project:

```bash
npm install --save regl-worldview
```

If you’re not using a module bundler or package manager we also have a global (“UMD”) build hosted on the unpkg CDN. Simply add the following script tag to the bottom of your HTML file:

```html
<script src="https://unpkg.com/regl-worldview/dist/index.umd.js" />
```

Then try rendering the [basic example](https://cruise-automation.github.io/webviz/worldview/#/docs/examples/basicexample):

![Image of the basic example](basic-example.png)

```js
import React from "react";

import Worldview, { Cubes, Axes } from "regl-worldview";

function BasicExample() {
  const markers = [
    {
      pose: {
        orientation: { x: 0, y: 0, z: 0, w: 1 },
        position: { x: 0, y: 0, z: 0 },
      },
      scale: { x: 15, y: 15, z: 15 },
      color: { r: 1, g: 0, b: 1, a: 0.9 },
    },
  ];

  return (
    <Worldview>
      <Cubes>{markers}</Cubes>
      <Axes />
    </Worldview>
  );
}
```
