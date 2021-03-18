// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import BinaryMessageWriter from "webviz-core/src/util/binaryObjects/binaryTranslation";
import { definitions } from "webviz-core/src/util/binaryObjects/testUtils";

// C++ module will output missing fields and types to the console
// but the tests will fail in that case (and we don't always want that);
// Disable the errors here and handle them in each test if necessary
// (or let it fail if the error is not expected).
export const disableConsoleWarnings = () => {
  const expected = ["Cannot found definition with type", "Invalid definition with type", "Failed to finalize field"];
  // $FlowFixMe - Flow doesn't like that we're overwriting this.
  console.warn = (message: string) => {
    if (expected.findIndex((msg) => message.startsWith(msg)) >= 0) {
      return;
    }
    // $FlowFixMe
    fail(message); // eslint-disable-line
  };
};

describe("BinaryMessageWriter", () => {
  it("initializes", async () => {
    const writer = new BinaryMessageWriter();
    await expect(writer.initialize()).resolves.not.toThrow();
  });

  it("fails to register definition if not initialized", () => {
    disableConsoleWarnings();
    const writer = new BinaryMessageWriter();
    expect(() => writer.registerDefinition("someType", { fields: [] })).toThrow();
  });

  it("fails to register definitions if not initialized", () => {
    disableConsoleWarnings();
    const writer = new BinaryMessageWriter();
    expect(() => writer.registerDefinitions({})).toThrow();
  });

  it("fails to rewrite messages if not initialized", () => {
    disableConsoleWarnings();
    const writer = new BinaryMessageWriter();
    expect(() => writer.rewriteMessages("someType", [])).toThrow();
  });

  it("has its own state", async () => {
    const writer1 = new BinaryMessageWriter();
    await writer1.initialize();

    const writer2 = new BinaryMessageWriter();
    await writer2.initialize();

    writer1.registerDefinition("msgs/type1", {
      fields: [{ type: "bool", name: "value" }],
    });

    writer2.registerDefinition("msgs/type2", {
      fields: [{ type: "bool", name: "value" }],
    });

    expect(() => writer1.rewriteMessages("msgs/type1", [])).not.toThrow();
    expect(() => writer1.rewriteMessages("msgs/type2", [])).toThrow();

    expect(() => writer2.rewriteMessages("msgs/type1", [])).toThrow();
    expect(() => writer2.rewriteMessages("msgs/type2", [])).not.toThrow();
  });
});

describe("definitions", () => {
  let writer: BinaryMessageWriter;

  beforeEach(async () => {
    writer = new BinaryMessageWriter();
    await writer.initialize();
  });

  describe("primitives", () => {
    it("creates a definitions for primitive types", async () => {
      expect(
        writer
          .registerDefinition("msgs/test", {
            fields: [{ type: "bool", name: "value" }],
          })
          .getSize()
      ).toBe(1);
      expect(
        writer
          .registerDefinition("msgs/test", {
            fields: [{ type: "time", name: "value" }],
          })
          .getSize()
      ).toBe(8);
      expect(
        writer
          .registerDefinition("msgs/test", {
            fields: [{ type: "duration", name: "value" }],
          })
          .getSize()
      ).toBe(8);
      expect(
        writer
          .registerDefinition("msgs/test", {
            fields: [{ type: "string", name: "value" }],
          })
          .getSize()
      ).toBe(8);
      expect(
        writer
          .registerDefinition("msgs/test", {
            fields: [{ type: "json", name: "value" }],
          })
          .getSize()
      ).toBe(8);
      expect(
        writer
          .registerDefinition("msgs/test", {
            fields: [{ type: "int8", name: "value" }],
          })
          .getSize()
      ).toBe(1);
      expect(
        writer
          .registerDefinition("msgs/test", {
            fields: [{ type: "uint8", name: "value" }],
          })
          .getSize()
      ).toBe(1);
      expect(
        writer
          .registerDefinition("msgs/test", {
            fields: [{ type: "int16", name: "value" }],
          })
          .getSize()
      ).toBe(2);
      expect(
        writer
          .registerDefinition("msgs/test", {
            fields: [{ type: "uint16", name: "value" }],
          })
          .getSize()
      ).toBe(2);
      expect(
        writer
          .registerDefinition("msgs/test", {
            fields: [{ type: "int32", name: "value" }],
          })
          .getSize()
      ).toBe(4);
      expect(
        writer
          .registerDefinition("msgs/test", {
            fields: [{ type: "uint32", name: "value" }],
          })
          .getSize()
      ).toBe(4);
      expect(
        writer
          .registerDefinition("msgs/test", {
            fields: [{ type: "int64", name: "value" }],
          })
          .getSize()
      ).toBe(8);
      expect(
        writer
          .registerDefinition("msgs/test", {
            fields: [{ type: "uint64", name: "value" }],
          })
          .getSize()
      ).toBe(8);
      expect(
        writer
          .registerDefinition("msgs/test", {
            fields: [{ type: "float32", name: "value" }],
          })
          .getSize()
      ).toBe(4);
      expect(
        writer
          .registerDefinition("msgs/test", {
            fields: [{ type: "float64", name: "value" }],
          })
          .getSize()
      ).toBe(8);
    });
  });

  describe("arrays", () => {
    it("creates definitions for arrays", () => {
      const definition = writer.registerDefinition("fake_msgs/HasByteArray", definitions["fake_msgs/HasByteArray"]);
      expect(definition).not.toBeNull();
      expect(definition.getSize()).toBe(8);
    });

    it("creates definitions for a constant size array", () => {
      expect(
        writer
          .registerDefinition("msgs/test", {
            fields: [{ type: "int32", name: "values", isArray: true, arrayLength: 10 }],
          })
          .getSize()
      ).toBe(8);
    });
  });

  describe("complex types", () => {
    it("creates a definition for 'std_msgs/Header'", () => {
      const definition = writer.registerDefinition("std_msgs/Header", definitions["std_msgs/Header"]);
      expect(definition).not.toBeNull();
      expect(definition.getSize()).toBe(20);
    });

    it("creates definitions for complex messages with arrays", () => {
      writer.registerDefinition("std_msgs/Header", definitions["std_msgs/Header"]);
      const definition = writer.registerDefinition(
        "fake_msgs/HasComplexAndArray",
        definitions["fake_msgs/HasComplexAndArray"]
      );
      expect(definition).not.toBeNull();
      expect(definition.getSize()).toBe(28);
    });

    it("creates definitions for arrays of simple messages", () => {
      const definition = writer.registerDefinition("fake_msgs/HasByteArray", definitions["fake_msgs/HasByteArray"]);
      expect(definition).not.toBeNull();
      expect(definition.getSize()).toBe(8);
    });

    it("creates definitions for arrays of complex messages", () => {
      writer.registerDefinition("std_msgs/Header", definitions["std_msgs/Header"]);
      writer.registerDefinition("fake_msgs/HasComplexAndArray", definitions["fake_msgs/HasComplexAndArray"]);
      const definition = writer.registerDefinition(
        "fake_msgs/HasComplexArray",
        definitions["fake_msgs/HasComplexArray"]
      );
      expect(definition).not.toBeNull();
      expect(definition.getSize()).toBe(8);
    });

    it("fails to register definitions in the wrong order (different calls)", () => {
      disableConsoleWarnings();
      expect(() =>
        writer.registerDefinition("msgs/test", {
          fields: [{ type: "std_msgs/Header", name: "header", isComplex: true }, { type: "int32", name: "value" }],
        })
      ).toThrow(`Invalid definition "msgs/test"`);
      expect(() => writer.registerDefinition("std_msgs/Header", definitions["std_msgs/Header"])).not.toThrow();
    });

    it("handles definitions in any order (same call)", () => {
      expect(() => {
        writer.registerDefinitions({
          "fake_msgs/HasComplexArray": definitions["fake_msgs/HasComplexArray"],
          "fake_msgs/HasConstant": definitions["fake_msgs/HasConstant"],
          "fake_msgs/HasByteArray": definitions["fake_msgs/HasByteArray"],
          "fake_msgs/HasJson": definitions["fake_msgs/HasJson"],
          "fake_msgs/HasComplexAndArray": definitions["fake_msgs/HasComplexAndArray"],
          "std_msgs/Header": definitions["std_msgs/Header"],
        });
      }).not.toThrow();
    });

    it("fails to create definitions with missing types", () => {
      disableConsoleWarnings();
      expect(() => {
        writer.registerDefinitions({
          "std_msgs/Header": definitions["std_msgs/Header"],
          "fake_msgs/HasComplexAndArray": definitions["fake_msgs/HasComplexAndArray"],
          "fake_msgs/HasComplexArray": definitions["fake_msgs/HasComplexArray"],
          // "fake_msgs/HasConstant" is missing
          "fake_msgs/HasByteArray": definitions["fake_msgs/HasByteArray"],
          "fake_msgs/HasJson": definitions["fake_msgs/HasJson"],
          "fake_msgs/ContainsEverything": definitions["fake_msgs/ContainsEverything"],
        });
      }).toThrow("Failed to validate definitions");
    });
  });

  describe("constants", () => {
    it("creates definitions for constant types", () => {
      expect(
        writer
          .registerDefinition("msgs/test", {
            fields: [{ type: "bool", name: "value", isConstant: true }],
          })
          .getSize()
      ).toBe(0);
    });
  });

  it("fails when creating definitions with unknown field types", () => {
    disableConsoleWarnings();
    expect(() =>
      writer.registerDefinition("msgs/test2", {
        fields: [{ type: "unknownType", name: "value" }],
      })
    ).toThrow(`Invalid definition "msgs/test2"`);
  });
});

