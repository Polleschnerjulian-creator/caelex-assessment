import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    nCASubmission: { findFirst: vi.fn() },
    nCACorrespondence: {
      create: vi.fn(),
      findMany: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
    },
  },
}));

import { prisma } from "@/lib/prisma";
import {
  createCorrespondence,
  getCorrespondence,
  getUnreadCorrespondence,
  markAsRead,
  getCorrespondenceRequiringResponse,
  markAsResponded,
} from "./nca-correspondence-service";

const mockedPrisma = prisma as unknown as {
  nCASubmission: {
    findFirst: ReturnType<typeof vi.fn>;
  };
  nCACorrespondence: {
    create: ReturnType<typeof vi.fn>;
    findMany: ReturnType<typeof vi.fn>;
    findFirst: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  };
};

beforeEach(() => {
  vi.clearAllMocks();
});

// ─── createCorrespondence ───

describe("createCorrespondence", () => {
  const baseInput = {
    submissionId: "sub-1",
    direction: "OUTBOUND" as const,
    messageType: "NOTIFICATION" as const,
    subject: "Test Subject",
    content: "Test content body",
  };

  it("throws if submission not found", async () => {
    mockedPrisma.nCASubmission.findFirst.mockResolvedValue(null);
    await expect(
      createCorrespondence("sub-1", "user-1", baseInput),
    ).rejects.toThrow("Submission not found");
  });

  it("creates OUTBOUND correspondence with auto-filled sentAt and sentBy", async () => {
    mockedPrisma.nCASubmission.findFirst.mockResolvedValue({ id: "sub-1" });
    const createdRecord = { id: "corr-1", ...baseInput };
    mockedPrisma.nCACorrespondence.create.mockResolvedValue(createdRecord);

    const result = await createCorrespondence("sub-1", "user-1", baseInput);

    expect(result).toEqual(createdRecord);
    expect(mockedPrisma.nCACorrespondence.create).toHaveBeenCalledTimes(1);

    const createArg = mockedPrisma.nCACorrespondence.create.mock.calls[0][0];
    expect(createArg.data.sentBy).toBe("user-1");
    expect(createArg.data.sentAt).toBeInstanceOf(Date);
    expect(createArg.data.receivedAt).toBeUndefined();
  });

  it("creates INBOUND correspondence with auto-filled receivedAt", async () => {
    mockedPrisma.nCASubmission.findFirst.mockResolvedValue({ id: "sub-1" });
    const input = { ...baseInput, direction: "INBOUND" as const };
    mockedPrisma.nCACorrespondence.create.mockResolvedValue({
      id: "corr-2",
      ...input,
    });

    await createCorrespondence("sub-1", "user-1", input);

    const createArg = mockedPrisma.nCACorrespondence.create.mock.calls[0][0];
    expect(createArg.data.receivedAt).toBeInstanceOf(Date);
    expect(createArg.data.sentBy).toBeUndefined();
    expect(createArg.data.sentAt).toBeUndefined();
  });

  it("passes explicit sentAt/sentBy for OUTBOUND if provided", async () => {
    mockedPrisma.nCASubmission.findFirst.mockResolvedValue({ id: "sub-1" });
    const customDate = new Date("2024-06-01T10:00:00Z");
    const input = {
      ...baseInput,
      sentAt: customDate,
      sentBy: "admin-user",
    };
    mockedPrisma.nCACorrespondence.create.mockResolvedValue({
      id: "corr-3",
      ...input,
    });

    await createCorrespondence("sub-1", "user-1", input);

    const createArg = mockedPrisma.nCACorrespondence.create.mock.calls[0][0];
    expect(createArg.data.sentAt).toBe(customDate);
    expect(createArg.data.sentBy).toBe("admin-user");
  });

  it("passes attachments when provided", async () => {
    mockedPrisma.nCASubmission.findFirst.mockResolvedValue({ id: "sub-1" });
    const input = {
      ...baseInput,
      attachments: [
        { fileName: "doc.pdf", fileSize: 1024, fileUrl: "https://r2/doc.pdf" },
      ],
    };
    mockedPrisma.nCACorrespondence.create.mockResolvedValue({
      id: "corr-4",
      ...input,
    });

    await createCorrespondence("sub-1", "user-1", input);

    const createArg = mockedPrisma.nCACorrespondence.create.mock.calls[0][0];
    expect(createArg.data.attachments).toEqual(input.attachments);
  });

  it("does not set attachments when not provided", async () => {
    mockedPrisma.nCASubmission.findFirst.mockResolvedValue({ id: "sub-1" });
    mockedPrisma.nCACorrespondence.create.mockResolvedValue({
      id: "corr-5",
      ...baseInput,
    });

    await createCorrespondence("sub-1", "user-1", baseInput);

    const createArg = mockedPrisma.nCACorrespondence.create.mock.calls[0][0];
    expect(createArg.data.attachments).toBeUndefined();
  });

  it("passes optional fields when provided", async () => {
    mockedPrisma.nCASubmission.findFirst.mockResolvedValue({ id: "sub-1" });
    const deadline = new Date("2024-07-01T00:00:00Z");
    const input = {
      ...baseInput,
      ncaContactName: "Dr. Muller",
      ncaContactEmail: "muller@bnetza.de",
      requiresResponse: true,
      responseDeadline: deadline,
    };
    mockedPrisma.nCACorrespondence.create.mockResolvedValue({
      id: "corr-6",
      ...input,
    });

    await createCorrespondence("sub-1", "user-1", input);

    const createArg = mockedPrisma.nCACorrespondence.create.mock.calls[0][0];
    expect(createArg.data.ncaContactName).toBe("Dr. Muller");
    expect(createArg.data.ncaContactEmail).toBe("muller@bnetza.de");
    expect(createArg.data.requiresResponse).toBe(true);
    expect(createArg.data.responseDeadline).toBe(deadline);
  });

  it("defaults requiresResponse to false when not provided", async () => {
    mockedPrisma.nCASubmission.findFirst.mockResolvedValue({ id: "sub-1" });
    mockedPrisma.nCACorrespondence.create.mockResolvedValue({
      id: "corr-7",
      ...baseInput,
    });

    await createCorrespondence("sub-1", "user-1", baseInput);

    const createArg = mockedPrisma.nCACorrespondence.create.mock.calls[0][0];
    expect(createArg.data.requiresResponse).toBe(false);
  });

  it("verifies user ownership via findFirst with correct where clause", async () => {
    mockedPrisma.nCASubmission.findFirst.mockResolvedValue({ id: "sub-1" });
    mockedPrisma.nCACorrespondence.create.mockResolvedValue({
      id: "corr-8",
      ...baseInput,
    });

    await createCorrespondence("sub-1", "user-1", baseInput);

    expect(mockedPrisma.nCASubmission.findFirst).toHaveBeenCalledWith({
      where: { id: "sub-1", userId: "user-1" },
    });
  });
});

