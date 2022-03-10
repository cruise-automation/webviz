// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { parseMessageDefinition } from "rosbag";

import {
  basicDatatypes,
  getContentBasedDatatypes,
  getTransitiveSubsetForDatatypes,
  resetDatatypePrefixForTest,
} from "./datatypes";

describe("getTransitiveSubsetForDatatypes ", () => {
  it("works for an empty set of types", () => {
    expect(getTransitiveSubsetForDatatypes(basicDatatypes, [])).toEqual({});
  });

  it("works for type with no children", () => {
    expect(Object.keys(getTransitiveSubsetForDatatypes(basicDatatypes, ["std_msgs/Header"]))).toEqual([
      "std_msgs/Header",
    ]);
  });

  it("works for types with children", () => {
    expect(new Set(Object.keys(getTransitiveSubsetForDatatypes(basicDatatypes, ["geometry_msgs/Pose"])))).toEqual(
      new Set(["geometry_msgs/Pose", "geometry_msgs/Point", "geometry_msgs/Quaternion"])
    );
  });

  it("works when some input types have children and others don't", () => {
    expect(
      new Set(Object.keys(getTransitiveSubsetForDatatypes(basicDatatypes, ["geometry_msgs/Pose", "std_msgs/Header"])))
    ).toEqual(new Set(["geometry_msgs/Pose", "geometry_msgs/Point", "geometry_msgs/Quaternion", "std_msgs/Header"]));
  });

  it("throws for unknown datatypes", () => {
    expect(() => getTransitiveSubsetForDatatypes(basicDatatypes, ["nonstd_msgs/Asdf"])).toThrow(
      "Definition missing for type nonstd_msgs/Asdf"
    );
  });
});

describe("getContentBasedDatatypes", () => {
  beforeEach(resetDatatypePrefixForTest);
  it("maps equivalent datatypes to the same type", () => {
    const messageDefinitionsByTopic = { topic1: "string value", topic2: "string value" };
    // These messages should be the same even if they have differet names.
    const parsedMessageDefinitionsByTopic = {
      topic1: parseMessageDefinition("string value", "nonstd_msgs/String"),
      topic2: parseMessageDefinition("string value", "std_msgs/String"),
    };
    const datatypesByTopic = { topic1: "nonstd_msgs/String", topic2: "std_msgs/String" };
    const { rewrittenDatatypeIdsByTopic, rewrittenDatatypes } = getContentBasedDatatypes(
      messageDefinitionsByTopic,
      parsedMessageDefinitionsByTopic,
      datatypesByTopic
    );
    expect(Object.keys(rewrittenDatatypes)).toHaveLength(1);
    expect(rewrittenDatatypeIdsByTopic.topic1).toBe(rewrittenDatatypeIdsByTopic.topic2);
    expect(rewrittenDatatypes[rewrittenDatatypeIdsByTopic.topic1]).toEqual({
      name: "nonstd_msgs/String", // Original/real name, not new/fake name.
      fields: [{ isArray: false, isComplex: false, name: "value", type: "string" }],
    });
  });

  it("maps different datatypes to the different types", () => {
    // These types differ only in the _name_ of the field in DifferentNestedDatatype.
    // This should be enough to make the top-level datatypes distinct, even if they
    // have the same name and are "shallow-equal".
    const type1 = `test_msgs/DifferentNestedType foo
test_msgs/SameNestedType bar
===================================
MSG: test_msgs/DifferentNestedType
int32 value1
===================================
MSG: test_msgs/SameNestedType
int32 value`;
    const type2 = `test_msgs/DifferentNestedType foo
test_msgs/SameNestedType bar
===================================
MSG: test_msgs/DifferentNestedType
int32 value2
===================================
MSG: test_msgs/SameNestedType
int32 value`;

    const messageDefinitionsByTopic = { topic1: type1, topic2: type2 };
    const parsedMessageDefinitionsByTopic = {
      topic1: parseMessageDefinition(type1, "name"),
      topic2: parseMessageDefinition(type2, "name"),
    };
    const datatypesByTopic = { topic1: "name", topic2: "name" };
    const { rewrittenDatatypeIdsByTopic, rewrittenDatatypes } = getContentBasedDatatypes(
      messageDefinitionsByTopic,
      parsedMessageDefinitionsByTopic,
      datatypesByTopic
    );
    // Two different top-level types, two different nested types, one same nested type.
    expect(Object.keys(rewrittenDatatypes)).toHaveLength(5);
    expect({ rewrittenDatatypeIdsByTopic, rewrittenDatatypes }).toMatchSnapshot();
  });
});
