// @flow

//  Copyright (c) 2019-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import distance from "distance-to-line-segment";

import type { Vec3, MouseHandler } from "../../types";
import { PolygonPoint, Polygon } from "./index";

type OptionalZPoint = {
  x: number,
  y: number,
  z?: number,
};

type PolygonAddCommand = {
  points: OptionalZPoint[],
  name?: string,
};

function areEqual(point1: PolygonPoint, point2: PolygonPoint) {
  const [x1, y1, z1] = point1.point;
  const [x2, y2, z2] = point2.point;
  return x1 === x2 && y1 === y2 && z1 === z2;
}

function isClosed(polygon: Polygon): boolean {
  const { points } = polygon;
  for (let i = 0; i < points.length - 1; i++) {
    if (areEqual(points[i], points[i + 1])) {
      return true;
    }
  }
  const firstPoint = points[0];
  const lastPoint = points[points.length - 1];
  return areEqual(firstPoint, lastPoint);
}

// Has listeners you can pass to Worldview for mouse interactions
// internally builds a list of polygons and modifies the polygons
// based on mouse & keyboard interactions. For now we use mututation internally
// instead of immutability to keep the number of allocations lower and make
// the implementation a bit more straightforward

export default class PolygonBuilder {
  mouseDown: boolean = false;
  polygons: Polygon[];
  onChange: () => void = () => {};
  activePolygon: ?Polygon;
  activePoint: ?PolygonPoint;
  mouseDownPoint: Vec3;

  constructor(polygons: Polygon[] = []) {
    this.polygons = polygons;
  }

  isActivePolygonClosed(): boolean {
    return !!this.activePolygon && isClosed(this.activePolygon);
  }

  // adds a polygon to the builder, transforming it into the internal representation
  addPolygon(cmd: PolygonAddCommand): void {
    const { points, name } = cmd;
    if (points.length < 3) {
      return;
    }
    // clear any selections
    this.selectObject();

    const polygon = new Polygon(name);
    polygon.points = points.map((p) => new PolygonPoint([p.x, p.y, p.z || 0]));
    if (!isClosed(polygon)) {
      polygon.points.push(polygon.points[0]);
    }
    this.polygons.push(polygon);
  }

  // push a new point - either adds to the active polygon
  // or creates a new polygon at this point
  pushPoint(point: Vec3): void {
    const { activePolygon } = this;
    if (activePolygon) {
      // do not push a point on a closed polygon
      if (!isClosed(activePolygon)) {
        const newPoint = new PolygonPoint(point);
        activePolygon.points.push(newPoint);
        this.selectObject(newPoint);
        return;
      }
    }

    const polygon = new Polygon();
    polygon.points.push(new PolygonPoint(point));
    const floatingPoint = new PolygonPoint(point);
    polygon.points.push(floatingPoint);
    this.polygons.push(polygon);
    this.selectObject(floatingPoint);
    this.onChange();
  }

  // updates the active point to the new position
  updateActivePoint(point: Vec3): void {
    if (this.activePoint) {
      this.activePoint.point = point;
      this.onChange();
    }
  }

  // closes the active polygon by either deleting it if
  // is only 2 points (no "single sided" polygons...)
  // or inserts an 'overlap' point by making the first point
  // and last point a reference to the same point in the list
  // this structure of overlap is similar to the structure used by geoJSON
  // though "left to right" ordering is not enforced
  closeActivePolygon(): void {
    const polygon = this.activePolygon;
    if (!polygon) {
      return;
    }

    // remove single lines
    if (polygon.points.length === 2) {
      this.deletePolygon(polygon);
    } else {
      polygon.points.push(polygon.points[0]);
    }
    this.onChange();
  }

  // mouse move handler - should be added to Worldview as a prop
  onMouseMove: MouseHandler = (e, args) => {
    // prevent the camera from responding to move if we
    // have an active object being edited
    if (this.activePolygon) {
      e.preventDefault();
      e.stopPropagation();
    }
    //const cursor = e.ctrlKey ? 'crosshair' : '';
    //document.body.style.cursor = cursor;

    if (!this.mouseDown) {
      return;
    }
    if (!args) {
      return;
    }

    // early return to only raycast when mouse moves during interaction
    if (!this.activePoint && !this.activePolygon) {
      return;
    }

    const { ray } = args;
    const point = ray.planeIntersection([0, 0, 0], [0, 0, 1]);
    // satisfy flow
    if (!point) {
      return;
    }

    // satisfy flow
    const { activePolygon } = this;

    if (this.activePoint) {
      this.updateActivePoint(point);
    } else if (activePolygon && this.mouseDownPoint) {
      // move polygon
      const [pointX, pointY] = point;
      const [mouseX, mouseY] = this.mouseDownPoint;
      // figure out how far the mouse has moved
      const dX = pointX - mouseX;
      const dY = pointY - mouseY;

      // save the new mouse position as for the next computation
      this.mouseDownPoint = point;

      // only update the 'overlap' point once
      const uniquePoints = activePolygon.points.reduce((acc, point) => {
        if (!acc.includes(point)) {
          acc.push(point);
        }
        return acc;
      }, []);

      // adjust each point's location
      for (const polygonPoint of uniquePoints) {
        const { point } = polygonPoint;
        point[0] = point[0] + dX;
        point[1] = point[1] + dY;
      }

      this.onChange();
    }
  };

