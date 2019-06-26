//@flow
//  Copyright (c) 2018-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import React from "react";
import { Lines, FilledPolygons } from "regl-worldview";

// type LineProps = CommandProps<Line> & {
//   // when enabled, a polygon will be drawn using the line points, and the user will get the original
//   // line object after clicking inside the polygon
//   enableClickableInterior?: boolean,
//   // visually turn lines into polygons using custom fillColor
//   fillColor: Color,
//   // draw the lines around the polygon if enableClickableInterior is true
//   showBorder: boolean,
// };

function LinesWithClickableInterior({ children, enableClickableInterior, fillColor, onClick, showBorder, ...rest }) {
  if (enableClickableInterior) {
    return (
      <React.Fragment>
        {showBorder && <Lines {...rest}>{children}</Lines>}
        <FilledPolygons
          onClick={(ev, { object, ...rest }) => {
            onClick(ev, { ...rest, object: object.lineObject, objectId: object.lineObject.id });
          }}>
          {children.map((item) => ({
            id: item.id,
            points: item.points,
            lineObject: item,
            color: fillColor,
          }))}
        </FilledPolygons>
      </React.Fragment>
    );
  }
  return (
    <Lines {...rest} onClick={onClick}>
      {children}
    </Lines>
  );
}

LinesWithClickableInterior.defaultProps = {
  fillColor: { r: 0, g: 0, b: 0, a: 0 },
  showBorder: false,
};

export default LinesWithClickableInterior;
