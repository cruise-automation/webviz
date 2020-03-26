# State Transitions

Shows when values change. Can be used for any primitive value, but is most useful for "enums" (even though ROS does not have that as a formal concept). If you put constants in your ROS message definition, those constant names will be shown. You can only have one "enum" per message definition, otherwise we don't know which constant name to show (if there are multiple matches).

The values plotted are specified through Webviz's [message path syntax](/help/message-path-syntax).

You can zoom by scrolling, and pan by dragging. Double-click to reset.

Colors are hard-coded for the default paths. If you use a different path, you get some default colors. Please contact the Webviz team if you want more custom colors.
