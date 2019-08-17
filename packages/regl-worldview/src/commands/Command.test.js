// @flow
import { makeCommand } from "./Command";

describe("makeCommand", () => {
  it("attaches the regl command to the component constructor", () => {
    const fakeReglCommand = () => {};
    const cmd = makeCommand("foo", fakeReglCommand);
    expect(cmd.displayName).toEqual("foo");
    expect(cmd.reglCommand).toBe(fakeReglCommand);
  });
});
