# Image View

The Image View panel displays images from `sensor_msgs/Image` or `sensor_msgs/CompressedImage` topics.

16-bit images (`16UC1`) are currently displayed assuming the values fall into the 0&ndash;10000 range, consistent with the defaults of the ROS `image_view` tool.

The **markers** dropdown can be used to toggle on and off topics with type `visualization_msgs/ImageMarker`, which will be overlayed on top of the selected image topic. Note that markers are only available if the `CameraInfo` for the selected camera is being published. If the image is unrectified, the markers will be transformed by webviz based on `CameraInfo`.

The **scale** dropdown allows you to adjust the scale of the image.  Since the images are fairly large, it is recommended to use the smallest scale you need to conserve bandwidth.  Currently using `scale 1.0` can negatively impact rendering speed, particularly if you have a limited bandwidth connection. (Note: only applies to streaming connections, which is not part of the open source version yet.)

Shortcuts:

- =: Zoom in
- -: Zoom out
- Command + (1 2 3 ... 9 0): Go to percentage 10% - 100%. Note that 10% may be less than the minimum zoom size based on panel and image size.
