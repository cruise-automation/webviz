# Image View

The Image View panel displays images from `sensor_msgs/Image` or `sensor_msgs/CompressedImage` topics.

The **markers** dropdown can be used to toggle on and off topics with `visualization_msgs/ImageMarkers`, which will be overlayed on top of the selected image topic. Note that markers are only available if the `CameraInfo` for the selected camera is being published. If the image is unrectified, the markers will be transformed by webviz based on `CameraInfo`.

The **scale** dropdown allows you to adjust the scale of the image.  Since the images are fairly large, it is recommended to use the smallest scale you need to conserve bandwidth.  Currently using `scale 1.0` can negatively impact rendering speed, particularly if you have a limited bandwidth connection. (Note: only applies to streaming connections, which is not part of the open source version yet.)
