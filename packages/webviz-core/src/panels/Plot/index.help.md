# Plot

The plot panel is comparable to [rqt_plot](http://wiki.ros.org/rqt_plot). It can plot arbitrary values from topics.

The values plotted are specified through Webviz's [topic path syntax](/help/topic-path-syntax). When you select multiple values (by using a slice) the plot turns into a scatter plot.

The timestamp is taken from either the time the message was received, or the `message.header.stamp` field of the topic, depending on the dropdown.

You can zoom by scrolling, and pan by dragging. Double-click to reset.

To take the derivative of a value (change per second), use the special `.@derivative` modifier. This does not work with scatter plots (when using slices).
