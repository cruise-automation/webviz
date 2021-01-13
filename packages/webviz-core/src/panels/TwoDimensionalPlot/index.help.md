# 2D Plot

The 2D Plot panel allows users to define within their ROS messages the points, lines, and polygons they would like to visualize on an x- and y-axis.

The panel's API currently allows users to specify the plot's title and axes labels (`title`, `xAxisLabel`, and `yAxisLabel`), and supports the visualization of 3 marker types: `points`, `lines`, and `polygons`. Any incoming message with these 3 keys pointing to an array of API-conforming marker objects can be displayed in the 2D Plot panel.

Each marker type can be constructed using the following options:

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

Only `label` and `data` are required - all other options have reasonable default values. For more info on these options, reference the [chart.js documentation](https://www.chartjs.org/docs/latest/charts/line.html#dataset-properties).

Below are the ROS message definitions needed for a 2D Plot message:

```cpp
# webviz_msgs/TwoDimensionalPlot definition
std_msgs/Header header
string title
string xAxisLabel
string yAxisLabel
string gridColor
webviz_msgs/TwoDimensionalPlotDatapoint[] lines
webviz_msgs/TwoDimensionalPlotDatapoint[] points
webviz_msgs/TwoDimensionalPlotDatapoint[] polygons

# webviz_msgs/TwoDimensionalPlotDatapoint definition
uint8 order
string label
string backgroundColor
string borderColor
uint8[] borderDash
uint8 borderWidth
string pointBackgroundColor
string pointBorderColor
string pointBorderWidth
string pointRadius
# pointStyle can be 'circle', 'cross', 'crossRot', 'dash', 'line', 'rect', 'rectRounded', 'rectRot', or 'star'
string pointStyle
float32 lineTension
# z field in geometry_msgs/Point is ignored
geometry_msgs/Point[] data
```

Below is an example of an output message (in JavaScript) that could be consumed by the 2D Plot panel:

```js
{
  topic: "/plot_a",
  datatype: "webviz_msgs/TwoDimensionalPlot",
  receiveTime: { sec: 1532375120, nsec: 317760607 },
  message: {
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

## User Interactions

You can zoom by scrolling, and pan by dragging. Double-click to reset.

By default, scrolling will zoom horizontally only. To zoom vertically, hold the `v` key while scrolling. To zoom both horizontally and vertically at the same time, hold the `b` key while scrolling.
