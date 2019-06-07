# 3D

Plots visualization messages in a 3D scene.  You can select topics using the left-hand topic list; you can toggle the ability to follow orientation and manually select the frame you follow in the right-hand controls.  Selected topics will have their messages visualized within the 3D scene.  Topic selection is part of the configuration and will be saved between reloads and can be shared with `Import / Export Layout`.  This panel can be expanded / collapsed by clicking on the caret icon to the left of it.

By default the scene will follow the center of a frame.  When you move the camera, the camera will be offset from the center of that frame, but stay relative to that center.

You can toggle between a 3D perspective camera and a top-down, 2D orthographic camera of the scene by clicking on the _toggle 2D / 3D_ button in the top left of the 3D view panel.

`Left-click + drag` on the scene to move the camera position parallel to the ground.  If 'follow' mode is on this will disengage it.

`Right-click + drag` on the scene to pan and rotate the camera.  Dragging left/right will rotate the camera around the Z axis, and in 3D camera mode dragging top/bottom will pan the camera around the world's x/y axis.

`Mouse-wheel` controls the 'zoom' of the camera.  Wheeling "up" will zoom the camera closer in while wheeling "down" will zoom the camera farther away.

In 3D camera mode, you can also use "shooter controls" (like those found in most popular desktop first-person shooter games) of `a` `s` `d` `f` to move the camera 'left / backwards / right / forward' respective to the camera's position, and use `z` `x` to move the camera "up" and "down" respective to its position.  It's easy to get lost when using these controls as there is nothing anchoring the camera to the scene.

Holding down `shift` in while performing any interaction with the camera will adjust values by 1/10th of their normal adjustments.  This allows precision movements and adjustments to the camera.

_tip: If you get 'lost' in the scene and end up looking into infinite blank space and can't find your way back try clicking on 'follow' to snap the camera back to the default position._
