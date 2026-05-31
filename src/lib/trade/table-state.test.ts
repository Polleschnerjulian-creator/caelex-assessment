import { describe, it, expect } from "vitest";
import {
  nextSort,
  sortRows,
  toggleId,
  selectAllState,
  toggleSelectAll,
} from "./table-state";

describe("nextSort", () => {
  it("new key → asc", () =>
    expect(nextSort({ key: null, dir: "asc" }, "name")).toEqual({
      key: "name",
      dir: "asc",
    }));
  it("same key asc → desc", () =>
    expect(nextSort({ key: "name", dir: "asc" }, "name")).toEqual({
      key: "name",
      dir: "desc",
    }));
  it("same key desc → cleared", () =>
    expect(nextSort({ key: "name", dir: "desc" }, "name")).toEqual({
      key: null,
      dir: "asc",
    }));
  it("switch key → asc", () =>
    expect(nextSort({ key: "name", dir: "desc" }, "sku")).toEqual({
      key: "sku",
      dir: "asc",
    }));
});

describe("sortRows", () => {
  const rows = [{ n: "b" }, { n: "a" }, { n: "c" }];
  it("asc", () =>
    expect(sortRows(rows, (r) => r.n, "asc").map((r) => r.n)).toEqual([
      "a",
      "b",
      "c",
    ]));
  it("desc", () =>
    expect(sortRows(rows, (r) => r.n, "desc").map((r) => r.n)).toEqual([
      "c",
      "b",
      "a",
    ]));
  it("does not mutate input", () => {
    const before = JSON.stringify(rows);
    sortRows(rows, (r) => r.n, "asc");
    expect(JSON.stringify(rows)).toBe(before);
  });
});

describe("toggleId", () => {
  it("adds when absent", () =>
    expect([...toggleId(new Set<string>(), "x")]).toEqual(["x"]));
  it("removes when present", () =>
    expect([...toggleId(new Set(["x"]), "x")]).toEqual([]));
  it("returns a new set", () => {
    const s = new Set(["a"]);
    expect(toggleId(s, "b")).not.toBe(s);
  });
});

describe("selectAllState", () => {
  it("none when empty selection", () =>
    expect(selectAllState(new Set(), ["a", "b"])).toBe("none"));
  it("all when every visible selected", () =>
    expect(selectAllState(new Set(["a", "b"]), ["a", "b"])).toBe("all"));
  it("some when partial", () =>
    expect(selectAllState(new Set(["a"]), ["a", "b"])).toBe("some"));
  it("none when no visible rows", () =>
    expect(selectAllState(new Set(["a"]), [])).toBe("none"));
});

describe("toggleSelectAll", () => {
  it("selects all visible when partial", () =>
    expect([...toggleSelectAll(new Set(["a"]), ["a", "b"])].sort()).toEqual([
      "a",
      "b",
    ]));
  it("deselects visible when all selected", () =>
    expect([...toggleSelectAll(new Set(["a", "b", "z"]), ["a", "b"])]).toEqual([
      "z",
    ]));
  it("preserves out-of-view selections", () =>
    expect(toggleSelectAll(new Set(["a", "b", "z"]), ["a", "b"]).has("z")).toBe(
      true,
    ));
});
