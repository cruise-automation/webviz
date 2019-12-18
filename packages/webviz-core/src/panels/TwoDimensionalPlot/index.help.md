# 2D Plot

The 2D Plot panel allows users to define within their ROS messages the points, lines, and polygons they would like to visualize on an x- and y-axis.

The panel's API currently allows users to specify the plot's title and axes labels, and supports the visualization of 3 types of markers: `points`, `lines`, and `polygons`. Any incoming message with these 3 keys pointing to an array of API-conforming marker objects can be displayed in the 2D Plot panel.

The chart options supported by the 2D Plot panel API are:

- `title`
- `xAxisLabel`
- `yAxisLabel`

There are 3 types of datasets supported by the 2D PLot panel API - `lines`, `points`, and `polygons`. Each of these dataset types can be customized by the following options:

- `order` - z-index
- `label` - unique ID
- `backgroundColor`
- `borderColor`
- `borderDash` - length and spacing of dashes - see [MDN](https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/setLineDash)
- `borderWidth`
- `pointBackgroundColor`
- `pointBorderColor`
- `pointBorderWidth`
- `pointRadius`
- `pointStyle` - can be 'circle', 'cross', 'crossRot', 'dash', 'line', 'rect', 'rectRounded', 'rectRot', or 'star'
- `data` - an array of coordinate objects, e.g. `[{x: 0, y: 1}, {x: 2, y: 5}]`

Only `label` and `data` are required - all other options have reasonable default values.

Below is a basic example of a message that could be consumed by the 2D Plot panel:

```js
{
  op: "message",
  topic: "/plot_a",
  datatype: "webviz_msgs/2DPlotMsg",
  receiveTime: { sec: 1532375120, nsec: 317760607 },
  message: {
    type: "webviz_msgs/2DPlotMsg",
    title: "This is Plot A",
    xAxisLabel: "This is my X axis label",
    yAxisLabel: "This is my Y axis label",
    lines: [
      // 1 solid red line
      { label: "solid-line", borderColor: "red", backgroundColor: "red", data: [{ x: 0, y: 0 }, { x: 5, y: 5 }] },
      // 1 dashed pink line
      {
        label: "dashed-line",
        borderDash: [5, 5],
        borderColor: "pink",
        backgroundColor: "pink",
        data: [{ x: 1, y: 0.5 }, { x: 5, y: 3.5 }],
      },
    ],
    points: [
      // 3 circular blue points
      {
        label: "circle-point",
        pointBackgroundColor: "blue",
        data: [{ x: 1.5, y: 2.5 }, { x: 3, y: 4 }, { x: 4, y: 3.5 }],
      },
      // 2 teal Xs
      {
        label: "cross-point",
        pointBackgroundColor: "teal",
        pointBorderColor: "teal",
        pointStyle: "crossRot",
        pointRadius: 10,
        data: [{ x: 2, y: 1 }, { x: 4, y: 1 }],
      },
    ],
    polygons: [
      // 1 light gray triangle
      {
        label: "polygon",
        borderColor: "lightgray",
        backgroundColor: "lightgray",
        data: [{ x: 3, y: 1 }, { x: 4, y: 2 }, { x: 4.5, y: 1.5 }],
      },
    ],
  },
}
```