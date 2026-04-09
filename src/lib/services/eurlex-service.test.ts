import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    regulatoryUpdate: {
      findMany: vi.fn(),
      create: vi.fn(),
    },
  },
}));
vi.mock("@/lib/logger", () => ({
  logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn() },
}));

import { prisma } from "@/lib/prisma";
import {
  processNewDocuments,
  getRecentHighPriorityUpdates,
} from "./eurlex-service";

// Helper to build a SPARQL JSON response
function sparqlResponse(
  bindings: Array<{
    celex: string;
    title: string;
    type: string;
    date: string;
    work: string;
  }>,
) {
  return {
    results: {
      bindings: bindings.map((b) => ({
        celex: { value: b.celex },
        title: { value: b.title },
        type: { value: b.type },
        date: { value: b.date },
        work: { value: b.work },
      })),
    },
  };
}

describe("eurlex-service", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    fetchMock = vi.fn();
    global.fetch = fetchMock;
  });

  describe("processNewDocuments", () => {
    it("should fetch from 4 SPARQL queries, dedup, filter existing, classify and store new documents", async () => {
      // Query A: delegated acts
      const queryAResponse = sparqlResponse([
        {
          celex: "32025R0001",
          title: "Commission Delegated Regulation on space debris monitoring",
          type: "REG_DEL",
          date: "2026-03-01",
          work: "http://publications.europa.eu/resource/cellar/abc",
        },
      ]);

      // Query B: NIS2 citation
      const queryBResponse = sparqlResponse([
        {
          celex: "32025L0002",
          title: "Directive on cybersecurity for space operators",
          type: "DIR_IMPL",
          date: "2026-02-28",
          work: "http://publications.europa.eu/resource/cellar/def",
        },
      ]);

      // Query C: space EuroVoc - includes duplicate of celex from Query A
      const queryCResponse = sparqlResponse([
        {
          celex: "32025R0001",
          title: "Commission Delegated Regulation on space debris monitoring",
          type: "REG_DEL",
          date: "2026-03-01",
          work: "http://publications.europa.eu/resource/cellar/abc",
        },
        {
          celex: "32025R0003",
          title: "Regulation on satellite authorization procedures",
          type: "UNKNOWN",
          date: "2026-02-27",
          work: "http://publications.europa.eu/resource/cellar/ghi",
        },
      ]);

      // Query D: CRA citation — empty
      const queryDResponse = sparqlResponse([]);

      fetchMock
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(queryAResponse),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(queryBResponse),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(queryCResponse),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(queryDResponse),
        });

      // No existing documents in DB
      vi.mocked(prisma.regulatoryUpdate.findMany).mockResolvedValue([]);
      vi.mocked(prisma.regulatoryUpdate.create).mockResolvedValue({} as never);

      const result = await processNewDocuments();

      // 4 total results, 3 unique (32025R0001 deduped)
      expect(result.fetched).toBe(3);
      expect(result.newDocuments).toBe(3);
      expect(result.errors).toHaveLength(0);

      // Should have called fetch 4 times (4 SPARQL queries)
      expect(fetchMock).toHaveBeenCalledTimes(4);

      // Should have checked existing in DB
      expect(prisma.regulatoryUpdate.findMany).toHaveBeenCalledTimes(1);

      // Should have created 3 documents
      expect(prisma.regulatoryUpdate.create).toHaveBeenCalledTimes(3);
    });

    it("should filter out documents that already exist in the database", async () => {
      const queryResponse = sparqlResponse([
        {
          celex: "32025R0010",
          title: "Existing regulation",
          type: "REG_DEL",
          date: "2026-03-01",
          work: "http://test.eu/work/1",
        },
        {
          celex: "32025R0011",
          title: "New regulation on satellite insurance",
          type: "REG_IMPL",
          date: "2026-03-01",
          work: "http://test.eu/work/2",
        },
      ]);

      fetchMock.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(queryResponse),
      });

      // 32025R0010 already exists
      vi.mocked(prisma.regulatoryUpdate.findMany).mockResolvedValue([
        { celexNumber: "32025R0010" } as never,
      ]);
      vi.mocked(prisma.regulatoryUpdate.create).mockResolvedValue({} as never);

      const result = await processNewDocuments();

      // 2 unique fetched, but only 1 new (the other already exists)
      expect(result.fetched).toBe(2);
      expect(result.newDocuments).toBe(1);
      expect(prisma.regulatoryUpdate.create).toHaveBeenCalledTimes(1);
    });

    it("should continue processing when a SPARQL query fails", async () => {
      // Query A (delegated_acts) fails, remaining 3 queries succeed
      fetchMock
        .mockRejectedValueOnce(new Error("Network error"))
        .mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve(
              sparqlResponse([
                {
                  celex: "32025L0020",
                  title: "NIS2 related directive",
                  type: "DIR_IMPL",
                  date: "2026-03-01",
                  work: "http://test.eu/work/nis2",
                },
              ]),
            ),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(sparqlResponse([])),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(sparqlResponse([])),
        });

      vi.mocked(prisma.regulatoryUpdate.findMany).mockResolvedValue([]);
      vi.mocked(prisma.regulatoryUpdate.create).mockResolvedValue({} as never);

      const result = await processNewDocuments();

      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain("delegated_acts");
      expect(result.errors[0]).toContain("Network error");
      expect(result.fetched).toBe(1);
      expect(result.newDocuments).toBe(1);
    });

    it("should handle non-ok SPARQL response", async () => {
      fetchMock.mockResolvedValue({
        ok: false,
        status: 500,
        statusText: "Internal Server Error",
      });

      vi.mocked(prisma.regulatoryUpdate.findMany).mockResolvedValue([]);

      const result = await processNewDocuments();

      // 4 SPARQL queries (delegated_acts, nis2_citation, space_eurovoc, cra_citation)
      expect(result.errors).toHaveLength(4);
      expect(result.fetched).toBe(0);
      expect(result.newDocuments).toBe(0);
    });

    it("should handle error when storing a document fails", async () => {
      fetchMock.mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve(
            sparqlResponse([
              {
                celex: "32025R0030",
                title: "Test regulation",
                type: "REG_DEL",
                date: "2026-03-01",
                work: "http://test.eu/work/30",
              },
            ]),
          ),
      });

      vi.mocked(prisma.regulatoryUpdate.findMany).mockResolvedValue([]);
      vi.mocked(prisma.regulatoryUpdate.create).mockRejectedValue(
        new Error("DB write error"),
      );

      const result = await processNewDocuments();

      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain("32025R0030");
      expect(result.errors[0]).toContain("DB write error");
      expect(result.newDocuments).toBe(0);
    });

    it("should skip results with empty celex numbers during dedup", async () => {
      fetchMock.mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            results: {
              bindings: [
                {
                  celex: { value: "" },
                  title: { value: "No celex" },
                  type: { value: "REG_DEL" },
                  date: { value: "2026-03-01" },
                  work: { value: "http://test.eu" },
                },
                {
                  celex: { value: "32025R0040" },
                  title: { value: "Has celex" },
                  type: { value: "REG_DEL" },
                  date: { value: "2026-03-01" },
                  work: { value: "http://test.eu" },
                },
              ],
            },
          }),
      });

      vi.mocked(prisma.regulatoryUpdate.findMany).mockResolvedValue([]);
      vi.mocked(prisma.regulatoryUpdate.create).mockResolvedValue({} as never);

      const result = await processNewDocuments();

      // Empty celex should be filtered out during dedup
      expect(result.fetched).toBe(1);
      expect(result.newDocuments).toBe(1);
    });

    // Classification logic tested indirectly through processNewDocuments
    it("should classify NIS2 citation documents with cybersecurity and nis2 modules, HIGH severity", async () => {
      fetchMock
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(sparqlResponse([])),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve(
              sparqlResponse([
                {
                  celex: "32025L0050",
                  title:
                    "Directive on network security for satellite operators",
                  type: "DIR_IMPL",
                  date: "2026-03-01",
                  work: "http://test.eu/work/50",
                },
              ]),
            ),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(sparqlResponse([])),
        });

      vi.mocked(prisma.regulatoryUpdate.findMany).mockResolvedValue([]);
      vi.mocked(prisma.regulatoryUpdate.create).mockResolvedValue({} as never);

      await processNewDocuments();

      const createCall = vi.mocked(prisma.regulatoryUpdate.create).mock
        .calls[0][0];
      const data = createCall.data;

      expect(data.severity).toBe("HIGH");
      expect(data.affectedModules).toContain("cybersecurity");
      expect(data.affectedModules).toContain("nis2");
      expect(data.matchReason).toContain("NIS2");
    });

    it("should classify CRITICAL severity for space act/regulation titles", async () => {
      fetchMock
        .mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve(
              sparqlResponse([
                {
                  celex: "32025R0060",
                  title: "EU Space Act implementing provisions",
                  type: "REG_IMPL",
                  date: "2026-03-01",
                  work: "http://test.eu/work/60",
                },
              ]),
            ),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(sparqlResponse([])),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(sparqlResponse([])),
        });

      vi.mocked(prisma.regulatoryUpdate.findMany).mockResolvedValue([]);
      vi.mocked(prisma.regulatoryUpdate.create).mockResolvedValue({} as never);

      await processNewDocuments();

      const data = vi.mocked(prisma.regulatoryUpdate.create).mock.calls[0][0]
        .data;
      expect(data.severity).toBe("CRITICAL");
    });

    it("should classify MEDIUM severity for implementing acts", async () => {
      fetchMock
        .mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve(
              sparqlResponse([
                {
                  celex: "32025R0070",
                  title: "Commission implementing regulation on registration",
                  type: "REG_IMPL",
                  date: "2026-03-01",
                  work: "http://test.eu/work/70",
                },
              ]),
            ),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(sparqlResponse([])),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(sparqlResponse([])),
        });

      vi.mocked(prisma.regulatoryUpdate.findMany).mockResolvedValue([]);
      vi.mocked(prisma.regulatoryUpdate.create).mockResolvedValue({} as never);

      await processNewDocuments();

      const data = vi.mocked(prisma.regulatoryUpdate.create).mock.calls[0][0]
        .data;
      expect(data.severity).toBe("MEDIUM");
      expect(data.affectedModules).toContain("registration");
    });

    it("should assign default authorization module for space_eurovoc with no keyword matches", async () => {
      fetchMock
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(sparqlResponse([])),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(sparqlResponse([])),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve(
              sparqlResponse([
                {
                  celex: "32025R0080",
                  title: "General provisions on orbital matters",
                  type: "UNKNOWN",
                  date: "2026-03-01",
                  work: "http://test.eu/work/80",
                },
              ]),
            ),
        });

      vi.mocked(prisma.regulatoryUpdate.findMany).mockResolvedValue([]);
      vi.mocked(prisma.regulatoryUpdate.create).mockResolvedValue({} as never);

      await processNewDocuments();

      const data = vi.mocked(prisma.regulatoryUpdate.create).mock.calls[0][0]
        .data;
      expect(data.affectedModules).toContain("authorization");
      expect(data.severity).toBe("LOW");
    });

    it("should classify HIGH severity for REG_DEL delegated acts", async () => {
      fetchMock
        .mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve(
              sparqlResponse([
                {
                  celex: "32025R0090",
                  title:
                    "Commission delegated regulation on liability requirements",
                  type: "REG_DEL",
                  date: "2026-03-01",
                  work: "http://test.eu/work/90",
                },
              ]),
            ),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(sparqlResponse([])),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(sparqlResponse([])),
        });

      vi.mocked(prisma.regulatoryUpdate.findMany).mockResolvedValue([]);
      vi.mocked(prisma.regulatoryUpdate.create).mockResolvedValue({} as never);

      await processNewDocuments();

      const data = vi.mocked(prisma.regulatoryUpdate.create).mock.calls[0][0]
        .data;
      expect(data.severity).toBe("HIGH");
      expect(data.affectedModules).toContain("insurance");
    });

    it("should detect keyword matches for multiple modules", async () => {
      fetchMock
        .mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve(
              sparqlResponse([
                {
                  celex: "32025R0100",
                  title:
                    "Regulation on cyber security and environmental sustainability for space debris",
                  type: "REG_DEL",
                  date: "2026-03-01",
                  work: "http://test.eu/work/100",
                },
              ]),
            ),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(sparqlResponse([])),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(sparqlResponse([])),
        });

      vi.mocked(prisma.regulatoryUpdate.findMany).mockResolvedValue([]);
      vi.mocked(prisma.regulatoryUpdate.create).mockResolvedValue({} as never);

      await processNewDocuments();

      const data = vi.mocked(prisma.regulatoryUpdate.create).mock.calls[0][0]
        .data;
      expect(data.affectedModules).toContain("debris");
      expect(data.affectedModules).toContain("cybersecurity");
      expect(data.affectedModules).toContain("environmental");
    });

    it("should build correct EUR-Lex URL in sourceUrl", async () => {
      fetchMock
        .mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve(
              sparqlResponse([
                {
                  celex: "32025R0110",
                  title: "Test regulation",
                  type: "REG_DEL",
                  date: "2026-03-01",
                  work: "http://test.eu/work/110",
                },
              ]),
            ),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(sparqlResponse([])),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(sparqlResponse([])),
        });

      vi.mocked(prisma.regulatoryUpdate.findMany).mockResolvedValue([]);
      vi.mocked(prisma.regulatoryUpdate.create).mockResolvedValue({} as never);

      await processNewDocuments();

      const data = vi.mocked(prisma.regulatoryUpdate.create).mock.calls[0][0]
        .data;
      expect(data.sourceUrl).toBe(
        "https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32025R0110",
      );
    });

    it("should handle empty SPARQL results", async () => {
      fetchMock.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ results: { bindings: [] } }),
      });

      vi.mocked(prisma.regulatoryUpdate.findMany).mockResolvedValue([]);

      const result = await processNewDocuments();

      expect(result.fetched).toBe(0);
      expect(result.newDocuments).toBe(0);
      expect(result.errors).toHaveLength(0);
      expect(prisma.regulatoryUpdate.create).not.toHaveBeenCalled();
    });
  });

  describe("getRecentHighPriorityUpdates", () => {
    it("should query for CRITICAL and HIGH severity updates since the given date", async () => {
      const since = new Date("2026-03-01");
      const mockUpdates = [
        {
          id: "upd-1",
          title: "Critical Update",
          severity: "CRITICAL",
          celexNumber: "32025R0001",
        },
        {
          id: "upd-2",
          title: "High Update",
          severity: "HIGH",
          celexNumber: "32025R0002",
        },
      ];

      vi.mocked(prisma.regulatoryUpdate.findMany).mockResolvedValue(
        mockUpdates as never,
      );

      const result = await getRecentHighPriorityUpdates(since);

      expect(result).toEqual(mockUpdates);
      expect(prisma.regulatoryUpdate.findMany).toHaveBeenCalledWith({
        where: {
          createdAt: { gte: since },
          severity: { in: ["CRITICAL", "HIGH"] },
        },
        select: {
          id: true,
          title: true,
          severity: true,
          celexNumber: true,
          affectedModules: true,
        },
        orderBy: { severity: "asc" },
      });
    });

    it("should return empty array when no high priority updates exist", async () => {
      vi.mocked(prisma.regulatoryUpdate.findMany).mockResolvedValue([]);

      const result = await getRecentHighPriorityUpdates(new Date());

      expect(result).toEqual([]);
    });
  });
});