// ─── getCorrespondence ───

describe("getCorrespondence", () => {
  it("throws if submission not found", async () => {
    mockedPrisma.nCASubmission.findFirst.mockResolvedValue(null);
    await expect(getCorrespondence("sub-1", "user-1")).rejects.toThrow(
      "Submission not found",
    );
  });

  it("returns correspondence for a valid submission", async () => {
    mockedPrisma.nCASubmission.findFirst.mockResolvedValue({ id: "sub-1" });
    const messages = [{ id: "corr-1" }, { id: "corr-2" }];
    mockedPrisma.nCACorrespondence.findMany.mockResolvedValue(messages);

    const result = await getCorrespondence("sub-1", "user-1");

    expect(result).toEqual(messages);
    expect(mockedPrisma.nCACorrespondence.findMany).toHaveBeenCalledWith({
      where: { submissionId: "sub-1" },
      orderBy: { createdAt: "asc" },
    });
  });

  it("checks ownership with select: { id: true }", async () => {
    mockedPrisma.nCASubmission.findFirst.mockResolvedValue({ id: "sub-1" });
    mockedPrisma.nCACorrespondence.findMany.mockResolvedValue([]);

    await getCorrespondence("sub-1", "user-1");

    expect(mockedPrisma.nCASubmission.findFirst).toHaveBeenCalledWith({
      where: { id: "sub-1", userId: "user-1" },
      select: { id: true },
    });
  });
});

// ─── getUnreadCorrespondence ───

