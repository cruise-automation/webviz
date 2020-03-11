# Plot

Plots arbitrary values from topics, similar to [rqt_plot](http://wiki.ros.org/rqt_plot).

The values plotted are specified through Webviz's [message path syntax](/help/message-path-syntax).

In the options menu, you can set a minimum and maximum Y-value. By default, the plot will use those bounds unless the data you're looking at extends above the max Y-value or below the min Y-value; in those cases it will automatically expand. If you want to disable this behavior and force the plot to use the exact minimum and maximum Y-values entered, you can "lock" the y-axis in the options menu as well.

There are 2 possible values for the x-axis - by the message's timestamp or by the message values' respective array indices.

## Timestamp as X-Axis

When you select to plot against a timestamp x-axis (default), you can specify whether the timestamp is taken from either the time the message was received, or the `message.header.stamp` field of the topic, in the dropdown displayed next to each line topic. All Plot panels' timestamped x-axes are kept in sync for easy comparison.

When you select multiple values (by using a slice) the plot turns into a scatter plot at each timestamp tick.

You can also enter an arbitrary number, which will add a horizontal line at that y-value.

To take the derivative of a value (change per second), use the special `.@derivative` modifier. This does not work with scatter plots (when using slices).

## Array Index as X-Axis

Go into the Plot panel's settings to change your x-axis from being the messages' timestamps to being the message values' array indices. In this mode, if you add message path `/some_topic.some_array` as a new line in the plot, the plot will chart that array's values against their indices. For example, if `/some_topic.some_array` contained the values `[5, 10, 15]`, the resulting points on the chart would be `[0, 5]`, `[1, 10]`, and `[2, 15]`.

## User Interactions

You can zoom by scrolling, and pan by dragging. Double-click to reset. To scroll in only the vertical direction (no horizontal scrolling), you can hold the `v` key while scrolling, and to scroll in only the horizontal direction you can hold the `h` key while scrolling.
