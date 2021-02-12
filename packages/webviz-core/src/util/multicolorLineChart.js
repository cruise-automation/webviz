// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

/* eslint-disable no-underscore-dangle */
// From https://github.com/chartjs/Chart.js/issues/4895#issuecomment-341874938
export default function installMulticolorLineChart(Chart: any) {
  Chart.defaults.multicolorLine = Chart.defaults.scatter;
  Chart.controllers.multicolorLine = Chart.controllers.scatter.extend({
    draw(ease) {
      let startIndex = 0;
      const meta = this.getMeta();
      const points = meta.data || [];
      const colors = this.getDataset().colors;
      const area = this.chart.chartArea;
      const { multicolorLineYOffset } = this.chart.options.plugins || {};
      if (multicolorLineYOffset) {
        meta.dataset._children.forEach((data) => {
          if (!data._view.originalY) {
            data._view.originalY = data._view.y;
          }
          data._view.y = data._view.originalY + multicolorLineYOffset;
        });
      }
      const originalDatasets = meta.dataset._children.filter((data) => {
        return !isNaN(data._view.y);
      });

      function setColor(newColor, { dataset }) {
        dataset._view.borderColor = newColor;
      }

      if (!colors) {
        Chart.controllers.scatter.prototype.draw.call(this, ease);
        return;
      }

      for (let i = 2; i <= colors.length; i++) {
        if (colors[i - 1] !== colors[i]) {
          setColor(colors[i - 1], meta);
          meta.dataset._children = originalDatasets.slice(startIndex, i);
          meta.dataset.draw();
          startIndex = i - 1;
        }
      }

      meta.dataset._children = originalDatasets.slice(startIndex);
      meta.dataset.draw();
      meta.dataset._children = originalDatasets;

      points.forEach((point) => {
        point.draw(area);
      });
    },
  });
}
