# Plot

The plot panel is comparable to [rqt_plot](http://wiki.ros.org/rqt_plot) and [dichot](https://github.robot.car/cruise/dichot). It can plot arbitrary values from topics.

The values plotted are specified through Webviz's [topic path syntax](/help/topic-path-syntax). When you select multiple values (by using a slice) the plot turns into a scatter plot.

The timestamp is taken from the `message.header.stamp` field of the topic. If it is not available, a warning is shown, and we fall back to the latest `/webviz/clock` value (which is not very accurate).

You can zoom by scrolling, and pan by dragging. Double-click to reset.

To take the derivative of a value (change per second), use the special `.@derivative` modifier. This does not work with scatter plots (when using slices).
