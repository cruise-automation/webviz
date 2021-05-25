# Table

Displays data similar to `RawMessages` but in a tabular format. If you have a table that you'd tweaked to perfection and want to share as a panel, please reach out to the Webviz team.

Each column header dropdown has options depending on the kind of data underneath, including expanding, hiding, sorting, filtering, and conditional formatting. You can also navigate to the pencil icon in the top left corner to edit the full list of shown/hidden columns. For big topics, it is strongly recommended you only show the columns you need! Besides de-cluttering things, it'll also help a lot with how quickly Webviz plays back.

Since ROS data can be nested, you'll often see ellipses (`...`) where you'd expect to see data. To expand complex columns, either click the ellipses or column header and choose the option `Expand`. You should now see multiple columns nested under the parent column you clicked on. To collapse an expanded column, click on the parent and choose `Collapse`. Since filtering/sorting are only available for primitive ROS values, you won't see these options for complex types or nested arrays.

Note that we currently only allow one level of expansion underneath parent columns. If this is limiting to you, please reach out to the Webviz team and describe to us your use case!
