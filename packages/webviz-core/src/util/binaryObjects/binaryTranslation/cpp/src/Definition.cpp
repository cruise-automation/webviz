//  Copyright (c) 2020-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

#include "Definition.hpp"
#include "DefinitionRegistry.hpp"

#include <iostream>

using cruise::Definition;
using cruise::DefinitionRegistry;

Definition::Definition(const std::string& name, size_t size, bool isString) noexcept
        : _name(name), _size(size), _isString(isString), _hasConstantSize(!isString) {
    // no-op
}

bool Definition::addField(
        std::string type,
        std::string name,
        bool isArray,
        int32_t arraySize) noexcept {
    auto field = Field{
            .type = type,
            .name = name,
            .definition = nullptr,
            .isArray = isArray,
            .arraySize = arraySize,
    };
    _fields.push_back(field);
    _isValid = false;  // reset valid state. Must call validate() later
    return true;
}

bool Definition::Field::finalize(DefinitionRegistry* registry) noexcept {
    if (definition == nullptr) {
        definition = registry->getDefinition(type);
    }
    if (definition == nullptr) {
        std::cerr << "Cannot found definition with type \"" << type << "\"" << std::endl;
        return false;
    }

    return definition->finalize(registry);
}

bool Definition::finalize(DefinitionRegistry* registry) noexcept {
    if (_isValid) {
        // The definition is already valid. No need to recalculate size either.
        return true;
    }

    _isValid = true;
    if (_fields.size() > 0) {
        // Only compute size for definitions that have fields.
        // Primitive types (like uint8 or string), don't have fields
        // and must provide a valid size during construction.
        _size = 0;
        for (auto& f : _fields) {
            if (f.finalize(registry)) {
                _size += f.getSize();
            } else {
                _isValid = false;
                std::cerr << "Failed to finalize field " << f.name << " (" << f.type << ")"
                          << std::endl;
                break;
            }

            if (f.isArray || f.definition->isString() || !f.definition->hasConstantSize()) {
                // propagates constant size flag from children to parent.
                _hasConstantSize = false;
            }
        }
    }

    if (_isValid) {
        // This will trigger the command recording process for definitions
        // It may end up doing some redundant work since it will process the
        // same definitions multiple times (assuming we have shared definitions)
        _commands = optimizeCommands(recordDefinitionCommands(*this));
    }

    return _isValid;
}

Definition::CommandBuffer
Definition::recordDefinitionCommands(const Definition& definition) noexcept {
    if (definition.hasFields()) {
        return recordComplexDefinitionCommands(definition);
    } else if (definition.isString()) {
        return recordStringDefinitionCommands(definition);
    } else if (definition.getSize() > 0) {
        return recordNonStringDefinitionCommands(definition, 1);
    }

    // Constant-sized definition with no fields.
    // No need to record commands.
    return {};
}

Definition::CommandBuffer
Definition::recordComplexDefinitionCommands(const Definition& definition) noexcept {
    CommandBuffer ret;

    for (const auto& f : definition.getFields()) {
        if (f.isArray) {
            auto cmds = recordArrayDefinitionCommands(*f.definition, f.arraySize);
            for (auto& cmd : cmds) {
                cmd.label = f.name + "(" + cmd.label + ")";
            }
            std::copy(std::begin(cmds), std::end(cmds), std::back_inserter(ret));
        } else {
            auto cmds = recordDefinitionCommands(*f.definition);
            for (auto& cmd : cmds) {
                cmd.label = f.name + "(" + cmd.label + ")";
            }
            std::copy(std::begin(cmds), std::end(cmds), std::back_inserter(ret));
        }
    }

    return ret;
}

