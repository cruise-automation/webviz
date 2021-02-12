//  Copyright (c) 2020-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

#include "Definition.hpp"
#include "DefinitionRegistry.hpp"
#include "MessageWriter.hpp"

#if defined(__EMSCRIPTEN__)
#include <emscripten/bind.h>
#include <emscripten/val.h>
#endif

#include <cstddef>
#include <iostream>

#if defined(__EMSCRIPTEN__)

EMSCRIPTEN_BINDINGS(cruise) {
    emscripten::register_vector<int>("IntVector");

    emscripten::class_<cruise::Definition>("Definition")
            .function("getName", &cruise::Definition::getName)
            .function("getCommands", &cruise::Definition::flattenCommands)
            .function("getSize", &cruise::Definition::getSize)
            .function("addField", &cruise::Definition::addField);

    emscripten::class_<cruise::DefinitionRegistry>("DefinitionRegistry")
            .constructor()
            .function(
                    "create",
                    &cruise::DefinitionRegistry::createDefinition,
                    emscripten::allow_raw_pointers())
            .function(
                    "get",
                    &cruise::DefinitionRegistry::getDefinition,
                    emscripten::allow_raw_pointers())
            .function("finalize", &cruise::DefinitionRegistry::finalizeAll);

    emscripten::class_<cruise::MessageWriter>("MessageWriter")
            .constructor()
            .function("reserve", &cruise::MessageWriter::reserve, emscripten::allow_raw_pointers())
            .function("write", &cruise::MessageWriter::write, emscripten::allow_raw_pointers())
            .function("getBuffer", &cruise::MessageWriter::getDataBufferJS)
            .function("getBigString", &cruise::MessageWriter::getStringBufferJS);
}

#endif

int main(int /*argc*/, char** /*argv*/) {
    return 0;
}
