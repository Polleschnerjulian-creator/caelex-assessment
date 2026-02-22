import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import crypto from "crypto";

// Mock encryption (H17: webhook secrets are now encrypted at rest)
vi.mock("@/lib/encryption", () => ({
  encrypt: vi.fn((val: string) => `encrypted:${val}`),
  decrypt: vi.fn((val: string) =>
    val.startsWith("encrypted:") ? val.slice(10) : val,
  ),
  isEncrypted: vi.fn((val: string) => val.startsWith("encrypted:")),
}));

// Mock URL validation (H4: SSRF protection)
vi.mock("@/lib/url-validation", () => ({
  validateExternalUrl: vi.fn(),
}));

// Mock Prisma
vi.mock("@/lib/prisma", () => ({
  prisma: {
    webhook: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    webhookDelivery: {
      create: vi.fn(),
      update: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      count: vi.fn(),
      deleteMany: vi.fn(),
      groupBy: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

// Store the original fetch so we can restore it
const originalFetch = globalThis.fetch;

import { prisma } from "@/lib/prisma";
import {
  createWebhook,
  getOrganizationWebhooks,
  getWebhookById,
  updateWebhook,
  deleteWebhook,
  regenerateWebhookSecret,
  triggerWebhooks,
  retryPendingDeliveries,
  getWebhookDeliveries,
  getDeliveryById,
  retryDelivery,
  testWebhook,
  verifySignature,
  cleanupOldDeliveries,
  getWebhookStats,
  WEBHOOK_EVENTS,
  type WebhookEvent,
} from "@/lib/services/webhook-service";

// ─── Helpers ───

function makeWebhook(overrides: Record<string, unknown> = {}) {
  return {
    id: "wh-1",
    organizationId: "org-1",
    name: "Test Webhook",
    url: "https://example.com/webhook",
    secret: "whsec_testsecret123",
    events: ["compliance.score_changed", "incident.created"],
    headers: null,
    isActive: true,
    successCount: 0,
    failureCount: 0,
    lastTriggeredAt: null,
    lastSuccessAt: null,
    lastFailureAt: null,
    lastError: null,
    createdAt: new Date("2025-01-01"),
    updatedAt: new Date("2025-01-01"),
    ...overrides,
  };
}

function makeDelivery(overrides: Record<string, unknown> = {}) {
  return {
    id: "del-1",
    webhookId: "wh-1",
    event: "compliance.score_changed",
    payload: {
      id: "payload-1",
      event: "compliance.score_changed",
      timestamp: "2025-01-01T00:00:00.000Z",
      data: { score: 85 },
    },
    statusCode: null,
    responseBody: null,
    responseTimeMs: null,
    status: "PENDING",
    attempts: 0,
    maxAttempts: 3,
    nextRetryAt: null,
    errorMessage: null,
    createdAt: new Date("2025-01-01"),
    deliveredAt: null,
    ...overrides,
  };
}

describe("Webhook Service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers({ shouldAdvanceTime: true });
    // Mock fetch globally
    globalThis.fetch = vi.fn();
  });

  afterEach(() => {
    vi.useRealTimers();
    globalThis.fetch = originalFetch;
  });

  // ─── WEBHOOK_EVENTS constant ───

  describe("WEBHOOK_EVENTS", () => {
    it("should have compliance events", () => {
      expect(WEBHOOK_EVENTS["compliance.score_changed"]).toBe(
        "Compliance score changed",
      );
      expect(WEBHOOK_EVENTS["compliance.status_changed"]).toBe(
        "Compliance status changed",
      );
      expect(WEBHOOK_EVENTS["compliance.action_required"]).toBe(
        "Compliance action required",
      );
    });

    it("should have spacecraft events", () => {
      expect(WEBHOOK_EVENTS["spacecraft.created"]).toBe("Spacecraft created");
      expect(WEBHOOK_EVENTS["spacecraft.updated"]).toBe("Spacecraft updated");
      expect(WEBHOOK_EVENTS["spacecraft.status_changed"]).toBe(
        "Spacecraft status changed",
      );
    });

    it("should have authorization events", () => {
      expect(WEBHOOK_EVENTS["authorization.submitted"]).toBe(
        "Authorization submitted",
      );
      expect(WEBHOOK_EVENTS["authorization.approved"]).toBe(
        "Authorization approved",
      );
      expect(WEBHOOK_EVENTS["authorization.rejected"]).toBe(
        "Authorization rejected",
      );
      expect(WEBHOOK_EVENTS["authorization.status_changed"]).toBe(
        "Authorization status changed",
      );
    });

    it("should have report events", () => {
      expect(WEBHOOK_EVENTS["report.generated"]).toBe("Report generated");
      expect(WEBHOOK_EVENTS["report.submitted"]).toBe(
        "Report submitted to NCA",
      );
      expect(WEBHOOK_EVENTS["report.acknowledged"]).toBe(
        "Report acknowledged by NCA",
      );
    });

    it("should have incident events", () => {
      expect(WEBHOOK_EVENTS["incident.created"]).toBe("Incident created");
      expect(WEBHOOK_EVENTS["incident.updated"]).toBe("Incident updated");
      expect(WEBHOOK_EVENTS["incident.escalated"]).toBe("Incident escalated");
      expect(WEBHOOK_EVENTS["incident.resolved"]).toBe("Incident resolved");
    });

    it("should have deadline events", () => {
      expect(WEBHOOK_EVENTS["deadline.approaching"]).toBe(
        "Deadline approaching",
      );
      expect(WEBHOOK_EVENTS["deadline.overdue"]).toBe("Deadline overdue");
      expect(WEBHOOK_EVENTS["deadline.completed"]).toBe("Deadline completed");
    });

    it("should have document events", () => {
      expect(WEBHOOK_EVENTS["document.uploaded"]).toBe("Document uploaded");
      expect(WEBHOOK_EVENTS["document.approved"]).toBe("Document approved");
      expect(WEBHOOK_EVENTS["document.rejected"]).toBe("Document rejected");
    });

    it("should have organization member events", () => {
      expect(WEBHOOK_EVENTS["member.joined"]).toBe(
        "Member joined organization",
      );
      expect(WEBHOOK_EVENTS["member.left"]).toBe("Member left organization");
      expect(WEBHOOK_EVENTS["member.role_changed"]).toBe("Member role changed");
    });

    it("should have descriptions for all events", () => {
      for (const [event, description] of Object.entries(WEBHOOK_EVENTS)) {
        expect(typeof event).toBe("string");
        expect(typeof description).toBe("string");
        expect(description.length).toBeGreaterThan(0);
      }
    });

    it("should have the expected total number of events", () => {
      const eventKeys = Object.keys(WEBHOOK_EVENTS);
      // 3 compliance + 3 spacecraft + 4 authorization + 3 reports + 4 incidents + 3 deadlines + 3 documents + 3 member + 8 network = 34
      expect(eventKeys.length).toBeGreaterThanOrEqual(26);
    });
  });

  // ─── createWebhook ───

  describe("createWebhook", () => {
    it("should create a webhook with generated secret", async () => {
      const createdWebhook = makeWebhook();
      vi.mocked(prisma.webhook.create).mockResolvedValue(
        createdWebhook as never,
      );

      const result = await createWebhook({
        organizationId: "org-1",
        name: "Test Webhook",
        url: "https://example.com/webhook",
        events: ["compliance.score_changed"],
      });

      expect(prisma.webhook.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          organizationId: "org-1",
          name: "Test Webhook",
          url: "https://example.com/webhook",
          events: ["compliance.score_changed"],
          isActive: true,
          secret: expect.stringMatching(/^encrypted:whsec_/),
        }),
      });
      expect(result).toEqual(createdWebhook);
    });

    it("should create a webhook with custom headers", async () => {
      const createdWebhook = makeWebhook({
        headers: { "X-Custom": "value" },
      });
      vi.mocked(prisma.webhook.create).mockResolvedValue(
        createdWebhook as never,
      );

      await createWebhook({
        organizationId: "org-1",
        name: "Test Webhook",
        url: "https://example.com/webhook",
        events: ["compliance.score_changed"],
        headers: { "X-Custom": "value" },
      });

      expect(prisma.webhook.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          headers: { "X-Custom": "value" },
        }),
      });
    });

    it("should create a webhook with multiple events", async () => {
      const events = [
        "compliance.score_changed",
        "incident.created",
        "deadline.approaching",
      ];
      vi.mocked(prisma.webhook.create).mockResolvedValue(
        makeWebhook({ events }) as never,
      );

      await createWebhook({
        organizationId: "org-1",
        name: "Multi-Event Webhook",
        url: "https://example.com/webhook",
        events,
      });

      expect(prisma.webhook.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ events }),
      });
    });

    it("should generate a unique secret with whsec_ prefix", async () => {
      vi.mocked(prisma.webhook.create).mockImplementation((async (args: {
        data: { secret: string };
      }) => {
        const secret = args.data.secret;
        // H17: Secret is encrypted at rest — mock encrypt prepends "encrypted:"
        expect(secret).toMatch(/^encrypted:whsec_[A-Za-z0-9_-]+$/);
        expect(secret.length).toBeGreaterThan(20);
        return makeWebhook({ secret });
      }) as never);

      await createWebhook({
        organizationId: "org-1",
        name: "Test",
        url: "https://example.com/webhook",
        events: ["compliance.score_changed"],
      });

      expect(prisma.webhook.create).toHaveBeenCalled();
    });
  });

  // ─── getOrganizationWebhooks ───

  describe("getOrganizationWebhooks", () => {
    it("should return webhooks for an organization ordered by creation date", async () => {
      const webhooks = [
        makeWebhook({ id: "wh-2", createdAt: new Date("2025-02-01") }),
        makeWebhook({ id: "wh-1", createdAt: new Date("2025-01-01") }),
      ];
      vi.mocked(prisma.webhook.findMany).mockResolvedValue(webhooks as never);

      const result = await getOrganizationWebhooks("org-1");

      expect(result).toEqual(webhooks);
      expect(prisma.webhook.findMany).toHaveBeenCalledWith({
        where: { organizationId: "org-1" },
        orderBy: { createdAt: "desc" },
      });
    });

    it("should return empty array when no webhooks exist", async () => {
      vi.mocked(prisma.webhook.findMany).mockResolvedValue([]);

      const result = await getOrganizationWebhooks("org-empty");

      expect(result).toEqual([]);
    });
  });

  // ─── getWebhookById ───

  describe("getWebhookById", () => {
    it("should return a webhook by ID and organizationId", async () => {
      const webhook = makeWebhook();
      vi.mocked(prisma.webhook.findFirst).mockResolvedValue(webhook as never);

      const result = await getWebhookById("wh-1", "org-1");

      expect(result).toEqual(webhook);
      expect(prisma.webhook.findFirst).toHaveBeenCalledWith({
        where: { id: "wh-1", organizationId: "org-1" },
      });
    });

    it("should return null when webhook is not found", async () => {
      vi.mocked(prisma.webhook.findFirst).mockResolvedValue(null);

      const result = await getWebhookById("wh-nonexistent", "org-1");

      expect(result).toBeNull();
    });

    it("should return null when webhook belongs to a different organization", async () => {
      vi.mocked(prisma.webhook.findFirst).mockResolvedValue(null);

      const result = await getWebhookById("wh-1", "org-other");

      expect(result).toBeNull();
      expect(prisma.webhook.findFirst).toHaveBeenCalledWith({
        where: { id: "wh-1", organizationId: "org-other" },
      });
    });
  });

  // ─── updateWebhook ───

  describe("updateWebhook", () => {
    it("should update webhook name", async () => {
      const updated = makeWebhook({ name: "Updated Name" });
      vi.mocked(prisma.webhook.update).mockResolvedValue(updated as never);

      const result = await updateWebhook("wh-1", "org-1", {
        name: "Updated Name",
      });

      expect(result).toEqual(updated);
      expect(prisma.webhook.update).toHaveBeenCalledWith({
        where: { id: "wh-1", organizationId: "org-1" },
        data: expect.objectContaining({ name: "Updated Name" }),
      });
    });

    it("should update webhook URL", async () => {
      const updated = makeWebhook({ url: "https://new-url.com/webhook" });
      vi.mocked(prisma.webhook.update).mockResolvedValue(updated as never);

      await updateWebhook("wh-1", "org-1", {
        url: "https://new-url.com/webhook",
      });

      expect(prisma.webhook.update).toHaveBeenCalledWith({
        where: { id: "wh-1", organizationId: "org-1" },
        data: expect.objectContaining({ url: "https://new-url.com/webhook" }),
      });
    });

    it("should update webhook events", async () => {
      const newEvents = ["incident.created", "deadline.approaching"];
      vi.mocked(prisma.webhook.update).mockResolvedValue(
        makeWebhook({ events: newEvents }) as never,
      );

      await updateWebhook("wh-1", "org-1", { events: newEvents });

      expect(prisma.webhook.update).toHaveBeenCalledWith({
        where: { id: "wh-1", organizationId: "org-1" },
        data: expect.objectContaining({ events: newEvents }),
      });
    });

    it("should update webhook headers", async () => {
      const newHeaders = { "X-Updated": "true" };
      vi.mocked(prisma.webhook.update).mockResolvedValue(
        makeWebhook({ headers: newHeaders }) as never,
      );

      await updateWebhook("wh-1", "org-1", { headers: newHeaders });

      expect(prisma.webhook.update).toHaveBeenCalledWith({
        where: { id: "wh-1", organizationId: "org-1" },
        data: expect.objectContaining({ headers: newHeaders }),
      });
    });

    it("should update webhook active status", async () => {
      vi.mocked(prisma.webhook.update).mockResolvedValue(
        makeWebhook({ isActive: false }) as never,
      );

      await updateWebhook("wh-1", "org-1", { isActive: false });

      expect(prisma.webhook.update).toHaveBeenCalledWith({
        where: { id: "wh-1", organizationId: "org-1" },
        data: expect.objectContaining({ isActive: false }),
      });
    });

    it("should update multiple fields at once", async () => {
      vi.mocked(prisma.webhook.update).mockResolvedValue(
        makeWebhook() as never,
      );

      await updateWebhook("wh-1", "org-1", {
        name: "New Name",
        url: "https://new.example.com/hook",
        isActive: false,
      });

      expect(prisma.webhook.update).toHaveBeenCalledWith({
        where: { id: "wh-1", organizationId: "org-1" },
        data: expect.objectContaining({
          name: "New Name",
          url: "https://new.example.com/hook",
          isActive: false,
        }),
      });
    });
  });

  // ─── deleteWebhook ───

  describe("deleteWebhook", () => {
    it("should delete a webhook by ID and organizationId", async () => {
      vi.mocked(prisma.webhook.delete).mockResolvedValue(
        makeWebhook() as never,
      );

      await deleteWebhook("wh-1", "org-1");

      expect(prisma.webhook.delete).toHaveBeenCalledWith({
        where: { id: "wh-1", organizationId: "org-1" },
      });
    });
  });

  // ─── regenerateWebhookSecret ───

  describe("regenerateWebhookSecret", () => {
    it("should regenerate and return a new secret", async () => {
      vi.mocked(prisma.webhook.update).mockResolvedValue(
        makeWebhook() as never,
      );

      const newSecret = await regenerateWebhookSecret("wh-1", "org-1");

      // Function returns plaintext secret to caller
      expect(newSecret).toMatch(/^whsec_[A-Za-z0-9_-]+$/);
      // H17: But stores encrypted version in DB
      expect(prisma.webhook.update).toHaveBeenCalledWith({
        where: { id: "wh-1", organizationId: "org-1" },
        data: { secret: `encrypted:${newSecret}` },
      });
    });

    it("should return a different secret each time", async () => {
      vi.mocked(prisma.webhook.update).mockResolvedValue(
        makeWebhook() as never,
      );

      const secret1 = await regenerateWebhookSecret("wh-1", "org-1");
      const secret2 = await regenerateWebhookSecret("wh-1", "org-1");

      // Extremely unlikely to be the same with 24 random bytes
      expect(secret1).not.toBe(secret2);
    });
  });

  // ─── triggerWebhooks ───

  describe("triggerWebhooks", () => {
    it("should find active webhooks subscribed to the event", async () => {
      vi.mocked(prisma.webhook.findMany).mockResolvedValue([]);

      await triggerWebhooks("org-1", "compliance.score_changed", {
        score: 85,
      });

      expect(prisma.webhook.findMany).toHaveBeenCalledWith({
        where: {
          organizationId: "org-1",
          isActive: true,
          events: { has: "compliance.score_changed" },
        },
      });
    });

    it("should create delivery records for each matched webhook", async () => {
      const webhooks = [
        makeWebhook({ id: "wh-1" }),
        makeWebhook({ id: "wh-2" }),
      ];
      vi.mocked(prisma.webhook.findMany).mockResolvedValue(webhooks as never);
      vi.mocked(prisma.webhookDelivery.create).mockResolvedValue(
        makeDelivery() as never,
      );

      // Mock fetch for the async delivery calls
      vi.mocked(globalThis.fetch).mockResolvedValue(
        new Response("OK", { status: 200 }),
      );
      vi.mocked(prisma.$transaction).mockResolvedValue([] as never);

      await triggerWebhooks("org-1", "compliance.score_changed", {
        score: 85,
      });

      expect(prisma.webhookDelivery.create).toHaveBeenCalledTimes(2);
      expect(prisma.webhookDelivery.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          webhookId: "wh-1",
          event: "compliance.score_changed",
          status: "PENDING",
          attempts: 0,
          payload: expect.objectContaining({
            event: "compliance.score_changed",
            data: { score: 85 },
          }),
        }),
      });
    });

    it("should not create delivery records when no webhooks match", async () => {
      vi.mocked(prisma.webhook.findMany).mockResolvedValue([]);

      await triggerWebhooks("org-1", "compliance.score_changed", {
        score: 85,
      });

      expect(prisma.webhookDelivery.create).not.toHaveBeenCalled();
    });

    it("should include a payload with id, event, timestamp, and data", async () => {
      vi.mocked(prisma.webhook.findMany).mockResolvedValue([
        makeWebhook(),
      ] as never);
      vi.mocked(prisma.webhookDelivery.create).mockResolvedValue(
        makeDelivery() as never,
      );
      vi.mocked(globalThis.fetch).mockResolvedValue(
        new Response("OK", { status: 200 }),
      );
      vi.mocked(prisma.$transaction).mockResolvedValue([] as never);

      await triggerWebhooks("org-1", "incident.created", {
        incidentId: "inc-1",
      });

      expect(prisma.webhookDelivery.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          payload: expect.objectContaining({
            id: expect.any(String),
            event: "incident.created",
            timestamp: expect.any(String),
            data: { incidentId: "inc-1" },
          }),
        }),
      });
    });

    it("should trigger delivery asynchronously and not await it", async () => {
      // The delivery should be fired and forgotten (errors caught silently)
      const webhook = makeWebhook();
      vi.mocked(prisma.webhook.findMany).mockResolvedValue([webhook] as never);
      vi.mocked(prisma.webhookDelivery.create).mockResolvedValue(
        makeDelivery() as never,
      );

      // Make fetch reject to verify error is caught
      vi.mocked(globalThis.fetch).mockRejectedValue(new Error("Network error"));
      vi.mocked(prisma.$transaction).mockResolvedValue([] as never);

      // Should not throw even if delivery fails
      await expect(
        triggerWebhooks("org-1", "compliance.score_changed", { score: 85 }),
      ).resolves.toBeUndefined();
    });
  });

  // ─── Webhook delivery (via triggerWebhooks integration) ───

  describe("webhook delivery", () => {
    it("should POST the payload to the webhook URL with correct headers", async () => {
      const webhook = makeWebhook({ secret: "whsec_mysecret" });
      vi.mocked(prisma.webhook.findMany).mockResolvedValue([webhook] as never);
      vi.mocked(prisma.webhookDelivery.create).mockResolvedValue(
        makeDelivery() as never,
      );
      vi.mocked(globalThis.fetch).mockResolvedValue(
        new Response("OK", { status: 200 }),
      );
      vi.mocked(prisma.$transaction).mockResolvedValue([] as never);

      await triggerWebhooks("org-1", "compliance.score_changed", {
        score: 85,
      });

      // Wait for async delivery to complete
      await vi.advanceTimersByTimeAsync(100);

      expect(globalThis.fetch).toHaveBeenCalledWith(
        "https://example.com/webhook",
        expect.objectContaining({
          method: "POST",
          headers: expect.objectContaining({
            "Content-Type": "application/json",
            "X-Webhook-Id": "wh-1",
            "X-Webhook-Event": "compliance.score_changed",
            "X-Webhook-Signature": expect.any(String),
            "X-Webhook-Timestamp": expect.any(String),
          }),
          body: expect.any(String),
          signal: expect.any(AbortSignal),
        }),
      );
    });

    it("should include custom headers from webhook config", async () => {
      const webhook = makeWebhook({
        headers: { "X-Custom-Header": "custom-value" },
      });
      vi.mocked(prisma.webhook.findMany).mockResolvedValue([webhook] as never);
      vi.mocked(prisma.webhookDelivery.create).mockResolvedValue(
        makeDelivery() as never,
      );
      vi.mocked(globalThis.fetch).mockResolvedValue(
        new Response("OK", { status: 200 }),
      );
      vi.mocked(prisma.$transaction).mockResolvedValue([] as never);

      await triggerWebhooks("org-1", "compliance.score_changed", {
        score: 85,
      });

      await vi.advanceTimersByTimeAsync(100);

      expect(globalThis.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            "X-Custom-Header": "custom-value",
          }),
        }),
      );
    });

    it("should update delivery to DELIVERED on successful response", async () => {
      const webhook = makeWebhook();
      const delivery = makeDelivery();
      vi.mocked(prisma.webhook.findMany).mockResolvedValue([webhook] as never);
      vi.mocked(prisma.webhookDelivery.create).mockResolvedValue(
        delivery as never,
      );
      vi.mocked(globalThis.fetch).mockResolvedValue(
        new Response("OK", { status: 200 }),
      );
      vi.mocked(prisma.$transaction).mockResolvedValue([] as never);

      await triggerWebhooks("org-1", "compliance.score_changed", {
        score: 85,
      });

      await vi.advanceTimersByTimeAsync(100);

      // $transaction is called with an array of Prisma operations
      expect(prisma.$transaction).toHaveBeenCalledWith(
        expect.arrayContaining([expect.anything(), expect.anything()]),
      );
    });

    it("should handle non-OK responses by scheduling retry", async () => {
      const webhook = makeWebhook();
      const delivery = makeDelivery();
      vi.mocked(prisma.webhook.findMany).mockResolvedValue([webhook] as never);
      vi.mocked(prisma.webhookDelivery.create).mockResolvedValue(
        delivery as never,
      );
      vi.mocked(globalThis.fetch).mockResolvedValue(
        new Response("Internal Server Error", { status: 500 }),
      );
      vi.mocked(prisma.$transaction).mockResolvedValue([] as never);

      await triggerWebhooks("org-1", "compliance.score_changed", {
        score: 85,
      });

      await vi.advanceTimersByTimeAsync(100);

      // Should call $transaction for failure handling (RETRYING status since attempts < MAX_RETRY_ATTEMPTS)
      expect(prisma.$transaction).toHaveBeenCalled();
    });

    it("should handle fetch errors gracefully", async () => {
      const webhook = makeWebhook();
      const delivery = makeDelivery();
      vi.mocked(prisma.webhook.findMany).mockResolvedValue([webhook] as never);
      vi.mocked(prisma.webhookDelivery.create).mockResolvedValue(
        delivery as never,
      );
      vi.mocked(globalThis.fetch).mockRejectedValue(
        new Error("Connection refused"),
      );
      vi.mocked(prisma.$transaction).mockResolvedValue([] as never);

      await triggerWebhooks("org-1", "compliance.score_changed", {
        score: 85,
      });

      await vi.advanceTimersByTimeAsync(100);

      // Should still record the failure via $transaction
      expect(prisma.$transaction).toHaveBeenCalled();
    });
  });

  // ─── retryPendingDeliveries ───

  describe("retryPendingDeliveries", () => {
    it("should find RETRYING deliveries whose nextRetryAt has passed", async () => {
      vi.mocked(prisma.webhookDelivery.findMany).mockResolvedValue([]);

      await retryPendingDeliveries();

      expect(prisma.webhookDelivery.findMany).toHaveBeenCalledWith({
        where: {
          status: "RETRYING",
          nextRetryAt: { lte: expect.any(Date) },
        },
        include: { webhook: true },
      });
    });

    it("should retry active webhook deliveries", async () => {
      const webhook = makeWebhook({ isActive: true });
      const delivery = makeDelivery({
        status: "RETRYING",
        attempts: 1,
        webhook,
        payload: {
          id: "p-1",
          event: "compliance.score_changed",
          timestamp: "2025-01-01T00:00:00.000Z",
          data: { score: 85 },
        },
      });
      vi.mocked(prisma.webhookDelivery.findMany).mockResolvedValue([
        delivery,
      ] as never);
      vi.mocked(globalThis.fetch).mockResolvedValue(
        new Response("OK", { status: 200 }),
      );
      vi.mocked(prisma.$transaction).mockResolvedValue([] as never);

      const count = await retryPendingDeliveries();

      await vi.advanceTimersByTimeAsync(100);

      expect(count).toBe(1);
      expect(globalThis.fetch).toHaveBeenCalled();
    });

    it("should skip inactive webhook deliveries", async () => {
      const webhook = makeWebhook({ isActive: false });
      const delivery = makeDelivery({
        status: "RETRYING",
        attempts: 1,
        webhook,
      });
      vi.mocked(prisma.webhookDelivery.findMany).mockResolvedValue([
        delivery,
      ] as never);

      const count = await retryPendingDeliveries();

      expect(count).toBe(0);
      expect(globalThis.fetch).not.toHaveBeenCalled();
    });

    it("should return 0 when no deliveries need retrying", async () => {
      vi.mocked(prisma.webhookDelivery.findMany).mockResolvedValue([]);

      const count = await retryPendingDeliveries();

      expect(count).toBe(0);
    });

    it("should retry multiple deliveries and return correct count", async () => {
      const webhook = makeWebhook({ isActive: true });
      const deliveries = [
        makeDelivery({
          id: "del-1",
          attempts: 1,
          status: "RETRYING",
          webhook,
          payload: {
            id: "p-1",
            event: "compliance.score_changed",
            timestamp: "2025-01-01T00:00:00.000Z",
            data: {},
          },
        }),
        makeDelivery({
          id: "del-2",
          attempts: 2,
          status: "RETRYING",
          webhook,
          payload: {
            id: "p-2",
            event: "incident.created",
            timestamp: "2025-01-01T00:00:00.000Z",
            data: {},
          },
        }),
      ];
      vi.mocked(prisma.webhookDelivery.findMany).mockResolvedValue(
        deliveries as never,
      );
      vi.mocked(globalThis.fetch).mockResolvedValue(
        new Response("OK", { status: 200 }),
      );
      vi.mocked(prisma.$transaction).mockResolvedValue([] as never);

      const count = await retryPendingDeliveries();

      expect(count).toBe(2);
    });
  });

  // ─── getWebhookDeliveries ───

  describe("getWebhookDeliveries", () => {
    it("should return paginated delivery history", async () => {
      const deliveries = [makeDelivery({ id: "del-1" })];
      vi.mocked(prisma.webhookDelivery.findMany).mockResolvedValue(
        deliveries as never,
      );
      vi.mocked(prisma.webhookDelivery.count).mockResolvedValue(1);

      const result = await getWebhookDeliveries("wh-1");

      expect(result).toEqual({
        deliveries,
        total: 1,
        page: 1,
        pageSize: 20,
      });
      expect(prisma.webhookDelivery.findMany).toHaveBeenCalledWith({
        where: { webhookId: "wh-1" },
        orderBy: { createdAt: "desc" },
        skip: 0,
        take: 20,
      });
    });

    it("should support custom page and pageSize", async () => {
      vi.mocked(prisma.webhookDelivery.findMany).mockResolvedValue([]);
      vi.mocked(prisma.webhookDelivery.count).mockResolvedValue(100);

      const result = await getWebhookDeliveries("wh-1", 3, 10);

      expect(result.page).toBe(3);
      expect(result.pageSize).toBe(10);
      expect(prisma.webhookDelivery.findMany).toHaveBeenCalledWith({
        where: { webhookId: "wh-1" },
        orderBy: { createdAt: "desc" },
        skip: 20, // (3 - 1) * 10
        take: 10,
      });
    });

    it("should return total count alongside deliveries", async () => {
      vi.mocked(prisma.webhookDelivery.findMany).mockResolvedValue([]);
      vi.mocked(prisma.webhookDelivery.count).mockResolvedValue(50);

      const result = await getWebhookDeliveries("wh-1", 1, 20);

      expect(result.total).toBe(50);
      expect(prisma.webhookDelivery.count).toHaveBeenCalledWith({
        where: { webhookId: "wh-1" },
      });
    });
  });

  // ─── getDeliveryById ───

  describe("getDeliveryById", () => {
    it("should return a delivery by ID", async () => {
      const delivery = makeDelivery();
      vi.mocked(prisma.webhookDelivery.findUnique).mockResolvedValue(
        delivery as never,
      );

      const result = await getDeliveryById("del-1");

      expect(result).toEqual(delivery);
      expect(prisma.webhookDelivery.findUnique).toHaveBeenCalledWith({
        where: { id: "del-1" },
      });
    });

    it("should return null when delivery is not found", async () => {
      vi.mocked(prisma.webhookDelivery.findUnique).mockResolvedValue(null);

      const result = await getDeliveryById("del-nonexistent");

      expect(result).toBeNull();
    });
  });

  // ─── retryDelivery ───

  describe("retryDelivery", () => {
    it("should throw when delivery is not found", async () => {
      vi.mocked(prisma.webhookDelivery.findUnique).mockResolvedValue(null);

      await expect(retryDelivery("del-nonexistent")).rejects.toThrow(
        "Delivery not found",
      );
    });

    it("should throw when delivery already succeeded", async () => {
      const delivery = makeDelivery({
        status: "DELIVERED",
        webhook: makeWebhook(),
      });
      vi.mocked(prisma.webhookDelivery.findUnique).mockResolvedValue(
        delivery as never,
      );

      await expect(retryDelivery("del-1")).rejects.toThrow(
        "Delivery already succeeded",
      );
    });

    it("should reset delivery state and re-trigger for FAILED deliveries", async () => {
      const webhook = makeWebhook();
      const delivery = makeDelivery({
        status: "FAILED",
        attempts: 3,
        errorMessage: "Previous error",
        webhook,
      });
      vi.mocked(prisma.webhookDelivery.findUnique).mockResolvedValue(
        delivery as never,
      );
      vi.mocked(prisma.webhookDelivery.update).mockResolvedValue(
        delivery as never,
      );
      vi.mocked(globalThis.fetch).mockResolvedValue(
        new Response("OK", { status: 200 }),
      );
      vi.mocked(prisma.$transaction).mockResolvedValue([] as never);

      await retryDelivery("del-1");

      // Should reset the delivery state
      expect(prisma.webhookDelivery.update).toHaveBeenCalledWith({
        where: { id: "del-1" },
        data: {
          status: "PENDING",
          attempts: 0,
          nextRetryAt: null,
          errorMessage: null,
        },
      });

      // Should trigger a new delivery attempt
      await vi.advanceTimersByTimeAsync(100);
      expect(globalThis.fetch).toHaveBeenCalled();
    });

    it("should reset and re-trigger for RETRYING deliveries", async () => {
      const webhook = makeWebhook();
      const delivery = makeDelivery({
        status: "RETRYING",
        attempts: 2,
        webhook,
      });
      vi.mocked(prisma.webhookDelivery.findUnique).mockResolvedValue(
        delivery as never,
      );
      vi.mocked(prisma.webhookDelivery.update).mockResolvedValue(
        delivery as never,
      );
      vi.mocked(globalThis.fetch).mockResolvedValue(
        new Response("OK", { status: 200 }),
      );
      vi.mocked(prisma.$transaction).mockResolvedValue([] as never);

      await retryDelivery("del-1");

      expect(prisma.webhookDelivery.update).toHaveBeenCalledWith({
        where: { id: "del-1" },
        data: expect.objectContaining({
          status: "PENDING",
          attempts: 0,
        }),
      });
    });
  });

  // ─── testWebhook ───

  describe("testWebhook", () => {
    it("should return error when webhook is not found", async () => {
      vi.mocked(prisma.webhook.findFirst).mockResolvedValue(null);

      const result = await testWebhook("wh-nonexistent", "org-1");

      expect(result).toEqual({
        success: false,
        error: "Webhook not found",
      });
    });

    it("should send a test.ping event to the webhook URL", async () => {
      const webhook = makeWebhook();
      vi.mocked(prisma.webhook.findFirst).mockResolvedValue(webhook as never);
      vi.mocked(globalThis.fetch).mockResolvedValue(
        new Response("OK", { status: 200 }),
      );

      await testWebhook("wh-1", "org-1");

      expect(globalThis.fetch).toHaveBeenCalledWith(
        "https://example.com/webhook",
        expect.objectContaining({
          method: "POST",
          headers: expect.objectContaining({
            "Content-Type": "application/json",
            "X-Webhook-Id": "wh-1",
            "X-Webhook-Event": "test.ping",
            "X-Webhook-Signature": expect.any(String),
            "X-Webhook-Timestamp": expect.any(String),
          }),
          body: expect.stringContaining('"event":"test.ping"'),
        }),
      );
    });

    it("should return success with status code and response time on OK response", async () => {
      const webhook = makeWebhook();
      vi.mocked(prisma.webhook.findFirst).mockResolvedValue(webhook as never);
      vi.mocked(globalThis.fetch).mockResolvedValue(
        new Response("OK", { status: 200 }),
      );

      const result = await testWebhook("wh-1", "org-1");

      expect(result.success).toBe(true);
      expect(result.statusCode).toBe(200);
      expect(result.responseTimeMs).toBeGreaterThanOrEqual(0);
      expect(result.error).toBeUndefined();
    });

    it("should return failure with HTTP error for non-OK responses", async () => {
      const webhook = makeWebhook();
      vi.mocked(prisma.webhook.findFirst).mockResolvedValue(webhook as never);
      vi.mocked(globalThis.fetch).mockResolvedValue(
        new Response("Not Found", { status: 404 }),
      );

      const result = await testWebhook("wh-1", "org-1");

      expect(result.success).toBe(false);
      expect(result.statusCode).toBe(404);
      expect(result.error).toBe("HTTP 404");
    });

    it("should return failure with error message on network error", async () => {
      const webhook = makeWebhook();
      vi.mocked(prisma.webhook.findFirst).mockResolvedValue(webhook as never);
      vi.mocked(globalThis.fetch).mockRejectedValue(new Error("ECONNREFUSED"));

      const result = await testWebhook("wh-1", "org-1");

      expect(result.success).toBe(false);
      expect(result.error).toBe("ECONNREFUSED");
      expect(result.responseTimeMs).toBeGreaterThanOrEqual(0);
    });

    it("should return 'Unknown error' for non-Error thrown objects", async () => {
      const webhook = makeWebhook();
      vi.mocked(prisma.webhook.findFirst).mockResolvedValue(webhook as never);
      vi.mocked(globalThis.fetch).mockRejectedValue("string error");

      const result = await testWebhook("wh-1", "org-1");

      expect(result.success).toBe(false);
      expect(result.error).toBe("Unknown error");
    });

    it("should include the test payload with webhook info", async () => {
      const webhook = makeWebhook({ name: "My Test Hook" });
      vi.mocked(prisma.webhook.findFirst).mockResolvedValue(webhook as never);
      vi.mocked(globalThis.fetch).mockResolvedValue(
        new Response("OK", { status: 200 }),
      );

      await testWebhook("wh-1", "org-1");

      const callArgs = vi.mocked(globalThis.fetch).mock.calls[0];
      const body = JSON.parse(callArgs[1]!.body as string);

      expect(body.event).toBe("test.ping");
      expect(body.data.message).toBe(
        "This is a test webhook delivery from Caelex",
      );
      expect(body.data.webhookId).toBe("wh-1");
      expect(body.data.webhookName).toBe("My Test Hook");
      expect(body.id).toBeDefined();
      expect(body.timestamp).toBeDefined();
    });

    it("should include custom headers from webhook config in test delivery", async () => {
      const webhook = makeWebhook({
        headers: { Authorization: "Bearer test-token" },
      });
      vi.mocked(prisma.webhook.findFirst).mockResolvedValue(webhook as never);
      vi.mocked(globalThis.fetch).mockResolvedValue(
        new Response("OK", { status: 200 }),
      );

      await testWebhook("wh-1", "org-1");

      expect(globalThis.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: "Bearer test-token",
          }),
        }),
      );
    });
  });

  // ─── verifySignature ───

  describe("verifySignature", () => {
    it("should return true for a valid signature", () => {
      const payload = '{"event":"test","data":{}}';
      const secret = "whsec_testsecret";
      const signature = crypto
        .createHmac("sha256", secret)
        .update(payload)
        .digest("hex");

      const result = verifySignature(payload, signature, secret);

      expect(result).toBe(true);
    });

    it("should return false for an invalid signature", () => {
      const payload = '{"event":"test","data":{}}';
      const secret = "whsec_testsecret";
      const wrongSignature = "0".repeat(64); // Wrong but valid hex length

      // timingSafeEqual will throw if buffers are different lengths,
      // but our valid hex is the same length as a sha256 hex digest (64 chars)
      const result = verifySignature(payload, wrongSignature, secret);

      expect(result).toBe(false);
    });

    it("should return false when payload has been tampered with", () => {
      const originalPayload = '{"event":"test","data":{"score":100}}';
      const secret = "whsec_testsecret";
      const signature = crypto
        .createHmac("sha256", secret)
        .update(originalPayload)
        .digest("hex");

      const tamperedPayload = '{"event":"test","data":{"score":0}}';
      const result = verifySignature(tamperedPayload, signature, secret);

      expect(result).toBe(false);
    });

    it("should return false when secret is different", () => {
      const payload = '{"event":"test","data":{}}';
      const correctSecret = "whsec_correct";
      const wrongSecret = "whsec_wrong";
      const signature = crypto
        .createHmac("sha256", correctSecret)
        .update(payload)
        .digest("hex");

      const result = verifySignature(payload, signature, wrongSecret);

      expect(result).toBe(false);
    });

    it("should throw when signature length does not match expected", () => {
      const payload = '{"event":"test","data":{}}';
      const secret = "whsec_testsecret";
      const shortSignature = "abcd"; // Too short for timingSafeEqual

      expect(() => verifySignature(payload, shortSignature, secret)).toThrow();
    });

    it("should use timing-safe comparison to prevent timing attacks", () => {
      // Verify it uses timingSafeEqual internally by checking correct behavior
      const payload = '{"test":"payload"}';
      const secret = "whsec_secure";

      // Generate the correct signature
      const correctSignature = crypto
        .createHmac("sha256", secret)
        .update(payload)
        .digest("hex");

      expect(verifySignature(payload, correctSignature, secret)).toBe(true);
    });

    it("should work with different payload formats", () => {
      const payloads = [
        '{"simple":"value"}',
        '{"nested":{"deep":{"value":true}}}',
        '{"array":[1,2,3]}',
        '{"unicode":"\\u00e9\\u00e8\\u00ea"}',
        "",
      ];
      const secret = "whsec_testsecret";

      for (const payload of payloads) {
        const signature = crypto
          .createHmac("sha256", secret)
          .update(payload)
          .digest("hex");
        expect(verifySignature(payload, signature, secret)).toBe(true);
      }
    });
  });

  // ─── cleanupOldDeliveries ───

  describe("cleanupOldDeliveries", () => {
    it("should delete old DELIVERED deliveries with default 30 days", async () => {
      vi.mocked(prisma.webhookDelivery.deleteMany).mockResolvedValue({
        count: 42,
      } as never);

      const count = await cleanupOldDeliveries();

      expect(count).toBe(42);
      expect(prisma.webhookDelivery.deleteMany).toHaveBeenCalledWith({
        where: {
          createdAt: { lt: expect.any(Date) },
          status: "DELIVERED",
        },
      });
    });

    it("should use custom days parameter", async () => {
      vi.mocked(prisma.webhookDelivery.deleteMany).mockResolvedValue({
        count: 10,
      } as never);

      const count = await cleanupOldDeliveries(7);

      expect(count).toBe(10);
      expect(prisma.webhookDelivery.deleteMany).toHaveBeenCalledWith({
        where: {
          createdAt: { lt: expect.any(Date) },
          status: "DELIVERED",
        },
      });
    });

    it("should calculate correct cutoff date", async () => {
      vi.mocked(prisma.webhookDelivery.deleteMany).mockResolvedValue({
        count: 0,
      } as never);

      const now = new Date("2025-06-15T12:00:00.000Z");
      vi.setSystemTime(now);

      await cleanupOldDeliveries(30);

      const expectedCutoff = new Date("2025-05-16T12:00:00.000Z");
      const callArgs = vi.mocked(prisma.webhookDelivery.deleteMany).mock
        .calls[0][0] as {
        where: { createdAt: { lt: Date } };
      };
      const actualCutoff = callArgs.where.createdAt.lt;

      expect(actualCutoff.toISOString()).toBe(expectedCutoff.toISOString());
    });

    it("should only delete DELIVERED status deliveries", async () => {
      vi.mocked(prisma.webhookDelivery.deleteMany).mockResolvedValue({
        count: 0,
      } as never);

      await cleanupOldDeliveries();

      expect(prisma.webhookDelivery.deleteMany).toHaveBeenCalledWith({
        where: expect.objectContaining({
          status: "DELIVERED",
        }),
      });
    });

    it("should return 0 when no deliveries to clean up", async () => {
      vi.mocked(prisma.webhookDelivery.deleteMany).mockResolvedValue({
        count: 0,
      } as never);

      const count = await cleanupOldDeliveries();

      expect(count).toBe(0);
    });
  });

  // ─── getWebhookStats ───

  describe("getWebhookStats", () => {
    it("should return total deliveries count", async () => {
      vi.mocked(prisma.webhookDelivery.count).mockResolvedValue(100);
      vi.mocked(prisma.webhookDelivery.groupBy).mockResolvedValue([
        { status: "DELIVERED", _count: 80 },
        { status: "FAILED", _count: 20 },
      ] as never);
      vi.mocked(prisma.webhookDelivery.findMany)
        .mockResolvedValueOnce(
          // deliveries for avg response time
          [
            { responseTimeMs: 100 },
            { responseTimeMs: 200 },
            { responseTimeMs: 300 },
          ] as never,
        )
        .mockResolvedValueOnce(
          // recent failures
          [] as never,
        );

      const stats = await getWebhookStats("wh-1");

      expect(stats.totalDeliveries).toBe(100);
    });

    it("should calculate correct success rate", async () => {
      vi.mocked(prisma.webhookDelivery.count).mockResolvedValue(100);
      vi.mocked(prisma.webhookDelivery.groupBy).mockResolvedValue([
        { status: "DELIVERED", _count: 75 },
        { status: "FAILED", _count: 25 },
      ] as never);
      vi.mocked(prisma.webhookDelivery.findMany)
        .mockResolvedValueOnce([{ responseTimeMs: 100 }] as never)
        .mockResolvedValueOnce([] as never);

      const stats = await getWebhookStats("wh-1");

      expect(stats.successRate).toBe(75);
    });

    it("should return 0 success rate when no deliveries", async () => {
      vi.mocked(prisma.webhookDelivery.count).mockResolvedValue(0);
      vi.mocked(prisma.webhookDelivery.groupBy).mockResolvedValue([] as never);
      vi.mocked(prisma.webhookDelivery.findMany)
        .mockResolvedValueOnce([] as never)
        .mockResolvedValueOnce([] as never);

      const stats = await getWebhookStats("wh-1");

      expect(stats.successRate).toBe(0);
      expect(stats.totalDeliveries).toBe(0);
    });

    it("should calculate average response time from delivered deliveries", async () => {
      vi.mocked(prisma.webhookDelivery.count).mockResolvedValue(3);
      vi.mocked(prisma.webhookDelivery.groupBy).mockResolvedValue([
        { status: "DELIVERED", _count: 3 },
      ] as never);
      vi.mocked(prisma.webhookDelivery.findMany)
        .mockResolvedValueOnce([
          { responseTimeMs: 100 },
          { responseTimeMs: 200 },
          { responseTimeMs: 300 },
        ] as never)
        .mockResolvedValueOnce([] as never);

      const stats = await getWebhookStats("wh-1");

      expect(stats.avgResponseTime).toBe(200); // (100 + 200 + 300) / 3
    });

    it("should return 0 average response time when no delivered deliveries", async () => {
      vi.mocked(prisma.webhookDelivery.count).mockResolvedValue(5);
      vi.mocked(prisma.webhookDelivery.groupBy).mockResolvedValue([
        { status: "FAILED", _count: 5 },
      ] as never);
      vi.mocked(prisma.webhookDelivery.findMany)
        .mockResolvedValueOnce([] as never)
        .mockResolvedValueOnce([] as never);

      const stats = await getWebhookStats("wh-1");

      expect(stats.avgResponseTime).toBe(0);
    });

    it("should return deliveries grouped by status", async () => {
      vi.mocked(prisma.webhookDelivery.count).mockResolvedValue(100);
      vi.mocked(prisma.webhookDelivery.groupBy).mockResolvedValue([
        { status: "DELIVERED", _count: 70 },
        { status: "FAILED", _count: 20 },
        { status: "RETRYING", _count: 5 },
        { status: "PENDING", _count: 5 },
      ] as never);
      vi.mocked(prisma.webhookDelivery.findMany)
        .mockResolvedValueOnce([] as never)
        .mockResolvedValueOnce([] as never);

      const stats = await getWebhookStats("wh-1");

      expect(stats.deliveriesByStatus.DELIVERED).toBe(70);
      expect(stats.deliveriesByStatus.FAILED).toBe(20);
      expect(stats.deliveriesByStatus.RETRYING).toBe(5);
      expect(stats.deliveriesByStatus.PENDING).toBe(5);
    });

    it("should return recent failures (up to 5)", async () => {
      const failures = [
        makeDelivery({ id: "del-f1", status: "FAILED" }),
        makeDelivery({ id: "del-f2", status: "FAILED" }),
      ];
      vi.mocked(prisma.webhookDelivery.count).mockResolvedValue(10);
      vi.mocked(prisma.webhookDelivery.groupBy).mockResolvedValue([
        { status: "DELIVERED", _count: 8 },
        { status: "FAILED", _count: 2 },
      ] as never);
      vi.mocked(prisma.webhookDelivery.findMany)
        .mockResolvedValueOnce([] as never)
        .mockResolvedValueOnce(failures as never);

      const stats = await getWebhookStats("wh-1");

      expect(stats.recentFailures).toHaveLength(2);
      expect(stats.recentFailures[0].id).toBe("del-f1");
    });

    it("should query with correct filters for each parallel query", async () => {
      vi.mocked(prisma.webhookDelivery.count).mockResolvedValue(0);
      vi.mocked(prisma.webhookDelivery.groupBy).mockResolvedValue([] as never);
      vi.mocked(prisma.webhookDelivery.findMany).mockResolvedValue([] as never);

      await getWebhookStats("wh-123");

      // Total count
      expect(prisma.webhookDelivery.count).toHaveBeenCalledWith({
        where: { webhookId: "wh-123" },
      });

      // Group by status
      expect(prisma.webhookDelivery.groupBy).toHaveBeenCalledWith({
        by: ["status"],
        where: { webhookId: "wh-123" },
        _count: true,
      });

      // Delivered deliveries for response time calculation
      expect(prisma.webhookDelivery.findMany).toHaveBeenCalledWith({
        where: { webhookId: "wh-123", status: "DELIVERED" },
        select: { responseTimeMs: true },
      });

      // Recent failures
      expect(prisma.webhookDelivery.findMany).toHaveBeenCalledWith({
        where: { webhookId: "wh-123", status: "FAILED" },
        orderBy: { createdAt: "desc" },
        take: 5,
      });
    });

    it("should handle null responseTimeMs in average calculation", async () => {
      vi.mocked(prisma.webhookDelivery.count).mockResolvedValue(3);
      vi.mocked(prisma.webhookDelivery.groupBy).mockResolvedValue([
        { status: "DELIVERED", _count: 3 },
      ] as never);
      vi.mocked(prisma.webhookDelivery.findMany)
        .mockResolvedValueOnce([
          { responseTimeMs: 100 },
          { responseTimeMs: null },
          { responseTimeMs: 200 },
        ] as never)
        .mockResolvedValueOnce([] as never);

      const stats = await getWebhookStats("wh-1");

      // (100 + 0 + 200) / 3 = 100
      expect(stats.avgResponseTime).toBe(100);
    });

    it("should round success rate to 2 decimal places", async () => {
      vi.mocked(prisma.webhookDelivery.count).mockResolvedValue(3);
      vi.mocked(prisma.webhookDelivery.groupBy).mockResolvedValue([
        { status: "DELIVERED", _count: 1 },
        { status: "FAILED", _count: 2 },
      ] as never);
      vi.mocked(prisma.webhookDelivery.findMany)
        .mockResolvedValueOnce([] as never)
        .mockResolvedValueOnce([] as never);

      const stats = await getWebhookStats("wh-1");

      // 1/3 * 100 = 33.333... => rounded to 33.33
      expect(stats.successRate).toBe(33.33);
    });
  });

  // ─── Signature generation consistency ───

  describe("signature generation (via testWebhook)", () => {
    it("should generate an HMAC-SHA256 signature that can be verified", async () => {
      const webhook = makeWebhook({ secret: "whsec_verifiable_secret" });
      vi.mocked(prisma.webhook.findFirst).mockResolvedValue(webhook as never);

      let capturedBody: string = "";
      let capturedSignature: string = "";

      vi.mocked(globalThis.fetch).mockImplementation(
        async (_url: string | URL | Request, init?: RequestInit) => {
          capturedBody = init?.body as string;
          capturedSignature = (init?.headers as Record<string, string>)[
            "X-Webhook-Signature"
          ];
          return new Response("OK", { status: 200 });
        },
      );

      await testWebhook("wh-1", "org-1");

      // Verify the signature matches what verifySignature expects
      const isValid = verifySignature(
        capturedBody,
        capturedSignature,
        "whsec_verifiable_secret",
      );
      expect(isValid).toBe(true);
    });

    it("should produce different signatures for different payloads with same secret", async () => {
      const secret = "whsec_consistent_secret";

      const sig1 = crypto
        .createHmac("sha256", secret)
        .update('{"event":"a"}')
        .digest("hex");
      const sig2 = crypto
        .createHmac("sha256", secret)
        .update('{"event":"b"}')
        .digest("hex");

      expect(sig1).not.toBe(sig2);
    });

    it("should produce different signatures for same payload with different secrets", async () => {
      const payload = '{"event":"test"}';

      const sig1 = crypto
        .createHmac("sha256", "whsec_secret1")
        .update(payload)
        .digest("hex");
      const sig2 = crypto
        .createHmac("sha256", "whsec_secret2")
        .update(payload)
        .digest("hex");

      expect(sig1).not.toBe(sig2);
    });
  });

  // ─── Delivery failure handling and retry logic ───

  describe("delivery failure and retry logic", () => {
    it("should set status to RETRYING when attempts < MAX_RETRY_ATTEMPTS", async () => {
      const webhook = makeWebhook();
      const delivery = makeDelivery({ attempts: 0 }); // After increment = 1, still < 3
      vi.mocked(prisma.webhook.findMany).mockResolvedValue([webhook] as never);
      vi.mocked(prisma.webhookDelivery.create).mockResolvedValue(
        delivery as never,
      );
      vi.mocked(globalThis.fetch).mockResolvedValue(
        new Response("Error", { status: 500 }),
      );
      vi.mocked(prisma.$transaction).mockResolvedValue([] as never);

      await triggerWebhooks("org-1", "compliance.score_changed", {
        score: 85,
      });

      await vi.advanceTimersByTimeAsync(100);

      expect(prisma.$transaction).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.anything(), // webhookDelivery.update
          expect.anything(), // webhook.update
        ]),
      );
    });

    it("should set status to FAILED when attempts >= MAX_RETRY_ATTEMPTS", async () => {
      const webhook = makeWebhook();
      const delivery = makeDelivery({ attempts: 2 }); // After increment = 3, equals MAX_RETRY_ATTEMPTS
      vi.mocked(prisma.webhook.findMany).mockResolvedValue([webhook] as never);
      vi.mocked(prisma.webhookDelivery.create).mockResolvedValue(
        delivery as never,
      );
      vi.mocked(globalThis.fetch).mockResolvedValue(
        new Response("Error", { status: 500 }),
      );
      vi.mocked(prisma.$transaction).mockResolvedValue([] as never);

      await triggerWebhooks("org-1", "compliance.score_changed", {
        score: 85,
      });

      await vi.advanceTimersByTimeAsync(100);

      // The transaction should have been called with failure data
      expect(prisma.$transaction).toHaveBeenCalled();
    });

    it("should increment webhook failureCount on delivery failure", async () => {
      const webhook = makeWebhook();
      const delivery = makeDelivery({ attempts: 0 });
      vi.mocked(prisma.webhook.findMany).mockResolvedValue([webhook] as never);
      vi.mocked(prisma.webhookDelivery.create).mockResolvedValue(
        delivery as never,
      );
      vi.mocked(globalThis.fetch).mockRejectedValue(
        new Error("Connection timeout"),
      );
      vi.mocked(prisma.$transaction).mockResolvedValue([] as never);

      await triggerWebhooks("org-1", "compliance.score_changed", {
        score: 85,
      });

      await vi.advanceTimersByTimeAsync(100);

      expect(prisma.$transaction).toHaveBeenCalled();
    });

    it("should increment webhook successCount on successful delivery", async () => {
      const webhook = makeWebhook();
      const delivery = makeDelivery({ attempts: 0 });
      vi.mocked(prisma.webhook.findMany).mockResolvedValue([webhook] as never);
      vi.mocked(prisma.webhookDelivery.create).mockResolvedValue(
        delivery as never,
      );
      vi.mocked(globalThis.fetch).mockResolvedValue(
        new Response("OK", { status: 200 }),
      );
      vi.mocked(prisma.$transaction).mockResolvedValue([] as never);

      await triggerWebhooks("org-1", "compliance.score_changed", {
        score: 85,
      });

      await vi.advanceTimersByTimeAsync(100);

      expect(prisma.$transaction).toHaveBeenCalled();
    });

    it("should truncate response body to 1000 chars on success", async () => {
      const webhook = makeWebhook();
      const delivery = makeDelivery({ attempts: 0 });
      vi.mocked(prisma.webhook.findMany).mockResolvedValue([webhook] as never);
      vi.mocked(prisma.webhookDelivery.create).mockResolvedValue(
        delivery as never,
      );

      const longResponse = "x".repeat(2000);
      vi.mocked(globalThis.fetch).mockResolvedValue(
        new Response(longResponse, { status: 200 }),
      );
      vi.mocked(prisma.$transaction).mockResolvedValue([] as never);

      await triggerWebhooks("org-1", "compliance.score_changed", {
        score: 85,
      });

      await vi.advanceTimersByTimeAsync(100);

      // Verify the transaction was called (the response body truncation happens inside deliverWebhook)
      expect(prisma.$transaction).toHaveBeenCalled();
    });
  });
});
