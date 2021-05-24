//  Copyright (c) 2020-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

#include "DefinitionRegistry.hpp"
#include "Definition.hpp"

#include <iostream>

using cruise::Definition;
using cruise::DefinitionRegistry;

DefinitionRegistry::DefinitionRegistry()
        : _definitions([] {
            Registry registry;
            registry["bool"] = std::make_unique<Definition>("bool", sizeof(bool));
            registry["uint8"] = std::make_unique<Definition>("uint8", sizeof(uint8_t));
            registry["int8"] = std::make_unique<Definition>("int8", sizeof(int8_t));
            registry["uint16"] = std::make_unique<Definition>("uint16", sizeof(uint16_t));
            registry["int16"] = std::make_unique<Definition>("int16", sizeof(int16_t));
            registry["uint32"] = std::make_unique<Definition>("uint32", sizeof(uint32_t));
            registry["int32"] = std::make_unique<Definition>("int32", sizeof(int32_t));
            registry["uint64"] = std::make_unique<Definition>("uint64", sizeof(uint64_t));
            registry["int64"] = std::make_unique<Definition>("int64", sizeof(int64_t));
            registry["float32"] = std::make_unique<Definition>("float32", sizeof(float));
            registry["float64"] = std::make_unique<Definition>("float64", sizeof(double));
            registry["string"] = std::make_unique<Definition>("string", 2 * sizeof(uint32_t), true);
            registry["json"] = std::make_unique<Definition>("json", 2 * sizeof(uint32_t), true);
            registry["time"] = std::make_unique<Definition>("time", 2 * sizeof(uint32_t));
            registry["duration"] = std::make_unique<Definition>("duration", 2 * sizeof(int32_t));
            return registry;
        }()) {
    // no-op
}

Definition* DefinitionRegistry::createDefinition(const std::string& name) {
    _definitions[name] = std::make_unique<Definition>(name, 0);
    return _definitions[name].get();
}

Definition* DefinitionRegistry::getDefinition(const std::string& name) {
    if (_definitions.count(name) == 0) {
        return nullptr;
    }

    return _definitions.at(name).get();
}

bool DefinitionRegistry::finalizeAll() {
    for (auto& it : _definitions) {
        if (it.second != nullptr) {
            if (!it.second->finalize(this)) {
                std::cerr << "Invalid definition with type \"" << it.second->getName() << "\""
                          << std::endl;
                return false;
            }
        }
    }
    return true;
}
