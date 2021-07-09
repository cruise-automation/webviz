//  Copyright (c) 2020-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

#pragma once

#include <memory>
#include <string>
#include <vector>

namespace cruise {

class DefinitionRegistry;

// Definitions are assumed to be incomplete because they can be registered in any order. Only when
// we have all possible definitions, we can compute the final sizes. Then, we record commands and
// only when all commands have been recorded we can start merging them together, if possible.
class Definition {
public:
    struct Field {
        std::string type;
        std::string name;
        Definition* definition;
        bool isArray = false;

        // If `arraySize` is greater or equal to 0, then the array is considered
        // to have a constant size.
        int32_t arraySize = -1;

        inline size_t getSize() const {
            return isArray ? 2 * sizeof(uint32_t) : definition->getSize();
        }

        bool finalize(DefinitionRegistry* registry);
    };

    struct Command;
    using CommandBuffer = std::vector<Command>;

    struct Command {
        enum class Type {
            // Read data from the source buffer and copy it to the destination
            // buffer without transformations. The `size` fields indicates
            // how much memory need to read.
            READ_FIXED_SIZE_DATA,

            // Reads a string from source buffer. A string has a dynamic length
            // that must read from the source buffer.
            READ_STRING,

            // Read data from the source buffer and copy it to the destination
            // buffer without transformation. The data has a dynamic size that
            // must be read from source buffer. This represents an array of
            // elements, where each element has a constant size.
            READ_DYNAMIC_SIZE_DATA,

            // Reads a constant-sized array of elements. In this case, we store
            // commands for all possible elements, since the length of the array
            // is known when recording commands. Elements have variable
            // sizes and cannot be read with a single command, though.
            CONSTANT_ARRAY,

            // Reads a variable-length array of elements. The number of elements
            // must be read from the source buffer.
            DYNAMIC_ARRAY,
        };

        Type type;
        std::string label;
        size_t size = 0;

        // For constant-sized arrays, this field will hold the actual
        // number of elements in the array, which is known at the time
        // of recording commands
        uint32_t length = 0;

        // Store subcommands for elements in an array.
        // For `Type::CONSTANT_ARRAY`, we save all commmands for all elements
        // (unrolling the loop), which not only prevents some extra function calls
        // but also creates opportunities for later optimizations, by allowing
        // commands in between elements to be merged, if possible.
        // For `Type::DYNAMIC_ARRAY`, we save all commands for a single element
        // and we iterate over the number of elements once we've read it from the
        // source data.
        // Other types have no subcommands.
        CommandBuffer subcommands;
    };

public:
    Definition(const std::string& name, size_t size, bool isString = false);
    Definition(
            DefinitionRegistry* registry,
            const std::string& name,
            size_t size,
            bool isString = false);
    Definition(const Definition&) = delete;
    Definition(Definition&&) = delete;
    ~Definition() = default;

    Definition& operator=(const Definition&) = delete;
    Definition& operator=(const Definition&&) = delete;

    const std::string& getName() const {
        return _name;
    }

    inline size_t getSize() const {
        return _size;
    }

    bool hasFields() const {
        return !_fields.empty();
    }

    const std::vector<Field>& getFields() const {
        return _fields;
    }

    bool isString() const {
        return _isString;
    }

    bool isValid() const {
        return _isValid;
    }

    bool hasConstantSize() const {
        return _hasConstantSize;
    }

    const CommandBuffer& getCommands() const {
        return _commands;
    }

    // Adds a new field to the definition.
    // Automatically marks the definition as invalid (must call finalize() after adding all fields)
    bool addField(std::string type, std::string name, bool isArray, int32_t arraySize);

    // Validates definition and compute the new size for complex types
    bool finalize(DefinitionRegistry* registry);

    // This function is used for testing purposes. It traverses the command buffer
    // and returns a vector with only the commands types (casted to int values so
    // they can be easily bind to JS).
    std::vector<int> flattenCommands() const;

private:
    CommandBuffer recordDefinitionCommands(const Definition& definition);
    CommandBuffer recordComplexDefinitionCommands(const Definition& definition);
    CommandBuffer recordArrayDefinitionCommands(const Definition& definition, int32_t arraySize);
    CommandBuffer recordStringDefinitionCommands(const Definition& definition);
    CommandBuffer recordNonStringDefinitionCommands(const Definition& definition, size_t count);

    CommandBuffer optimizeCommands(const CommandBuffer& input);

    void flatten(std::vector<int>& out, const CommandBuffer& cmds) const;

private:
    DefinitionRegistry* _registry = nullptr;
    std::string _name;
    size_t _size = 0;
    std::vector<Field> _fields;
    bool _isString = false;
    bool _isValid = true;
    bool _hasConstantSize = true;
    CommandBuffer _commands;
};

}  // namespace cruise
