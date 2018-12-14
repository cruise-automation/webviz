# regl-worldview

Worldview is a react library for rendering 2D and 3D views using [regl](https://github.com/regl-project/regl).

## Quick start

Add regl-worldview to your React project:

```bash
npm install --save regl-worldview
```

```js
import Worldview, { Spheres, DEFAULT_CAMERA_STATE } from "regl-worldview";

function Demo() {
  const markers = [
    {
      pose: {
        orientation: { x: 0.038269, y: -0.01677, z: -0.8394, w: 0.541905 },
        position: { x: 0, y: 0, z: 0 },
      },
      scale: { x: 5, y: 5, z: 5 },
      color: { r: 1, g: 0, b: 1, a: 0.9 },
    },
  ];

  return (
    <div
      style={{
        height: 500,
        width: "100%",
      }}>
      <Worldview defaultCameraState={DEFAULT_CAMERA_STATE}>
        <Spheres>{markers}</Spheres>
      </Worldview>
    </div>
  );
}
```

## Documentation

Visit [docs page](https://cruise-automation.github.io/webviz/) to see more guides, examples and APIs.