Definition::CommandBuffer Definition::recordArrayDefinitionCommands(
        const Definition& definition,
        int32_t arraySize) noexcept {

    CommandBuffer ret;

    if (arraySize >= 0) {
        auto cmd = Command{
                .type = Command::Type::CONSTANT_ARRAY,
                .label = definition.getName(),
                .size = definition.getSize(),
                .length = uint32_t(arraySize),
        };

        // Constant size. Loop unrolling
        if (definition.isString()) {
            for (auto i = 0l; i < arraySize; i++) {
                auto cmds = recordStringDefinitionCommands(definition);
                std::copy(std::begin(cmds), std::end(cmds), std::back_inserter(cmd.subcommands));
            }
        } else if (definition.hasConstantSize()) {
            auto cmds = recordNonStringDefinitionCommands(definition, arraySize);
            std::copy(std::begin(cmds), std::end(cmds), std::back_inserter(cmd.subcommands));
        } else {
            for (auto i = 0l; i < arraySize; i++) {
                auto cmds = recordDefinitionCommands(definition);
                std::copy(std::begin(cmds), std::end(cmds), std::back_inserter(cmd.subcommands));
            }
        }

        ret.push_back(cmd);
    } else if (definition.hasConstantSize()) {
        ret.push_back(Command{
                .type = Command::Type::READ_DYNAMIC_SIZE_DATA,
                .label = definition.getName(),
                .size = definition.getSize(),
        });
    } else {
        // Dynamic array

        auto cmd = Command{
                .type = Command::Type::DYNAMIC_ARRAY,
                .label = definition.getName(),
                .size = definition.getSize(),
        };

        if (definition.isString()) {
            auto cmds = recordStringDefinitionCommands(definition);
            std::copy(std::begin(cmds), std::end(cmds), std::back_inserter(cmd.subcommands));
        } else if (definition.hasConstantSize()) {
            auto cmds = recordNonStringDefinitionCommands(definition, 1);
            std::copy(std::begin(cmds), std::end(cmds), std::back_inserter(cmd.subcommands));
        } else {
            auto cmds = recordDefinitionCommands(definition);
            std::copy(std::begin(cmds), std::end(cmds), std::back_inserter(cmd.subcommands));
        }

        ret.push_back(cmd);
    }

    return ret;
}

Definition::CommandBuffer
Definition::recordStringDefinitionCommands(const Definition& definition) noexcept {
    return {
            Command{
                    .type = Command::Type::READ_STRING,
                    .label = definition.getName(),
            },
    };
}

Definition::CommandBuffer
Definition::recordNonStringDefinitionCommands(const Definition& definition, size_t count) noexcept {
    return {
            Command{
                    .type = Command::Type::READ_FIXED_SIZE_DATA,
                    .label = definition.getName(),
                    .size = count * definition.getSize(),
            },
    };
}

Definition::CommandBuffer Definition::optimizeCommands(const CommandBuffer& input) noexcept {
    CommandBuffer ret;

    for (const auto& cmd : input) {
        switch (cmd.type) {
        case Command::Type::READ_FIXED_SIZE_DATA: {
            if (ret.size() == 0) {
                // no previous commands
                ret.push_back(cmd);
            } else {
                auto& top = ret[ret.size() - 1];
                if (top.type != Command::Type::READ_FIXED_SIZE_DATA) {
                    // previous commmand is not a data read
                    ret.push_back(cmd);
                } else {
                    // previous command is a data read
                    // we can merge them in a single read command
                    top.label += "+" + cmd.label;
                    top.size += cmd.size;
                }
            }
            break;
        }

        case Command::Type::CONSTANT_ARRAY:
        case Command::Type::DYNAMIC_ARRAY: {
            auto optimized = cmd;
            optimized.subcommands = optimizeCommands(cmd.subcommands);
            ret.push_back(optimized);
            break;
        }

        default:
            ret.push_back(cmd);
            break;
        }
    }

    return ret;
}

std::vector<int> Definition::flattenCommands() const noexcept {
    std::vector<int> ret;
    flatten(ret, _commands);
    return ret;
}

void Definition::flatten(std::vector<int>& out, const CommandBuffer& cmds) const noexcept {
    for (const auto& cmd : cmds) {
        out.push_back(int(cmd.type));
        flatten(out, cmd.subcommands);
    }
}
