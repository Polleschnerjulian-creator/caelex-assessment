import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockRedis } = vi.hoisted(() => {
  // Set env vars inside vi.hoisted so they are available when the module loads.
  process.env.UPSTASH_REDIS_REST_URL = "https://test.upstash.io";
  process.env.UPSTASH_REDIS_REST_TOKEN = "test-token";

  return {
    mockRedis: {
      get: vi.fn(),
      set: vi.fn(),
      del: vi.fn(),
      keys: vi.fn(),
    },
  };
});

vi.mock("server-only", () => ({}));

vi.mock("@upstash/redis", () => {
  // Use a real function constructor so `new Redis(...)` works
  function MockRedis() {
    return mockRedis;
  }
  return { Redis: MockRedis };
});

import {
  cacheGet,
  cacheSet,
  cacheDelete,
  withCache,
  invalidatePattern,
} from "@/lib/cache.server";

describe("Cache Server", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("cacheGet", () => {
    it("should return parsed JSON value on cache hit", async () => {
      mockRedis.get.mockResolvedValue(JSON.stringify({ foo: "bar" }));

      const result = await cacheGet<{ foo: string }>("test-key");

      expect(result).toEqual({ foo: "bar" });
      expect(mockRedis.get).toHaveBeenCalledWith("caelex:cache:test-key");
    });

    it("should return null on cache miss", async () => {
      mockRedis.get.mockResolvedValue(null);

      const result = await cacheGet("missing-key");

      expect(result).toBeNull();
    });

    it("should return null on redis error", async () => {
      mockRedis.get.mockRejectedValue(new Error("Redis connection failed"));

      const result = await cacheGet("error-key");

      expect(result).toBeNull();
    });

    it("should prefix keys with caelex:cache:", async () => {
      mockRedis.get.mockResolvedValue(null);

      await cacheGet("my-key");

      expect(mockRedis.get).toHaveBeenCalledWith("caelex:cache:my-key");
    });

    it("should parse string values", async () => {
      mockRedis.get.mockResolvedValue(JSON.stringify("hello world"));

      const result = await cacheGet<string>("string-key");

      expect(result).toBe("hello world");
    });

    it("should parse array values", async () => {
      mockRedis.get.mockResolvedValue(JSON.stringify([1, 2, 3]));

      const result = await cacheGet<number[]>("array-key");

      expect(result).toEqual([1, 2, 3]);
    });

    it("should parse number values", async () => {
      mockRedis.get.mockResolvedValue(JSON.stringify(42));

      const result = await cacheGet<number>("number-key");

      expect(result).toBe(42);
    });
  });

  describe("cacheSet", () => {
    it("should serialize and set value with default TTL", async () => {
      mockRedis.set.mockResolvedValue("OK");

      await cacheSet("set-key", { data: "value" });

      expect(mockRedis.set).toHaveBeenCalledWith(
        "caelex:cache:set-key",
        JSON.stringify({ data: "value" }),
        { ex: 300 },
      );
    });

    it("should use custom TTL when provided", async () => {
      mockRedis.set.mockResolvedValue("OK");

      await cacheSet("ttl-key", "value", 600);

      expect(mockRedis.set).toHaveBeenCalledWith(
        "caelex:cache:ttl-key",
        JSON.stringify("value"),
        { ex: 600 },
      );
    });

    it("should not throw on redis error", async () => {
      mockRedis.set.mockRejectedValue(new Error("Redis write error"));

      // Should not throw
      await expect(cacheSet("error-key", "value")).resolves.toBeUndefined();
    });

    it("should prefix keys with caelex:cache:", async () => {
      mockRedis.set.mockResolvedValue("OK");

      await cacheSet("prefix-test", "data");

      expect(mockRedis.set).toHaveBeenCalledWith(
        "caelex:cache:prefix-test",
        expect.any(String),
        expect.any(Object),
      );
    });
  });

  describe("cacheDelete", () => {
    it("should delete key from redis", async () => {
      mockRedis.del.mockResolvedValue(1);

      await cacheDelete("del-key");

      expect(mockRedis.del).toHaveBeenCalledWith("caelex:cache:del-key");
    });

    it("should not throw on redis error", async () => {
      mockRedis.del.mockRejectedValue(new Error("Redis delete error"));

      await expect(cacheDelete("error-key")).resolves.toBeUndefined();
    });

    it("should prefix keys with caelex:cache:", async () => {
      mockRedis.del.mockResolvedValue(1);

      await cacheDelete("my-delete-key");

      expect(mockRedis.del).toHaveBeenCalledWith("caelex:cache:my-delete-key");
    });
  });

  describe("withCache", () => {
    it("should return cached value on cache hit", async () => {
      mockRedis.get.mockResolvedValue(JSON.stringify({ cached: true }));

      const fn = vi.fn().mockResolvedValue({ cached: false });

      const result = await withCache("hit-key", fn);

      expect(result).toEqual({ cached: true });
      expect(fn).not.toHaveBeenCalled();
    });

    it("should call fn on cache miss and cache the result", async () => {
      mockRedis.get.mockResolvedValue(null);
      mockRedis.set.mockResolvedValue("OK");

      const fn = vi.fn().mockResolvedValue({ fresh: true });

      const result = await withCache("miss-key", fn);

      expect(result).toEqual({ fresh: true });
      expect(fn).toHaveBeenCalled();
      // Wait for fire-and-forget cacheSet
      await new Promise((r) => setTimeout(r, 50));
      expect(mockRedis.set).toHaveBeenCalledWith(
        "caelex:cache:miss-key",
        JSON.stringify({ fresh: true }),
        { ex: 300 },
      );
    });

    it("should use custom TTL", async () => {
      mockRedis.get.mockResolvedValue(null);
      mockRedis.set.mockResolvedValue("OK");

      const fn = vi.fn().mockResolvedValue("data");

      await withCache("ttl-key", fn, 120);

      await new Promise((r) => setTimeout(r, 50));
      expect(mockRedis.set).toHaveBeenCalledWith(
        "caelex:cache:ttl-key",
        JSON.stringify("data"),
        { ex: 120 },
      );
    });

    it("should still return result even if caching fails", async () => {
      mockRedis.get.mockResolvedValue(null);
      mockRedis.set.mockRejectedValue(new Error("Cache write fail"));

      const fn = vi.fn().mockResolvedValue("result");

      const result = await withCache("fail-cache-key", fn);

      expect(result).toBe("result");
    });
  });

  describe("no redis configured", () => {
    it("should gracefully handle missing redis", async () => {
      vi.resetModules();

      // Remove env vars so redis = null
      const origUrl = process.env.UPSTASH_REDIS_REST_URL;
      const origToken = process.env.UPSTASH_REDIS_REST_TOKEN;
      delete process.env.UPSTASH_REDIS_REST_URL;
      delete process.env.UPSTASH_REDIS_REST_TOKEN;

      vi.doMock("server-only", () => ({}));
      vi.doMock("@upstash/redis", () => ({
        Redis: vi.fn(),
      }));

      const mod = await import("@/lib/cache.server");

      // cacheGet returns null
      expect(await mod.cacheGet("k")).toBeNull();
      // cacheSet returns undefined (noop)
      expect(await mod.cacheSet("k", "v")).toBeUndefined();
      // cacheDelete returns undefined (noop)
      expect(await mod.cacheDelete("k")).toBeUndefined();
      // invalidatePattern returns undefined (noop)
      expect(await mod.invalidatePattern("p")).toBeUndefined();
      // withCache calls fn directly
      const fn = vi.fn().mockResolvedValue("direct");
      expect(await mod.withCache("k", fn)).toBe("direct");
      expect(fn).toHaveBeenCalled();

      // Restore
      process.env.UPSTASH_REDIS_REST_URL = origUrl;
      process.env.UPSTASH_REDIS_REST_TOKEN = origToken;
    });
  });

  describe("invalidatePattern", () => {
    it("should find and delete keys matching pattern", async () => {
      mockRedis.keys.mockResolvedValue([
        "caelex:cache:jurisdictions:DE",
        "caelex:cache:jurisdictions:FR",
      ]);
      mockRedis.del.mockResolvedValue(2);

      await invalidatePattern("jurisdictions");

      expect(mockRedis.keys).toHaveBeenCalledWith(
        "caelex:cache:jurisdictions*",
      );
      expect(mockRedis.del).toHaveBeenCalledWith(
        "caelex:cache:jurisdictions:DE",
        "caelex:cache:jurisdictions:FR",
      );
    });

    it("should not call del if no keys match", async () => {
      mockRedis.keys.mockResolvedValue([]);

      await invalidatePattern("nonexistent");

      expect(mockRedis.keys).toHaveBeenCalledWith("caelex:cache:nonexistent*");
      expect(mockRedis.del).not.toHaveBeenCalled();
    });

    it("should not throw on redis error", async () => {
      mockRedis.keys.mockRejectedValue(new Error("Redis keys error"));

      await expect(invalidatePattern("error-pattern")).resolves.toBeUndefined();
    });

    it("should prefix pattern with caelex:cache:", async () => {
      mockRedis.keys.mockResolvedValue([]);

      await invalidatePattern("test-prefix");

      expect(mockRedis.keys).toHaveBeenCalledWith("caelex:cache:test-prefix*");
    });
  });
});