export const compareMessages = (received: any, expected: any) => {
  expect(received.dataType).toBe(expected.dataType);
  expect(received.offsets).toEqual(expected.offsets);
  expect(new Uint8Array(received.buffer)).toEqual(new Uint8Array(expected.buffer));
  expect(new Uint8Array(received.bigString)).toEqual(new Uint8Array(expected.bigString));
};

describe("rewriteMessages", () => {
  let writer: BinaryMessageWriter;

  beforeEach(async () => {
    writer = new BinaryMessageWriter();
    await writer.initialize();
  });

  describe("basic types", () => {
    const withBasicType = (type: string, data: ArrayBuffer) => {
      writer.registerDefinition(`msgs/test_${type}`, {
        fields: [{ type, name: "value" }],
      });
      const messages = [
        {
          message: data,
          receiveTime: { sec: 1, nsec: 200 },
          topic: "/foo",
        },
      ];
      compareMessages(writer.rewriteMessages(`msgs/test_${type}`, messages), {
        dataType: `msgs/test_${type}`,
        offsets: [0],
        buffer: data,
        bigString: "",
      });
    };

    it("handles bool value", () => {
      withBasicType(
        "bool",
        (() => {
          const data = Buffer.alloc(1);
          data.writeUInt8(1, 0);
          return data.buffer;
        })()
      );
    });

    it("handles uint8 value", () => {
      withBasicType(
        "uint8",
        (() => {
          const data = Buffer.alloc(1);
          data.writeUInt8(7, 0);
          return data.buffer;
        })()
      );
    });

    it("handles int8 value", () => {
      withBasicType(
        "int8",
        (() => {
          const data = Buffer.alloc(1);
          data.writeInt8(-7, 0);
          return data.buffer;
        })()
      );
    });

    it("handles uint16 value", () => {
      withBasicType(
        "uint16",
        (() => {
          const data = Buffer.alloc(2);
          data.writeUInt16LE(128, 0);
          return data.buffer;
        })()
      );
    });

    it("handles int16 value", () => {
      withBasicType(
        "int16",
        (() => {
          const data = Buffer.alloc(2);
          data.writeInt16LE(-123, 0);
          return data.buffer;
        })()
      );
    });

    it("handles uint32 value", () => {
      withBasicType(
        "uint32",
        (() => {
          const data = Buffer.alloc(4);
          data.writeUInt32LE(12345, 0);
          return data.buffer;
        })()
      );
    });

    it("handles int32 value", () => {
      withBasicType(
        "int32",
        (() => {
          const data = Buffer.alloc(4);
          data.writeInt32LE(-12345, 0);
          return data.buffer;
        })()
      );
    });

    it("handles uint64 value", () => {
      withBasicType(
        "uint64",
        (() => {
          const data = Buffer.alloc(8);
          data.writeUInt32LE(12345, 0);
          data.writeUInt32LE(67890, 4);
          return data.buffer;
        })()
      );
    });

    it("handles int64 value", () => {
      withBasicType(
        "int64",
        (() => {
          const data = Buffer.alloc(8);
          data.writeInt32LE(12345, 0);
          data.writeInt32LE(67890, 4);
          return data.buffer;
        })()
      );
    });

    it("handles float32 value", () => {
      withBasicType(
        "float32",
        (() => {
          const data = Buffer.alloc(4);
          data.writeFloatLE(12345.6789, 0);
          return data.buffer;
        })()
      );
    });

    it("handles float64 value", () => {
      withBasicType(
        "float64",
        (() => {
          const data = Buffer.alloc(8);
          data.writeDoubleLE(3.141596, 0);
          return data.buffer;
        })()
      );
    });

    it("handles a message with time", () => {
      writer.registerDefinition("msgs/test", {
        fields: [{ type: "time", name: "value" }],
      });
      const messages = [
        {
          message: (() => {
            const data = Buffer.alloc(8);
            data.writeUInt32LE(12345, 0);
            data.writeUInt32LE(67890, 4);
            return data.buffer;
          })(),
          receiveTime: { sec: 1, nsec: 200 },
          topic: "/foo",
        },
      ];
      compareMessages(writer.rewriteMessages("msgs/test", messages), {
        dataType: "msgs/test",
        offsets: [0],
        buffer: (() => {
          const data = Buffer.alloc(8);
          data.writeUInt32LE(12345, 0);
          data.writeUInt32LE(67890, 4);
          return data.buffer;
        })(),
        bigString: "",
      });
    });

    it("handles a message with duration", () => {
      writer.registerDefinition("msgs/test", {
        fields: [{ type: "duration", name: "value" }],
      });
      const messages = [
        {
          message: (() => {
            const data = Buffer.alloc(8);
            data.writeInt32LE(12345, 0);
            data.writeInt32LE(67890, 4);
            return data.buffer;
          })(),
          receiveTime: { sec: 1, nsec: 200 },
          topic: "/foo",
        },
      ];
      compareMessages(writer.rewriteMessages("msgs/test", messages), {
        dataType: "msgs/test",
        offsets: [0],
        buffer: (() => {
          const data = Buffer.alloc(8);
          data.writeInt32LE(12345, 0);
          data.writeInt32LE(67890, 4);
          return data.buffer;
        })(),
        bigString: "",
      });
    });
  });

  describe("strings", () => {
    it("rewrites a message with string", () => {
      writer.registerDefinition("msgs/test", {
        fields: [{ type: "string", name: "text" }],
      });
      const messages = [
        {
          message: (() => {
            const data = Buffer.alloc(13);
            data.writeUInt32LE(9, 0);
            data.write("some text", 4);
            return data.buffer;
          })(),
          receiveTime: { sec: 1, nsec: 200 },
          topic: "/foo",
        },
      ];
      compareMessages(writer.rewriteMessages("msgs/test", messages), {
        dataType: "msgs/test",
        offsets: [0],
        buffer: (() => {
          const data = Buffer.alloc(8);
          data.writeUInt32LE(9, 0);
          data.writeUInt32LE(0, 4);
          return data.buffer;
        })(),
        bigString: "some text",
      });
    });

    it("rewrites a message with an empty string", () => {
      writer.registerDefinition("msgs/test", {
        fields: [{ type: "string", name: "text" }],
      });
      const messages = [
        {
          message: (() => {
            const data = Buffer.alloc(4);
            data.writeUInt32LE(0, 0);
            return data.buffer;
          })(),
          receiveTime: { sec: 1, nsec: 200 },
          topic: "/foo",
        },
      ];
      compareMessages(writer.rewriteMessages("msgs/test", messages), {
        dataType: "msgs/test",
        offsets: [0],
        buffer: (() => {
          const data = Buffer.alloc(8);
          data.writeUInt32LE(0, 4);
          data.writeUInt32LE(0, 0);
          return data.buffer;
        })(),
        bigString: "",
      });
    });
  });

  describe("json", () => {
    it("rewrites a message with json", () => {
      writer.registerDefinition("msgs/test", {
        fields: [{ type: "json", name: "text" }],
      });
      const messages = [
        {
          message: (() => {
            const data = Buffer.alloc(27);
            data.writeUInt32LE(23, 0);
            data.write(`{ "text": "some text" }`, 4);
            return data.buffer;
          })(),
          receiveTime: { sec: 1, nsec: 200 },
          topic: "/foo",
        },
      ];
      compareMessages(writer.rewriteMessages("msgs/test", messages), {
        dataType: "msgs/test",
        offsets: [0],
        buffer: (() => {
          const data = Buffer.alloc(8);
          data.writeUInt32LE(23, 0);
          data.writeUInt32LE(0, 4);
          return data.buffer;
        })(),
        bigString: `{ "text": "some text" }`,
      });
    });

    it("rewrites a message with an empty json", () => {
      writer.registerDefinition("msgs/test", {
        fields: [{ type: "json", name: "text" }],
      });
      const messages = [
        {
          message: (() => {
            const data = Buffer.alloc(4);
            data.writeUInt32LE(0, 0);
            return data.buffer;
          })(),
          receiveTime: { sec: 1, nsec: 200 },
          topic: "/foo",
        },
      ];
      compareMessages(writer.rewriteMessages("msgs/test", messages), {
        dataType: "msgs/test",
        offsets: [0],
        buffer: (() => {
          const data = Buffer.alloc(8);
          data.writeUInt32LE(0, 4);
          data.writeUInt32LE(0, 0);
          return data.buffer;
        })(),
        bigString: "",
      });
    });
  });

  describe("arrays", () => {
    it("rewrites a message with an array of values", () => {
      writer.registerDefinition("msgs/values", {
        fields: [{ type: "float32", name: "values", isArray: true }],
      });
      const messages = [
        {
          message: (() => {
            const data = Buffer.alloc(20);
            data.writeUInt32LE(4, 0); // array size
            data.writeFloatLE(1.0, 4);
            data.writeFloatLE(-4.0, 8);
            data.writeFloatLE(-2231.0, 12);
            data.writeFloatLE(999.99, 16);
            return data.buffer;
          })(),
          receiveTime: { sec: 1, nsec: 200 },
          topic: "/foo",
        },
      ];
      compareMessages(writer.rewriteMessages("msgs/values", messages), {
        dataType: "msgs/values",
        offsets: [0],
        buffer: (() => {
          const data = Buffer.alloc(24);
          data.writeUInt32LE(4, 0);
          data.writeUInt32LE(8, 4);
          /* array data starts here */
          data.writeFloatLE(1.0, 8);
          data.writeFloatLE(-4.0, 12);
          data.writeFloatLE(-2231.0, 16);
          data.writeFloatLE(999.99, 20);
          return data.buffer;
        })(),
        bigString: "",
      });
    });

    it("rewrites a message with an empty array", () => {
      writer.registerDefinition("msgs/emptyArray", {
        fields: [{ type: "float32", name: "values", isArray: true }],
      });
      const messages = [
        {
          message: (() => {
            const data = Buffer.alloc(4);
            data.writeUInt32LE(0, 0); // array size = 0
            return data.buffer;
          })(),
          receiveTime: { sec: 1, nsec: 200 },
          topic: "/foo",
        },
      ];
      compareMessages(writer.rewriteMessages("msgs/emptyArray", messages), {
        dataType: "msgs/emptyArray",
        offsets: [0],
        buffer: (() => {
          const data = Buffer.alloc(8);
          data.writeUInt32LE(0, 0);
          data.writeUInt32LE(8, 4);
          /* array data starts here */
          // no array data since it's empty
          return data.buffer;
        })(),
        bigString: "",
      });
    });

    it("rewrites a message with a constant-sized array of values", () => {
      writer.registerDefinition("msgs/test_constant", {
        fields: [{ type: "float32", name: "values", isArray: true, arrayLength: 4 }],
      });
      const messages = [
        {
          message: (() => {
            const data = Buffer.alloc(16);
            data.writeFloatLE(1.0, 0);
            data.writeFloatLE(-4.0, 4);
            data.writeFloatLE(-2231.0, 8);
            data.writeFloatLE(999.99, 12);
            return data.buffer;
          })(),
          receiveTime: { sec: 1, nsec: 200 },
          topic: "/foo",
        },
      ];
      compareMessages(writer.rewriteMessages("msgs/test_constant", messages), {
        dataType: "msgs/test_constant",
        offsets: [0],
        buffer: (() => {
          const data = Buffer.alloc(24);
          data.writeUInt32LE(4, 0);
          data.writeUInt32LE(8, 4);
          /* array data starts here */
          data.writeFloatLE(1.0, 8);
          data.writeFloatLE(-4.0, 12);
          data.writeFloatLE(-2231.0, 16);
          data.writeFloatLE(999.99, 20);
          return data.buffer;
        })(),
        bigString: "",
      });
    });

    it("rewrites a message with a zero-sized array of values", () => {
      writer.registerDefinition("msgs/test_constant_zero", {
        fields: [{ type: "float32", name: "values", isArray: true, arrayLength: 0 }],
      });
      const messages = [
        {
          message: (() => {
            const data = Buffer.alloc(0);
            return data.buffer;
          })(),
          receiveTime: { sec: 1, nsec: 200 },
          topic: "/foo",
        },
      ];
      compareMessages(writer.rewriteMessages("msgs/test_constant_zero", messages), {
        dataType: "msgs/test_constant_zero",
        offsets: [0],
        buffer: (() => {
          const data = Buffer.alloc(8);
          data.writeUInt32LE(0, 0);
          data.writeUInt32LE(8, 4);
          /* array data starts here */
          // no array data
          return data.buffer;
        })(),
        bigString: "",
      });
    });

    it("rewrites a message with an array of strings", () => {
      writer.registerDefinition("msgs/stringArray", {
        fields: [{ type: "string", name: "lines", isArray: true }],
      });
      const messages = [
        {
          message: (() => {
            const data = Buffer.alloc(36);
            data.writeUInt32LE(5, 0); // string count
            data.writeUInt16LE(3, 4); // first string length
            data.write("asd", 8);
            data.writeUInt16LE(3, 11); // second string length
            data.write("qwe", 15);
            data.writeUInt16LE(0, 18); // third string length (empty)
            data.writeUInt16LE(4, 22); // fourth string length
            data.write("zxcv", 26);
            data.writeUInt16LE(2, 30); // fifth string length
            data.write("rt", 34);
            return data.buffer;
          })(),
          receiveTime: { sec: 1, nsec: 200 },
          topic: "/foo",
        },
      ];
      compareMessages(writer.rewriteMessages("msgs/stringArray", messages), {
        dataType: "msgs/stringArray",
        offsets: [0],
        buffer: (() => {
          const data = Buffer.alloc(48);
          // contains only offsets for array
          data.writeUInt32LE(5, 0);
          data.writeUInt32LE(8, 4);
          /* array data starts here */
          // first string offsets
          data.writeUInt32LE(3, 8);
          data.writeUInt32LE(0, 12);
          // second string offsets
          data.writeUInt32LE(3, 16);
          data.writeUInt32LE(3, 20);
          // third string offsets
          data.writeUInt32LE(0, 24);
          data.writeUInt32LE(6, 28); // (empty string)
          // fourth string offsets
          data.writeUInt32LE(4, 32);
          data.writeUInt32LE(6, 36);
          // fifth string offsets
          data.writeUInt32LE(2, 40);
          data.writeUInt32LE(10, 44);
          return data.buffer;
        })(),
        bigString: "asdqwezxcvrt",
      });
    });

    it("rewrites a message with an array of empty strings", () => {
      writer.registerDefinition("msgs/emptyStringArray", {
        fields: [{ type: "string", name: "lines", isArray: true }],
      });
      const messages = [
        {
          message: (() => {
            const data = Buffer.alloc(20);
            data.writeUInt32LE(4, 0); // string count
            data.writeUInt32LE(0, 4);
            data.writeUInt32LE(0, 8);
            data.writeUInt32LE(0, 12);
            data.writeUInt32LE(0, 16);
            return data.buffer;
          })(),
          receiveTime: { sec: 1, nsec: 200 },
          topic: "/foo",
        },
      ];
      compareMessages(writer.rewriteMessages("msgs/emptyStringArray", messages), {
        dataType: "msgs/emptyStringArray",
        offsets: [0],
        buffer: (() => {
          const data = Buffer.alloc(40);
          // contains only offsets for array
          data.writeUInt32LE(4, 0);
          data.writeUInt32LE(8, 4);
          /* array data starts here */
          // first string offsets
          data.writeUInt32LE(0, 8);
          data.writeUInt32LE(0, 12);
          // second string offsets
          data.writeUInt32LE(0, 16);
          data.writeUInt32LE(0, 20);
          // third string offsets
          data.writeUInt32LE(0, 24);
          data.writeUInt32LE(0, 28);
          // fourth string offsets
          data.writeUInt32LE(0, 32);
          data.writeUInt32LE(0, 26);
          return data.buffer;
        })(),
        bigString: "",
      });
    });

    it("rewrites a message with an array of json", () => {
      writer.registerDefinition("msgs/jsonArray", {
        fields: [{ type: "json", name: "objects", isArray: true }],
      });
      const messages = [
        {
          message: (() => {
            const data = Buffer.alloc(51);
            data.writeUInt32LE(3, 0);
            data.writeUInt16LE(12, 4);
            data.write("{ value: 1 }", 8);
            data.writeUInt16LE(21, 20);
            data.write("{ text: 'some text' }", 24);
            data.writeUInt16LE(2, 45);
            data.write("{}", 49);
            return data.buffer;
          })(),
          receiveTime: { sec: 1, nsec: 200 },
          topic: "/foo",
        },
      ];
      compareMessages(writer.rewriteMessages("msgs/jsonArray", messages), {
        dataType: "msgs/jsonArray",
        offsets: [0],
        buffer: (() => {
          const data = Buffer.alloc(32);
          // contains only offsets for array
          data.writeUInt32LE(3, 0);
          data.writeUInt32LE(8, 4);
          // first json offsets
          data.writeUInt32LE(12, 8);
          data.writeUInt32LE(0, 12);
          // second json offsets
          data.writeUInt32LE(21, 16);
          data.writeUInt32LE(12, 20);
          // third json offsets
          data.writeUInt32LE(2, 24);
          data.writeUInt32LE(33, 28);
          return data.buffer;
        })(),
        bigString: "{ value: 1 }{ text: 'some text' }{}",
      });
    });

    it("rewrites a message with an array of point arrays", () => {
      writer.registerDefinition("msgs/points", {
        fields: [{ type: "float32", name: "points", isArray: true }],
      });
      writer.registerDefinition("msgs/pointsArray", {
        fields: [{ type: "msgs/points", name: "points", isArray: true }],
      });
      const messages = [
        {
          message: (() => {
            const data = Buffer.alloc(48);
            data.writeUInt32LE(3, 0); // point array count
            // points[0]
            data.writeUInt32LE(4, 4); // point count
            data.writeFloatLE(10.5, 8); // points[0][0]
            data.writeFloatLE(43.21, 12); // points[0][1]
            data.writeFloatLE(765.15, 16); // points[0][2]
            data.writeFloatLE(-245.08, 20); // points[0][3]
            // points[1]
            data.writeUInt32LE(3, 24); // point count
            data.writeFloatLE(865.123, 28); // points[1][0]
            data.writeFloatLE(58, 32); // points[1][1]
            data.writeFloatLE(67.6, 36); // points[1][2]
            // points[2]
            data.writeUInt32LE(1, 40); // point count
            data.writeFloatLE(1.488, 44); // points[2][0]
            return data.buffer;
          })(),
          receiveTime: { sec: 1, nsec: 200 },
          topic: "/foo",
        },
      ];
      compareMessages(writer.rewriteMessages("msgs/pointsArray", messages), {
        dataType: "msgs/pointsArray",
        offsets: [0],
        buffer: (() => {
          const data = Buffer.alloc(64);
          // contains only offsets for array
          data.writeUInt32LE(3, 0);
          data.writeUInt32LE(8, 4);
          /* array data starts here */
          // first point array
          data.writeUInt32LE(4, 8);
          data.writeUInt32LE(32, 12);
          // second point array
          data.writeUInt32LE(3, 16);
          data.writeUInt32LE(48, 20);
          // third point array
          data.writeUInt32LE(1, 24);
          data.writeUInt32LE(60, 28);
          // points
          data.writeFloatLE(10.5, 32); // points[0][0]
          data.writeFloatLE(43.21, 36); // points[0][1]
          data.writeFloatLE(765.15, 40); // points[0][2]
          data.writeFloatLE(-245.08, 44); // points[0][3]
          data.writeFloatLE(865.123, 48); // points[1][0]
          data.writeFloatLE(58, 52); // points[1][1]
          data.writeFloatLE(67.6, 56); // points[1][2]
          data.writeFloatLE(1.488, 60); // points[2][0]
          return data.buffer;
        })(),
        bigString: "",
      });
    });

    it("rewrites a message with an array of empty point arrays", () => {
      writer.registerDefinition("msgs/points", {
        fields: [{ type: "float32", name: "points", isArray: true }],
      });
      writer.registerDefinition("msgs/emptyPointsArray", {
        fields: [{ type: "msgs/points", name: "points", isArray: true }],
      });
      const messages = [
        {
          message: (() => {
            const data = Buffer.alloc(20);
            data.writeUInt32LE(4, 0); // point array count
            // points[0]
            data.writeUInt32LE(0, 4); // point count
            // points[1]
            data.writeUInt32LE(0, 8); // point count
            // points[2]
            data.writeUInt32LE(0, 12); // point count
            // points[3]
            data.writeUInt32LE(0, 16); // point count
            return data.buffer;
          })(),
          receiveTime: { sec: 1, nsec: 200 },
          topic: "/foo",
        },
      ];
      compareMessages(writer.rewriteMessages("msgs/emptyPointsArray", messages), {
        dataType: "msgs/emptyPointsArray",
        offsets: [0],
        buffer: (() => {
          const data = Buffer.alloc(40);
          // contains only offsets for array
          data.writeUInt32LE(4, 0);
          data.writeUInt32LE(8, 4);
          /* array data starts here */
          // first point array
          data.writeUInt32LE(0, 8);
          data.writeUInt32LE(40, 12);
          // second point array
          data.writeUInt32LE(0, 16);
          data.writeUInt32LE(40, 20);
          // third point array
          data.writeUInt32LE(0, 24);
          data.writeUInt32LE(40, 28);
          // fourth point array
          data.writeUInt32LE(0, 32);
          data.writeUInt32LE(40, 36);
          return data.buffer;
        })(),
        bigString: "",
      });
    });

    it("handles an arrays of empty types", () => {
      expect(() => writer.registerDefinitions(definitions)).not.toThrow();

      const messages = [
        {
          message: (() => {
            const data = Buffer.alloc(4);
            data.writeUInt32LE(5, 0); // five constant elements
            return data;
          })(),
          receiveTime: { sec: 1, nsec: 200 },
          topic: "/foo",
        },
      ];

      compareMessages(writer.rewriteMessages("fake_msgs/HasArrayOfEmpties", messages), {
        dataType: "fake_msgs/HasArrayOfEmpties",
        offsets: [0],
        buffer: (() => {
          const data = Buffer.alloc(8);
          data.writeUInt32LE(5, 0);
          data.writeUInt32LE(8, 4);
          return data;
        })(),
        bigString: "",
      });
    });

    it("handles an empty arrays of empty types", () => {
      expect(() => writer.registerDefinitions(definitions)).not.toThrow();

      const messages = [
        {
          message: (() => {
            const data = Buffer.alloc(4);
            data.writeUInt32LE(0, 0); // empty
            return data;
          })(),
          receiveTime: { sec: 1, nsec: 200 },
          topic: "/foo",
        },
      ];

      compareMessages(writer.rewriteMessages("fake_msgs/HasArrayOfEmpties", messages), {
        dataType: "fake_msgs/HasArrayOfEmpties",
        offsets: [0],
        buffer: (() => {
          const data = Buffer.alloc(8);
          data.writeUInt32LE(0, 0);
          data.writeUInt32LE(8, 4);
          return data;
        })(),
        bigString: "",
      });
    });
  });

  describe("complex types", () => {
    it("handles multiple fields", () => {
      writer.registerDefinition("msgs/test", {
        fields: [
          { type: "time", name: "stamp" },
          { type: "time", name: "duration" },
          { type: "bool", name: "flag" },
          { type: "float32", name: "value" },
          { type: "string", name: "text" },
          { type: "int32", name: "moreValues", isArray: true },
          { type: "uint32", name: "lastValue" },
        ],
      });
      const messages = [
        {
          message: (() => {
            const data = Buffer.alloc(58);
            data.writeUInt32LE(1, 0); // time.sec
            data.writeUInt32LE(1, 4); // time.nsec
            data.writeUInt32LE(9876, 8); // duration.sec
            data.writeUInt32LE(5432, 12); // duration.nsec
            data.writeInt8(1, 16); // bool
            data.writeFloatLE(123.4567, 17); // float32
            data.writeUInt32LE(9, 21); // string len
            data.write("some text", 25); // string
            data.writeUInt32LE(4, 34); // array len
            data.writeInt32LE(234, 38); // array[0]
            data.writeInt32LE(146, 42); // array[1]
            data.writeInt32LE(976, 46); // array[2]
            data.writeInt32LE(768, 50); // array[3]
            data.writeUInt32LE(8989, 54); // uint32
            return data.buffer;
          })(),
          receiveTime: { sec: 1, nsec: 200 },
          topic: "/foo",
        },
      ];
      compareMessages(writer.rewriteMessages("msgs/test", messages), {
        dataType: "msgs/test",
        offsets: [0],
        buffer: (() => {
          const data = Buffer.alloc(57);
          data.writeUInt32LE(1, 0); // time.sec
          data.writeUInt32LE(1, 4); // time.nsec
          data.writeUInt32LE(9876, 8); // duration.sec
          data.writeUInt32LE(5432, 12); // duration.nsec
          data.writeInt8(1, 16); // bool
          data.writeFloatLE(123.4567, 17); // float32
          data.writeUInt32LE(9, 21); // string offset
          data.writeUInt32LE(0, 25); // string end
          data.writeUInt32LE(4, 29); // array offset
          data.writeUInt32LE(41, 33); // array end
          data.writeUInt32LE(8989, 37); // uint32
          /* array data starts here */
          data.writeInt32LE(234, 41); // array[0]
          data.writeInt32LE(146, 45); // array[1]
          data.writeInt32LE(976, 49); // array[2]
          data.writeInt32LE(768, 53); // array[3]
          return data.buffer;
        })(),
        bigString: "some text",
      });
    });

    it("handles a complex type with no fields", () => {
      writer.registerDefinition("msgs/emptyComplex", {
        fields: [],
      });
      const messages = [
        {
          message: (() => {
            const data = Buffer.alloc(0);
            return data.buffer;
          })(),
          receiveTime: { sec: 1, nsec: 200 },
          topic: "/foo",
        },
      ];
      compareMessages(writer.rewriteMessages("msgs/emptyComplex", messages), {
        dataType: "msgs/emptyComplex",
        offsets: [0],
        buffer: new ArrayBuffer(0),
        bigString: "",
      });
    });

    it("rewrites a message with header", () => {
      writer.registerDefinition("std_msgs/Header", definitions["std_msgs/Header"]);
      writer.registerDefinition("msgs/test", {
        fields: [{ type: "std_msgs/Header", name: "header", isComplex: true }, { type: "int32", name: "value" }],
      });
      const messages = [
        {
          message: (() => {
            const data = Buffer.alloc(31);
            data.writeUInt32LE(7643, 0); // header.seq
            data.writeUInt32LE(1234, 4); // header.time.sec
            data.writeUInt32LE(5678, 8); // header.time.nsec
            data.writeUInt32LE(11, 12); // header.frameId (length)
            data.write("someFrameId", 16); // header.frameId (string)
            data.writeInt32LE(9999, 27); // value
            return data.buffer;
          })(),
          receiveTime: { sec: 1, nsec: 200 },
          topic: "/foo",
        },
      ];
      compareMessages(writer.rewriteMessages("msgs/test", messages), {
        dataType: "msgs/test",
        offsets: [0],
        buffer: (() => {
          const data = Buffer.alloc(24);
          data.writeUInt32LE(7643, 0); // header.seq
          data.writeUInt32LE(1234, 4); // header.time.sec
          data.writeUInt32LE(5678, 8); // header.time.nsec
          data.writeUInt32LE(11, 12); // header.frameId (str begin)
          data.writeUInt32LE(0, 16); // header.frameId (str end)
          data.writeInt32LE(9999, 20); // value
          /* array data starts here */
          // no array data
          return data.buffer;
        })(),
        bigString: "someFrameId",
      });
    });

    it("rewrites a message with definitions in any order", () => {
      expect(() =>
        writer.registerDefinitions({
          "msgs/test": {
            fields: [{ type: "std_msgs/Header", name: "header", isComplex: true }, { type: "int32", name: "value" }],
          },
          "std_msgs/Header": definitions["std_msgs/Header"],
        })
      ).not.toThrow();
      const messages = [
        {
          message: (() => {
            const data = Buffer.alloc(31);
            data.writeUInt32LE(7643, 0); // header.seq
            data.writeUInt32LE(1234, 4); // header.time.sec
            data.writeUInt32LE(5678, 8); // header.time.nsec
            data.writeUInt32LE(11, 12); // header.frameId (length)
            data.write("someFrameId", 16); // header.frameId (string)
            data.writeInt32LE(9999, 27); // value
            return data.buffer;
          })(),
          receiveTime: { sec: 1, nsec: 200 },
          topic: "/foo",
        },
      ];
      compareMessages(writer.rewriteMessages("msgs/test", messages), {
        dataType: "msgs/test",
        offsets: [0],
        buffer: (() => {
          const data = Buffer.alloc(24);
          data.writeUInt32LE(7643, 0); // header.seq
          data.writeUInt32LE(1234, 4); // header.time.sec
          data.writeUInt32LE(5678, 8); // header.time.nsec
          data.writeUInt32LE(11, 12); // header.frameId (str begin)
          data.writeUInt32LE(0, 16); // header.frameId (str end)
          data.writeInt32LE(9999, 20); // value
          /* array data starts here */
          // no array data
          return data.buffer;
        })(),
        bigString: "someFrameId",
      });
    });
  });

  describe("multiple messages", () => {
    it("handles two messages with the same topic", () => {
      writer.registerDefinitions({
        "std_msgs/Header": definitions["std_msgs/Header"],
        "msgs/test": {
          fields: [
            { type: "std_msgs/Header", name: "header", isComplex: true },
            { type: "int32", name: "value" },
            { type: "float32", name: "points", isArray: true },
          ],
        },
      });
      const messages = [
        {
          message: (() => {
            const data = Buffer.alloc(51);
            data.writeUInt32LE(7643, 0); // header.seq
            data.writeUInt32LE(1234, 4); // header.time.sec
            data.writeUInt32LE(5678, 8); // header.time.nsec
            data.writeUInt32LE(11, 12); // header.frameId (length)
            data.write("someFrameId", 16); // header.frameId (string)
            data.writeInt32LE(9999, 27); // value
            data.writeUInt32LE(4, 31); // point count
            data.writeFloatLE(0.5, 35); // points[0]
            data.writeFloatLE(-0.5, 39); // points[0]
            data.writeFloatLE(3.25, 43); // points[1]
            data.writeFloatLE(8.72, 47); // points[2]
            return data.buffer;
          })(),
          receiveTime: { sec: 1, nsec: 200 },
          topic: "/foo",
        },
        {
          message: (() => {
            const data = Buffer.alloc(48);
            data.writeUInt32LE(9875, 0); // header.seq
            data.writeUInt32LE(2314, 4); // header.time.sec
            data.writeUInt32LE(6389, 8); // header.time.nsec
            data.writeUInt32LE(12, 12); // header.frameId (length)
            data.write("otherFrameId", 16); // header.frameId (string)
            data.writeInt32LE(5771, 28); // value
            data.writeUInt32LE(3, 32); // point count
            data.writeFloatLE(-2.45, 36); // points[0]
            data.writeFloatLE(3.165, 40); // points[1]
            data.writeFloatLE(0.9871, 44); // points[2]
            return data.buffer;
          })(),
          receiveTime: { sec: 2, nsec: 50 },
          topic: "/foo",
        },
      ];
      const buffer = (() => {
        const data = Buffer.alloc(92);
        // first message
        data.writeUInt32LE(7643, 0); // header.seq
        data.writeUInt32LE(1234, 4); // header.time.sec
        data.writeUInt32LE(5678, 8); // header.time.nsec
        data.writeUInt32LE(11, 12); // header.frameId (str begin)
        data.writeUInt32LE(0, 16); // header.frameId (str end)
        data.writeInt32LE(9999, 20); // value
        data.writeUInt32LE(4, 24); // points begin
        data.writeUInt32LE(32, 28); // points end
        data.writeFloatLE(0.5, 32); // message 1, points[0]
        data.writeFloatLE(-0.5, 36); // message 1, points[0]
        data.writeFloatLE(3.25, 40); // message 1, points[1]
        data.writeFloatLE(8.72, 44); // message 1, points[2]
        // second message
        data.writeUInt32LE(9875, 48); // header.seq
        data.writeUInt32LE(2314, 52); // header.time.sec
        data.writeUInt32LE(6389, 56); // header.time.nsec
        data.writeUInt32LE(12, 60); // header.frameId (str begin)
        data.writeUInt32LE(11, 64); // header.frameId (str end)
        data.writeInt32LE(5771, 68); // value
        data.writeUInt32LE(3, 72); // points begin
        data.writeUInt32LE(80, 76); // points end
        data.writeFloatLE(-2.45, 80); // message 2, points[0]
        data.writeFloatLE(3.165, 84); // message 2, points[1]
        data.writeFloatLE(0.9871, 88); // message 2, points[2]
        return data.buffer;
      })();
      const bigString = "someFrameIdotherFrameId";

      compareMessages(writer.rewriteMessages("msgs/test", messages), {
        dataType: "msgs/test",
        offsets: [0, 48],
        buffer,
        bigString,
      });
    });

    it("handles marker arrays with points (simplified)", () => {
      writer.registerDefinition("std_msgs/Header", definitions["std_msgs/Header"]);
      writer.registerDefinition("visualization_msgs/Marker", {
        fields: [
          { type: "std_msgs/Header", name: "header", isComplex: true },
          { type: "uint32", name: "type" },
          { type: "float64", name: "points", isArray: true }, // simplified
        ],
      });
      writer.registerDefinition("visualization_msgs/MarkerArray", {
        fields: [{ type: "visualization_msgs/Marker", name: "markers", isArray: true }],
      });
      const messages = [
        {
          message: (() => {
            const data = Buffer.alloc(138);
            data.writeUInt32LE(2, 0); // marker array count
            // marker[0]
            data.writeUInt32LE(7643, 4); // header.seq
            data.writeUInt32LE(1234, 8); // header.time.sec
            data.writeUInt32LE(5678, 12); // header.time.nsec
            data.writeUInt32LE(11, 16); // header.frameId (length)
            data.write("someFrameId", 20); // header.frameId (string)
            data.writeUInt32LE(8, 31); // type
            data.writeUInt32LE(4, 35); // point count
            data.writeDoubleLE(10.5, 39); // points[0]
            data.writeDoubleLE(43.21, 47); // points[1]
            data.writeDoubleLE(765.15, 55); // points[2]
            data.writeDoubleLE(-245.08, 63); // points[3]
            // marker[1]
            data.writeUInt32LE(7643, 71); // header.seq
            data.writeUInt32LE(1234, 75); // header.time.sec
            data.writeUInt32LE(5678, 79); // header.time.nsec
            data.writeUInt32LE(11, 83); // header.frameId (length)
            data.write("someFrameId", 87); // header.frameId (string)
            data.writeUInt32LE(8, 98); // type
            data.writeUInt32LE(4, 102); // point count
            data.writeDoubleLE(10.5, 106); // points[0]
            data.writeDoubleLE(43.21, 114); // points[1]
            data.writeDoubleLE(765.15, 122); // points[2]
            data.writeDoubleLE(-245.08, 130); // points[3]
            return data.buffer;
          })(),
          receiveTime: { sec: 1, nsec: 200 },
          topic: "/foo",
        },
      ];
      compareMessages(writer.rewriteMessages("visualization_msgs/MarkerArray", messages), {
        dataType: "visualization_msgs/MarkerArray",
        offsets: [0],
        buffer: (() => {
          const data = Buffer.alloc(136);
          data.writeUInt32LE(2, 0);
          data.writeUInt32LE(8, 4);

          // first marker
          data.writeUInt32LE(7643, 8); // header.seq
          data.writeUInt32LE(1234, 12); // header.time.sec
          data.writeUInt32LE(5678, 16); // header.time.nsec
          data.writeUInt32LE(11, 20); // header.frameId (str begin)
          data.writeUInt32LE(0, 24); // header.frameId (str end)
          data.writeUInt32LE(8, 28); // type
          data.writeUInt32LE(4, 32); // point start offset
          data.writeUInt32LE(72, 36); // point end offset

          // second marker
          data.writeUInt32LE(7643, 40); // header.seq
          data.writeUInt32LE(1234, 44); // header.time.sec
          data.writeUInt32LE(5678, 48); // header.time.nsec
          data.writeUInt32LE(11, 52); // header.frameId (str begin)
          data.writeUInt32LE(11, 56); // header.frameId (str end)
          data.writeUInt32LE(8, 60); // type
          data.writeUInt32LE(4, 64); // point start offset
          data.writeUInt32LE(104, 68); // point end offset

          // first marker points
          data.writeDoubleLE(10.5, 72); // points[0]
          data.writeDoubleLE(43.21, 80); // points[1]
          data.writeDoubleLE(765.15, 88); // points[2]
          data.writeDoubleLE(-245.08, 96); // points[3]

          // second marker points
          data.writeDoubleLE(10.5, 104); // points[0]
          data.writeDoubleLE(43.21, 112); // points[1]
          data.writeDoubleLE(765.15, 120); // points[2]
          data.writeDoubleLE(-245.08, 128); // points[3]
          return data.buffer;
        })(),
        bigString: "someFrameIdsomeFrameId",
      });
    });
  });

  describe("undefined types", () => {
    it("fails when attempting to write message with unknown definition", () => {
      disableConsoleWarnings();

      const messages = [
        {
          message: (() => {
            const data = Buffer.alloc(4);
            data.writeInt32LE(1, 0);
            return data.buffer;
          })(),
          receiveTime: { sec: 1, nsec: 200 },
          topic: "/foo",
        },
      ];
      expect(() => writer.rewriteMessages(`msgs/int32`, messages)).toThrow(
        `No definition found with type "msgs/int32"`
      );
    });

    it("fails when attempting to write message with undefined types within complex definitions", () => {
      disableConsoleWarnings();
      expect(() =>
        writer.registerDefinition("visualization_msgs/Marker", {
          fields: [
            { type: "std_msgs/Header", name: "header", isComplex: true }, // not defined
            { type: "uint32", name: "type" },
            { type: "float64", name: "points", isArray: true },
          ],
        })
      ).toThrow();
      expect(() =>
        writer.registerDefinition("visualization_msgs/MarkerArray", {
          fields: [{ type: "visualization_msgs/Marker", name: "markers", isArray: true }],
        })
      ).toThrow();
      const messages = [
        {
          message: (() => {
            const data = Buffer.alloc(71);
            data.writeUInt32LE(1, 0); // marker array count
            // marker[0]
            data.writeUInt32LE(7643, 4); // header.seq
            data.writeUInt32LE(1234, 8); // header.time.sec
            data.writeUInt32LE(5678, 12); // header.time.nsec
            data.writeUInt32LE(11, 16); // header.frameId (length)
            data.write("someFrameId", 20); // header.frameId (string)
            data.writeUInt32LE(8, 31); // type
            data.writeUInt32LE(4, 35); // point count
            data.writeDoubleLE(10.5, 39); // points[0]
            data.writeDoubleLE(43.21, 47); // points[1]
            data.writeDoubleLE(765.15, 55); // points[2]
            data.writeDoubleLE(-245.08, 63); // points[3]
            return data.buffer;
          })(),
          receiveTime: { sec: 1, nsec: 200 },
          topic: "/foo",
        },
      ];
      expect(() => writer.rewriteMessages(`visualization_msgs/MarkerArray`, messages)).toThrow(
        `Could not write message from "/foo" with undefined type "visualization_msgs/MarkerArray"`
      );
    });
  });

  describe("performance", () => {
    it("rewrites messages with lots of points", () => {
      writer.registerDefinitions({
        "std_msgs/Header": definitions["std_msgs/Header"],
        "msgs/test": {
          fields: [
            { type: "std_msgs/Header", name: "header", isComplex: true },
            { type: "int32", name: "value" },
            { type: "float32", name: "points", isArray: true },
          ],
        },
      });

      // Create a message with lots of points
      const message = {
        message: (() => {
          const pointCount = 100000;
          const offset = 35;
          const data = Buffer.alloc(offset + pointCount * 4);
          data.writeUInt32LE(7643, 0); // header.seq
          data.writeUInt32LE(1234, 4); // header.time.sec
          data.writeUInt32LE(5678, 8); // header.time.nsec
          data.writeUInt32LE(11, 12); // header.frameId (length)
          data.write("someFrameId", 16); // header.frameId (string)
          data.writeInt32LE(9999, 27); // value
          data.writeUInt32LE(pointCount, 31); // point count
          for (let i = 0; i < pointCount; i++) {
            data.writeFloatLE(0.5, offset + 4 * i);
          }
          return data.buffer;
        })(),
        receiveTime: { sec: 1, nsec: 200 },
        topic: "/foo",
      };

      const messages = [message, message, message];

      // run the test several times
      for (let i = 0; i < 100; i++) {
        expect(() => writer.rewriteMessages("msgs/test", messages)).not.toThrow();
      }
    });
  });
});
