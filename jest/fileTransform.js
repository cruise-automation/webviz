const path = require("path");

// This is a custom Jest transformer turning file imports into filenames.

module.exports = {
  process(src, filename) {
    return `module.exports = ${JSON.stringify(path.basename(filename))};`;
  },
};
