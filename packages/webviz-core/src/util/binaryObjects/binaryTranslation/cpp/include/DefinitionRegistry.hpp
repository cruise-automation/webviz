//  Copyright (c) 2020-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

#pragma once

#include <memory>
#include <string>
#include <unordered_map>

namespace cruise {

class Definition;

class DefinitionRegistry {
public:
    DefinitionRegistry() noexcept;
    DefinitionRegistry(const DefinitionRegistry&) = delete;
    DefinitionRegistry(DefinitionRegistry&&) = delete;
    ~DefinitionRegistry() noexcept = default;

    DefinitionRegistry& operator=(const DefinitionRegistry&) = delete;
    DefinitionRegistry& operator=(const DefinitionRegistry&&) = delete;

    Definition* createDefinition(const std::string& name) noexcept;
    Definition* getDefinition(const std::string& name) noexcept;
    bool finalizeAll() noexcept;

private:
    using Registry = std::unordered_map<std::string, std::unique_ptr<Definition>>;
    Registry _definitions;
};

}  // namespace cruise
