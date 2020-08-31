//  Copyright (c) 2020-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

#pragma once

#include "Definition.hpp"

#if defined(__EMSCRIPTEN__)
#include <emscripten/val.h>
#endif

#include <cstring>
#include <string>
#include <vector>

namespace cruise {

using Buffer = std::vector<uint8_t>;

// Writers are "views" into a bigger data buffer
struct DataWriter {
    Buffer* buffer = nullptr;
    size_t next = 0;
    size_t end = 0;

    inline bool write(const uint8_t* src, size_t size) noexcept {
        if (next + size > end) {
            return false;
        }

        memcpy(buffer->data() + next, src, size);
        next += size;
        return true;
    }

    inline bool writeOffsets(uint32_t count, uint32_t begin) noexcept {
        uint32_t tmp[2] = {count, begin};
        return write(reinterpret_cast<uint8_t*>(tmp), 2 * sizeof(uint32_t));
    }
};

class DataReader {
public:
    DataReader(const uint8_t* data, size_t size) noexcept : _data(data), _size(size) {}
    ~DataReader() = default;

    inline bool readLength(uint32_t* length) noexcept {
        if (_read + sizeof(uint32_t) > _size) {
            return false;
        }

        memcpy(length, _data + _read, sizeof(uint32_t));
        _read += sizeof(uint32_t);
        return true;
    }

    inline bool read(size_t size, DataWriter* dst) noexcept {
        if (_read + size > _size) {
            return false;
        }

        if (!dst->write(_data + _read, size)) {
            return false;
        }

        _read += size;
        return true;
    }

private:
    const uint8_t* _data = nullptr;
    size_t _read = 0;
    size_t _size = 0;
};

class MessageWriter {
public:
    MessageWriter() noexcept = default;
    MessageWriter(const MessageWriter&) = delete;
    MessageWriter(MessageWriter&&) = delete;
    ~MessageWriter() noexcept = default;

    MessageWriter& operator=(const MessageWriter&) = delete;
    MessageWriter& operator=(const MessageWriter&&) = delete;

    bool reserve(Definition* definition, size_t messageCount, size_t totalBytes) noexcept;

    // Emscripten does not allow raw pointers to primitive types like `uint`,
    // so we use `uintptr_t` instead and reinterpret it as an `uint` pointer.
    // Returns -1 if the type is invalid.
    // TODO (hernan): Check precision for return type. Should we use int64_t instead?
    int32_t write(Definition* definition, uintptr_t data, size_t size) noexcept;

#if defined(__EMSCRIPTEN__)
    emscripten::val getDataBufferJS() noexcept;
    emscripten::val getStringBufferJS() noexcept;
#endif

private:
    DataWriter allocate(Buffer* data, size_t size) noexcept;

    inline bool readDynamicData(
            DataReader* src,
            DataWriter* dst,
            Buffer* buffer,
            const std::string& label,
            size_t size) noexcept;

    bool dispatchCommands(
            const Definition::CommandBuffer& cmds,
            DataReader* src,
            DataWriter* dst) noexcept;

private:
    Buffer _dataBuffer;
    Buffer _stringBuffer;
};

}  // namespace cruise
