# 3D

Plots visualization messages in a 3D scene.  You can select topics using the left-hand topic list; you can toggle the ability to follow orientation and manually select the frame you follow in the right-hand controls.  Selected topics will have their messages visualized within the 3D scene.  Topic selection is part of the configuration and will be saved between reloads and can be shared with `Import / Export Layout`.  This panel can be expanded / collapsed by clicking on the caret icon to the left of it.

By default the scene will follow the center of a frame.  When you move the camera, the camera will be offset from the center of that frame, but stay relative to that center.

You can toggle between a 3D perspective camera and a top-down, 2D orthographic camera of the scene by clicking on the _toggle 2D / 3D_ button in the top left of the 3D view panel.

`Left-click + drag` on the scene to move the camera position parallel to the ground.  If 'follow' mode is on this will disengage it.

`Right-click + drag` on the scene to pan and rotate the camera.  Dragging left/right will rotate the camera around the Z axis, and in 3D camera mode dragging top/bottom will pan the camera around the world's x/y axis.

`Mouse-wheel` controls the 'zoom' of the camera.  Wheeling "up" will zoom the camera closer in while wheeling "down" will zoom the camera farther away.

Holding down `shift` in while performing any interaction with the camera will adjust values by 1/10th of their normal adjustments.  This allows precision movements and adjustments to the camera.

_tip: If you get 'lost' in the scene and end up looking into infinite blank space and can't find your way back try clicking on 'follow' to snap the camera back to the default position._

## Keyboard shortcuts

In 3D camera mode, you can also use "shooter controls" (like those found in most popular desktop first-person shooter games) of `w` `a` `s` `d` to move the camera forward / left / backwards / right respective to the camera's position, and use `z` `x` to zoom in and out.  It's easy to get lost when using these controls as there is nothing anchoring the camera to the scene.

You can use `t` to open the Topic Tree and `Esc` to close it again.

## Interacting with markers

Markers can be selected to see details about them. Open the "Interactions" panel from the right-side controls and click a marker to see information such as the topic name and marker contents.

Clicking on a point in a point cloud offers additional information, such as the color and coordinates of the point clicked. Selecting a point cloud also allows exporting all points from the point cloud message as a CSV.

### Linking selected markers to global variables

It's possible to link fields from a selected marker to global variables. In the "Clicked object" tab of the "Interactions" panel, hover over a key in the JSON view of the marker. A button should appear that, when clicked, opens a dialog box that allows linking the field to a global variable.

When a global variable is linked, selecting another marker that contains the same key will update the global variable. For example, with the tracked object "id" field linked to the global variable "$trackedObjectId", clicking another tracked object will update the "$trackedObjectId" field. This makes it easy to use the information about selected markers in other panels.

## Drawing Polygons

- To start a drawing, hold `ctrl` and click on the canvas. This will place the first point of the polygon. Continue holding ctrl and click as may times as you want to create a `string` of points connected by lines. To terminate your drawing release `ctrl` and click a final time. This will place one final point at the mouse location and 'close' the polygon. The polygon will still be selected until you click "off" of the polygon to anywhere else on the canvas.
- To select a polygon, click it once.
- To select a point within a polygon click it once.
- To move a polygon you have drawn you can click + drag on the polygon.
- To resize a polygon you can click + drag on an individual point within the polygon to move it. This will resize the polygon: all the points will remain connected to one another.
- To place a new point within an existing polygon, double click on a line within the polygon. This will bisect the line at the current double-click position, inserting a new point you may drag around to move.
- To delete the entire polygon, press the `delete` key when the polygon is selected.
- To delete an existing point in a polygon, double-click it, or press `delete` with a point selected.
