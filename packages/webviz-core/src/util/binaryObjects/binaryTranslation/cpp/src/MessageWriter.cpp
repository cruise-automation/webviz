//  Copyright (c) 2020-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

#include "MessageWriter.hpp"

#include <iostream>

using cruise::DataWriter;
using cruise::MessageWriter;

bool MessageWriter::reserve(Definition* definition, size_t messageCount, size_t totalBytes) {

    if (definition == nullptr || !definition->isValid()) {
        // Cannot find definition. Fail
        return false;
    }

    // Reserving enough memory for the data buffer.
    // For messages, we can use the fact that definition size is constant
    // and reserve enough memory for all of them
    size_t messageSize = messageCount * definition->getSize();

    // For data, we just multiply the input data size by some number
    // TODO (hernan): Based on my tests, 4 is good enough, but we might
    // want to compute this better in the future. It doesn't matter if
    // we reserve more memory than used, but we need to make sure the size
    // is enough in order to avoid resizing the arrays later.
    size_t messageDataSize = 4 * totalBytes;

    // Resize the data array to hold both messages and data
    _dataBuffer.reserve(messageSize + messageDataSize);

    // For strings, we use the same size as for data. Again, we might want
    // to find a better strategy.
    _stringBuffer.reserve(messageDataSize);

    return true;
}

bool MessageWriter::dispatchCommands(
        const Definition::CommandBuffer& cmds,
        DataReader* src,
        DataWriter* dst) {

    for (const auto& cmd : cmds) {
        switch (cmd.type) {
        case Definition::Command::Type::READ_FIXED_SIZE_DATA: {
            if (!src->read(cmd.size, dst)) {
                std::cerr << "Failed to executed command READ_RAW_DATA with label " << cmd.label
                          << " and size " << cmd.size << " " << dst->next << " " << dst->end
                          << std::endl;
                return false;
            }
            break;
        }

        case Definition::Command::Type::READ_STRING: {
            if (!readDynamicData(src, dst, &_stringBuffer, cmd.label, 1)) {
                return false;
            }
            break;
        }

        case Definition::Command::Type::READ_DYNAMIC_SIZE_DATA: {
            if (!readDynamicData(src, dst, &_dataBuffer, cmd.label, cmd.size)) {
                return false;
            }
            break;
        }

        case Definition::Command::Type::CONSTANT_ARRAY: {
            auto length = cmd.length;
            auto size = cmd.size;
            auto writer = allocate(&_dataBuffer, length * size);
            dst->writeOffsets(length, writer.next);
            if (length > 0) {
                if (!dispatchCommands(cmd.subcommands, src, &writer)) {
                    return false;
                }
            }
            break;
        }

        case Definition::Command::Type::DYNAMIC_ARRAY: {
            uint32_t length = 0;
            if (!src->readLength(&length)) {
                std::cerr << "Cannot read for array of type " << cmd.label << std::endl;
                return false;
            }
            auto size = cmd.size;
            auto writer = allocate(&_dataBuffer, length * size);
            dst->writeOffsets(length, writer.next);
            if (length > 0) {
                for (auto i = 0l; i < length; ++i) {
                    if (!dispatchCommands(cmd.subcommands, src, &writer)) {
                        return false;
                    }
                }
            }

            break;
        }
        }
    }

    return true;
}

bool MessageWriter::readDynamicData(
        DataReader* src,
        DataWriter* dst,
        Buffer* buffer,
        const std::string& label,
        size_t size) {
    uint32_t length = 0;
    if (!src->readLength(&length)) {
        std::cerr << "Cannot read length for " << label << std::endl;
        return false;
    }

    auto writer = allocate(buffer, length * size);
    dst->writeOffsets(length, writer.next);
    if (length > 0) {
        if (!src->read(length * size, &writer)) {
            std::cerr << "Failed to read dynamic data with label " << label << ", size " << size
                      << " and length " << length << std::endl;
            return false;
        }
    }

    return true;
}

int32_t MessageWriter::write(Definition* definition, uintptr_t data, size_t size) {
    if (definition == nullptr || !definition->isValid()) {
        // Cannot find definition. Fail
        return -1;
    }

    auto offset = _dataBuffer.size();
    auto inPtr = reinterpret_cast<uint8_t*>(data);

    DataReader src(inPtr, size);
    DataWriter dst = allocate(&_dataBuffer, definition->getSize());

    const auto& cmds = definition->getCommands();
    if (!dispatchCommands(cmds, &src, &dst)) {
        std::cerr << "Failed dispatching commands" << std::endl;
        return false;
    }
    return offset;

    return int32_t(offset);
}

#if defined(__EMSCRIPTEN__)
emscripten::val MessageWriter::getDataBufferJS() {
    return emscripten::val(emscripten::typed_memory_view(_dataBuffer.size(), _dataBuffer.data()));
}

emscripten::val MessageWriter::getStringBufferJS() {
    return emscripten::val(
            emscripten::typed_memory_view(_stringBuffer.size(), _stringBuffer.data()));
}

#endif

DataWriter MessageWriter::allocate(Buffer* buffer, size_t size) {
    auto begin = buffer->size();
    if (size != 0) {
        buffer->resize(begin + size);
    }

    return DataWriter{
            .buffer = buffer,
            .next = begin,
            .end = begin + size,
    };
}
