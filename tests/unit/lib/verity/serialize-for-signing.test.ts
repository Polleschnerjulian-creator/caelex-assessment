import { describe, it, expect } from "vitest";
import { serializeForSigning } from "@/lib/verity/utils/serialize-for-signing";

describe("serializeForSigning", () => {
  it("extracts only specified fields", () => {
    const obj = { a: 1, b: 2, c: 3 };
    const buf = serializeForSigning(obj, ["a", "c"]);
    expect(buf.toString("utf8")).toBe('{"a":1,"c":3}');
  });

  it("produces identical output regardless of field list order", () => {
    const obj = { name: "test", version: "1.0", data: 42 };
    const buf1 = serializeForSigning(obj, ["data", "name", "version"]);
    const buf2 = serializeForSigning(obj, ["version", "name", "data"]);
    expect(buf1.toString("utf8")).toBe(buf2.toString("utf8"));
  });

  it("throws on missing required field", () => {
    const obj = { a: 1 };
    expect(() => serializeForSigning(obj, ["a", "b"])).toThrow(
      'required field "b" is undefined',
    );
  });

  it("returns a Buffer", () => {
    const buf = serializeForSigning({ a: 1 }, ["a"]);
    expect(Buffer.isBuffer(buf)).toBe(true);
  });

  it("encodes as UTF-8", () => {
    const obj = { text: "hëllo wörld" };
    const buf = serializeForSigning(obj, ["text"]);
    expect(buf.toString("utf8")).toContain("hëllo wörld");
  });

  it("handles nested objects in signed fields", () => {
    const obj = {
      claim: { type: "ABOVE", value: 15 },
      id: "test",
    };
    const buf = serializeForSigning(obj, ["claim", "id"]);
    const parsed = JSON.parse(buf.toString("utf8"));
    expect(parsed.claim.type).toBe("ABOVE");
  });
});
