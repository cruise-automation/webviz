# Global Variables

Allows you to read and set global variables for any panel that uses the [topic path syntax](/help/topic-path-syntax) (e.g. Plot, State Transitions, Raw Messages, etc.).

For example, instead of having to change a particular object ID that you want to see visualizations for across panels, you can:

- Set a `$my_object_ID` variable in the Global Variables panel
- Type `/my_objects.objects[:]{id==$my_object_ID}.some_field` in your Plot Panel to plot a particular field in your specified object
- Type `/my_objects.objects[:]{id==$my_object_ID}` in your Raw Messages Panel to see all the info for your specified object
