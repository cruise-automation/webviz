// @flow

//  Copyright (c) 2019-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import type { ReglClickInfo } from "../../types";
import { Polygon, PolygonPoint } from "./index";
import PolygonBuilder from "./PolygonBuilder";

const mag = 10;
const buildPolygon = () => {
  const poly = new Polygon();
  const p = [[mag, mag, 0], [mag, -mag, 0], [-mag, -mag, 0], [-mag, mag, 0]];
  poly.points = p.map((x) => new PolygonPoint(x));
  poly.points.push(poly.points[0]);
  return poly;
};
class FakeRay {
  point: number[];
  constructor(point) {
    this.point = point;
  }

  planeIntersection() {
    return this.point;
  }
}

const getArgs: (number[], ?Object) => ReglClickInfo = (point, object) => {
  return {
    ray: (new FakeRay(point): any),
    objects: [{ object }],
  };
};

const event: (?boolean) => SyntheticMouseEvent<HTMLCanvasElement> = (ctrlKey): any => ({
  ctrlKey,
  stopPropagation: () => {},
  preventDefault: () => {},
});

describe("PolygonBuilder", () => {
  describe("delete point", () => {
    it("can remove a point", () => {
      const polygon = buildPolygon();
      const builder = new PolygonBuilder([polygon]);
      builder.selectObject(polygon);
      expect(builder.activePolygon).toBe(polygon);
      builder.deletePoint(polygon.points[1]);
      expect(polygon.points.map((point) => point.point)).toEqual([
        [mag, mag, 0],
        [-mag, -mag, 0],
        [-mag, mag, 0],
        [mag, mag, 0],
      ]);
    });

    it('can remove "overlap" point', () => {
      const polygon = buildPolygon();
      const builder = new PolygonBuilder([polygon]);
      builder.selectObject(polygon);
      expect(builder.activePolygon).toBe(polygon);
      builder.deletePoint(polygon.points[0]);
      expect(polygon.points.map((point) => point.point)).toEqual([
        [mag, -mag, 0],
        [-mag, -mag, 0],
        [-mag, mag, 0],
        [mag, -mag, 0],
      ]);
    });

    it("removes polygon entirely if it is only 2 points long", () => {
      const polygon = buildPolygon();
      const builder = new PolygonBuilder([polygon]);
      builder.selectObject(polygon);
      expect(builder.activePolygon).toBe(polygon);
      builder.deletePoint(polygon.points[0]);
      builder.deletePoint(polygon.points[0]);
      expect(builder.polygons).toHaveLength(0);
      expect(builder.activePoint).toBeNull();
      expect(builder.activePolygon).toBeNull();
    });

    it("removes polygon entirely if it is only 2 points long with dblclick", () => {
      const polygon = buildPolygon();
      const builder = new PolygonBuilder([polygon]);
      builder.selectObject(polygon);
      expect(builder.activePolygon).toBe(polygon);
      builder.onDoubleClick(event(), getArgs([mag, mag, 0], polygon.points[0]));
      builder.onDoubleClick(event(), getArgs([mag, mag, 0], polygon.points[0]));
      builder.onMouseDown(event(), getArgs([1, 1, 0]));
      expect(builder.polygons).toHaveLength(0);
      expect(builder.activePoint).toBeNull();
      expect(builder.activePolygon).toBeNull();
    });
  });

  describe("build polygon", () => {
    it("builds with mouse", () => {
      const builder = new PolygonBuilder();
      builder.onMouseDown(event(true), getArgs([1, 1, 0]));
      builder.onMouseMove(event(true), getArgs([1, -1, 0]));
      builder.onMouseDown(event(true), getArgs([1, -1, 0]));
      builder.onMouseMove(event(true), getArgs([-1, -1, 0]));
      builder.onMouseDown(event(false), getArgs([-1, -1, 0]));
      builder.onMouseUp(event(true), getArgs([]));
      expect(builder.polygons).toHaveLength(1);
      const [polygon] = builder.polygons;
      expect(polygon.points.map((p) => p.point)).toEqual([[1, 1, 0], [1, -1, 0], [-1, -1, 0], [1, 1, 0]]);
    });
  });

  describe("add polygon", () => {
    it("can add unclosed polygon from external set of points", () => {
      const builder = new PolygonBuilder();
      const points = [{ x: 0, y: 0 }, { x: 1, y: 1 }, { x: -1, y: -1 }];
      builder.addPolygon({ points });
      expect(builder.polygons).toHaveLength(1);
      const [polygon] = builder.polygons;
      expect(polygon.points.map((p) => p.point)).toEqual([[0, 0, 0], [1, 1, 0], [-1, -1, 0], [0, 0, 0]]);
    });

    it("can add closed polygon from external set of points", () => {
      const builder = new PolygonBuilder();
      const points = [{ x: 0, y: 0 }, { x: 1, y: 1 }, { x: -1, y: -1 }, { x: 0, y: 0 }];
      builder.addPolygon({ points });
      expect(builder.polygons).toHaveLength(1);
      const [polygon] = builder.polygons;
      expect(polygon.points.map((p) => p.point)).toEqual([[0, 0, 0], [1, 1, 0], [-1, -1, 0], [0, 0, 0]]);
    });

    it("can add polygon with name and z-values", () => {
      const builder = new PolygonBuilder();
      const z = 1;
      const points = [{ x: 0, y: 0, z }, { x: 1, y: 1, z }, { x: -1, y: -1, z }, { x: 0, y: 0, z }];
      builder.addPolygon({ name: "foo", points });
      expect(builder.polygons).toHaveLength(1);
      const [polygon] = builder.polygons;
      expect(polygon.name).toBe("foo");
      expect(polygon.points.map((p) => p.point)).toEqual([[0, 0, z], [1, 1, z], [-1, -1, z], [0, 0, z]]);
    });
  });
});