describe("getUnreadCorrespondence", () => {
  it("returns unread inbound messages for user", async () => {
    const unread = [{ id: "corr-1", isRead: false, direction: "INBOUND" }];
    mockedPrisma.nCACorrespondence.findMany.mockResolvedValue(unread);

    const result = await getUnreadCorrespondence("user-1");

    expect(result).toEqual(unread);
    expect(mockedPrisma.nCACorrespondence.findMany).toHaveBeenCalledWith({
      where: {
        submission: { userId: "user-1" },
        isRead: false,
        direction: "INBOUND",
      },
      include: {
        submission: {
          select: {
            id: true,
            ncaAuthority: true,
            ncaAuthorityName: true,
            status: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });
  });
});

// ─── markAsRead ───

describe("markAsRead", () => {
  it("throws if correspondence not found", async () => {
    mockedPrisma.nCACorrespondence.findFirst.mockResolvedValue(null);
    await expect(markAsRead("corr-1", "user-1")).rejects.toThrow(
      "Correspondence not found",
    );
  });

  it("marks correspondence as read", async () => {
    mockedPrisma.nCACorrespondence.findFirst.mockResolvedValue({
      id: "corr-1",
    });
    const updated = { id: "corr-1", isRead: true };
    mockedPrisma.nCACorrespondence.update.mockResolvedValue(updated);

    const result = await markAsRead("corr-1", "user-1");

    expect(result).toEqual(updated);
    expect(mockedPrisma.nCACorrespondence.update).toHaveBeenCalledWith({
      where: { id: "corr-1" },
      data: { isRead: true },
    });
  });

  it("verifies ownership via submission.userId", async () => {
    mockedPrisma.nCACorrespondence.findFirst.mockResolvedValue({
      id: "corr-1",
    });
    mockedPrisma.nCACorrespondence.update.mockResolvedValue({
      id: "corr-1",
      isRead: true,
    });

    await markAsRead("corr-1", "user-1");

    expect(mockedPrisma.nCACorrespondence.findFirst).toHaveBeenCalledWith({
      where: {
        id: "corr-1",
        submission: { userId: "user-1" },
      },
    });
  });
});

// ─── getCorrespondenceRequiringResponse ───

describe("getCorrespondenceRequiringResponse", () => {
  it("returns correspondence needing response", async () => {
    const items = [{ id: "corr-1", requiresResponse: true, respondedAt: null }];
    mockedPrisma.nCACorrespondence.findMany.mockResolvedValue(items);

    const result = await getCorrespondenceRequiringResponse("user-1");

    expect(result).toEqual(items);
    expect(mockedPrisma.nCACorrespondence.findMany).toHaveBeenCalledWith({
      where: {
        submission: { userId: "user-1" },
        requiresResponse: true,
        respondedAt: null,
      },
      include: {
        submission: {
          select: {
            id: true,
            ncaAuthority: true,
            ncaAuthorityName: true,
            status: true,
          },
        },
      },
      orderBy: { responseDeadline: "asc" },
    });
  });
});

// ─── markAsResponded ───

describe("markAsResponded", () => {
  it("throws if correspondence not found", async () => {
    mockedPrisma.nCACorrespondence.findFirst.mockResolvedValue(null);
    await expect(markAsResponded("corr-1", "user-1")).rejects.toThrow(
      "Correspondence not found",
    );
  });

  it("marks correspondence as responded with current date", async () => {
    mockedPrisma.nCACorrespondence.findFirst.mockResolvedValue({
      id: "corr-1",
    });
    const updated = { id: "corr-1", respondedAt: new Date() };
    mockedPrisma.nCACorrespondence.update.mockResolvedValue(updated);

    const result = await markAsResponded("corr-1", "user-1");

    expect(result).toEqual(updated);
    expect(mockedPrisma.nCACorrespondence.update).toHaveBeenCalledWith({
      where: { id: "corr-1" },
      data: { respondedAt: expect.any(Date) },
    });
  });

  it("verifies ownership via submission.userId", async () => {
    mockedPrisma.nCACorrespondence.findFirst.mockResolvedValue({
      id: "corr-1",
    });
    mockedPrisma.nCACorrespondence.update.mockResolvedValue({
      id: "corr-1",
      respondedAt: new Date(),
    });

    await markAsResponded("corr-1", "user-1");

    expect(mockedPrisma.nCACorrespondence.findFirst).toHaveBeenCalledWith({
      where: {
        id: "corr-1",
        submission: { userId: "user-1" },
      },
    });
  });
});
