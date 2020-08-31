#!/bin/bash

set -euo pipefail

WORK_DIR=`pwd`/`dirname $0`

docker build $WORK_DIR -t webviz:ros_binary_translation

docker run \
  --rm \
  -v $WORK_DIR:$WORK_DIR \
  webviz:ros_binary_translation \
  clang-format -i $WORK_DIR/cpp/**/*.cpp $WORK_DIR/cpp/**/*.hpp

docker run \
  --rm \
  -v $WORK_DIR:$WORK_DIR \
  webviz:ros_binary_translation \
  clang-tidy $WORK_DIR/cpp/**/*.cpp $WORK_DIR/cpp/**/*.hpp -- -I$WORK_DIR/cpp/include

docker run \
  --rm \
  -v $WORK_DIR:$WORK_DIR \
  webviz:ros_binary_translation \
  emcc \
    -fno-rtti \
    -fno-exceptions \
    -flto \
    -Wall \
    --bind \
    -O3 \
    -g4 \
    -DEMSCRIPTEN_HAS_UNBOUND_TYPE_NAMES=0 `# allows embind to work with rtti disabled` \
    -s ALLOW_MEMORY_GROWTH=1 \
    -s DEMANGLE_SUPPORT=1 \
    -s "EXPORTED_FUNCTIONS=['_malloc', '_free']" \
    -s "EXTRA_EXPORTED_RUNTIME_METHODS=['ccall', 'cwrap']" \
    -s FILESYSTEM=0 `# we don't need filesystem support. This should reduce file sizes` \
    -s MODULARIZE=1 \
    -s WARN_UNALIGNED=1 \
    -s WASM=1 \
    -s DISABLE_EXCEPTION_CATCHING=1 \
    -o $WORK_DIR/bin/translator.js \
    --extern-pre-js $WORK_DIR/extern-pre.js \
    -I$WORK_DIR/cpp/include \
    `find $WORK_DIR/cpp -name "*.cpp"`
