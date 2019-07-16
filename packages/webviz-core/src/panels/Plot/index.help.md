# Plot

Plots arbitrary values from topics, similar to [rqt_plot](http://wiki.ros.org/rqt_plot).

The values plotted are specified through Webviz's [topic path syntax](/help/topic-path-syntax). When you select multiple values (by using a slice) the plot turns into a scatter plot.

The timestamp is taken from either the time the message was received, or the `message.header.stamp` field of the topic, depending on the dropdown.

You can also enter an arbitrary number, which will add a horizontal line at that y-value.

You can zoom by scrolling, and pan by dragging. Double-click to reset. To scroll in only the vertical direction (no horizontal scrolling), you can hold the `v` key while scrolling, and to scroll in only the horizontal direction you can hold the `h` key while scrolling.

To take the derivative of a value (change per second), use the special `.@derivative` modifier. This does not work with scatter plots (when using slices).

In the options menu, you can set a minimum and maximum Y-value. By default, the plot will use those bounds unless the data you're looking at extends above the max Y-value or below the min Y-value; in those cases it will automatically expand. If you want to disable this behavior and force the plot to use the exact minimum and maximum Y-values entered, you can "lock" the y-axis in the options menu as well.