  // deletes a polygon
  deletePolygon(polygon: Polygon): void {
    this.polygons = this.polygons.filter((poly) => poly !== polygon);
    this.activePolygon = null;
  }

  // deletes a point in the active polygon
  // if the point is the 'overlap point' create a new one
  // also deletes the entire polygon if the polygon becomes a 1-sided polygon
  deletePoint(point: PolygonPoint): void {
    const { activePolygon } = this;
    if (!activePolygon) {
      return;
    }
    const newPoints = activePolygon.points.filter((p) => p.id !== point.id);
    // if the 'overlap' point is deleted, create a new start/end overlap point
    if (newPoints.length === activePolygon.points.length - 2) {
      newPoints.push(newPoints[0]);
    }
    activePolygon.points = newPoints;
    this.activePoint = null;
    if (activePolygon.points.length < 4) {
      this.deletePolygon(activePolygon);
    }
    this.onChange();
  }

  // key down handler - to be passed to Worldview as a prop
  onKeyDown = (e: KeyboardEvent): void => {
    // only respond to key events if we have a selected polygon
    const { activePolygon } = this;
    if (!activePolygon) {
      return;
    }

    switch (e.key) {
      case "Delete":
      case "Backspace":
        if (this.activePoint) {
          this.deletePoint(this.activePoint);
        } else {
          this.deletePolygon(activePolygon);
        }
        this.onChange();
        break;
      default:
        break;
    }
  };

  // select either a point or polygon by id
  selectObject(object?: Polygon | PolygonPoint) {
    // clear out any previously active objects
    this.activePolygon = null;
    if (this.activePoint) {
      this.activePoint.active = false;
    }
    this.activePoint = null;

    for (const polygon of this.polygons) {
      let isActive = polygon === object;
      polygon.active = isActive;
      if (isActive) {
        this.activePolygon = polygon;
      }
      for (const point of polygon.points) {
        if (point === object) {
          // if a point is selected, activate both it
          // and the polygon it belongs to
          this.activePoint = point;
          point.active = true;
          polygon.active = true;
          this.activePolygon = polygon;
          isActive = true;
        }
      }
    }

    this.onChange();
  }

  // mouse up handler - to be passed to Worldview as a prop
  onMouseUp: MouseHandler = (e, args) => {
    if (!e.ctrlKey) {
      this.mouseDown = false;
    }
  };

  // double click handler - to be passed to Worldview as a prop
  onDoubleClick: MouseHandler = (e, args) => {
    // satisfy flow
    if (!args) {
      return;
    }
    if (!args.objects.length) {
      return;
    }

    this.selectObject(args.objects[0].object);

    // if a point was double-clicked, delete it
    if (this.activePoint) {
      this.deletePoint(this.activePoint);
      return;
    }

    // otherwise insert a new point into the nearest line of the active polygon
    const { activePolygon } = this;

    // if no polygon is active, don't do anything w/ the double-click
    if (!activePolygon) {
      return;
    }

    let shortestDistance = Number.MAX_SAFE_INTEGER;
    let shortestIndex = -1;
    const { ray } = args;
    const point = ray.planeIntersection([0, 0, 0], [0, 0, 1]);
    if (!point) {
      return;
    }
    const [px, py] = point;

    // find the closest line segment of the active polygon
    const { points } = activePolygon;
    for (let i = 0; i < points.length - 1; i++) {
      const point1 = points[i];
      const point2 = points[i + 1];
      const [x1, y1] = point1.point;
      const [x2, y2] = point2.point;

      // distance.squared is faster since we don't care about the
      // actual distance, just which line produces the shortest distance
      const dist = distance.squared(x1, y1, x2, y2, px, py);
      if (dist < shortestDistance) {
        shortestDistance = dist;
        shortestIndex = i;
      }
    }

    // insert a new point in the nearest line
    if (shortestIndex > -1) {
      const newPoint = new PolygonPoint(point);
      activePolygon.points.splice(shortestIndex + 1, 0, newPoint);
      this.activePoint = newPoint;
    }
    this.onChange();
  };

  // mouse down handler - to be passed to Worldview as a prop
  onMouseDown: MouseHandler = (e, args) => {
    if (!args) {
      return;
    }
    const { ray } = args;

    const point = ray.planeIntersection([0, 0, 0], [0, 0, 1]);

    // satisfy flow but raycasting should always work
    if (!point) {
      return;
    }

    const isFirstClick = !this.mouseDown;
    this.mouseDown = true;
    this.mouseDownPoint = point;
    const isCtrlClick = e.ctrlKey;

    // single click or click+drag is for selection & moving
    if (isFirstClick && !isCtrlClick) {
      const clickObject = args.objects[0];
      this.selectObject(clickObject && clickObject.object);
      return this.onChange();
    }

    // ctrl+click always inserts a point
    if (isCtrlClick) {
      this.pushPoint(point);
      return this.onChange();
    }

    // if mouse was down & we have a non-control click, close the active polygon
    this.closeActivePolygon();
    return this.onChange();
  };
}
