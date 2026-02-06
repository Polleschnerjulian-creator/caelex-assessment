import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock auth
vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));

// Mock notification service
vi.mock("@/lib/services/notification-service", () => ({
  getUserNotifications: vi.fn(),
  getUnreadCount: vi.fn(),
  NOTIFICATION_CONFIG: {
    DEADLINE_APPROACHING: {
      label: "Deadline Approaching",
      category: "deadlines",
      defaultSeverity: "WARNING",
      emailSubjectPrefix: "[Deadline]",
    },
    DOCUMENT_EXPIRY: {
      label: "Document Expiring",
      category: "deadlines",
      defaultSeverity: "WARNING",
      emailSubjectPrefix: "[Document]",
    },
    COMPLIANCE_GAP: {
      label: "Compliance Gap",
      category: "compliance",
      defaultSeverity: "WARNING",
    },
    COMPLIANCE_UPDATED: {
      label: "Compliance Updated",
      category: "compliance",
      defaultSeverity: "INFO",
    },
    INCIDENT_ALERT: {
      label: "Incident Alert",
      category: "incidents",
      defaultSeverity: "URGENT",
      emailSubjectPrefix: "[Incident]",
    },
  } as Record<string, unknown>,
  NOTIFICATION_CATEGORIES: [
    { id: "deadlines", label: "Deadlines & Reminders" },
    { id: "compliance", label: "Compliance Updates" },
    { id: "incidents", label: "Incidents & Alerts" },
  ],
}));

import { auth } from "@/lib/auth";
import {
  getUserNotifications,
  getUnreadCount,
  NOTIFICATION_CONFIG,
  NOTIFICATION_CATEGORIES,
} from "@/lib/services/notification-service";
import { GET } from "@/app/api/notifications/route";
import { GET as getUnreadCountRoute } from "@/app/api/notifications/unread-count/route";

const mockSession = {
  user: {
    id: "test-user-id",
    email: "test@example.com",
    name: "Test User",
  },
};

const mockNotification = {
  id: "notif-1",
  userId: "test-user-id",
  type: "DEADLINE_APPROACHING",
  title: "Authorization deadline approaching",
  message: "Your authorization deadline is in 30 days",
  actionUrl: "/dashboard/modules/authorization",
  entityType: "authorization",
  entityId: "auth-1",
  severity: "WARNING",
  read: false,
  readAt: null,
  dismissed: false,
  emailSent: false,
  emailSentAt: null,
  organizationId: null,
  createdAt: new Date("2026-01-15T10:00:00Z"),
  updatedAt: new Date("2026-01-15T10:00:00Z"),
};

const mockNotification2 = {
  id: "notif-2",
  userId: "test-user-id",
  type: "COMPLIANCE_GAP",
  title: "Compliance gap detected",
  message: "Missing cybersecurity documentation",
  actionUrl: "/dashboard/modules/cybersecurity",
  entityType: "compliance",
  entityId: "comp-1",
  severity: "WARNING",
  read: true,
  readAt: new Date("2026-01-16T08:00:00Z"),
  dismissed: false,
  emailSent: true,
  emailSentAt: new Date("2026-01-15T12:00:00Z"),
  organizationId: null,
  createdAt: new Date("2026-01-14T10:00:00Z"),
  updatedAt: new Date("2026-01-16T08:00:00Z"),
};

const mockNotification3 = {
  id: "notif-3",
  userId: "test-user-id",
  type: "INCIDENT_ALERT",
  title: "Incident reported",
  message: "A security incident has been reported",
  actionUrl: "/dashboard/modules/supervision",
  entityType: "incident",
  entityId: "inc-1",
  severity: "URGENT",
  read: false,
  readAt: null,
  dismissed: false,
  emailSent: false,
  emailSentAt: null,
  organizationId: null,
  createdAt: new Date("2026-01-16T14:00:00Z"),
  updatedAt: new Date("2026-01-16T14:00:00Z"),
};

describe("Notifications API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("GET /api/notifications", () => {
    it("should return 401 when not authenticated", async () => {
      vi.mocked(auth).mockResolvedValue(null);

      const request = new Request("http://localhost/api/notifications");
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });

    it("should return notifications for authenticated user", async () => {
      vi.mocked(auth).mockResolvedValue(mockSession as any);
      vi.mocked(getUserNotifications).mockResolvedValue({
        notifications: [mockNotification as any, mockNotification2 as any],
        total: 2,
        unreadCount: 1,
      });

      const request = new Request("http://localhost/api/notifications");
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.notifications).toHaveLength(2);
      expect(data.total).toBe(2);
      expect(data.unreadCount).toBe(1);
      expect(data.limit).toBe(20);
      expect(data.offset).toBe(0);
      expect(getUserNotifications).toHaveBeenCalledWith(
        "test-user-id",
        {
          read: undefined,
          type: undefined,
          severity: undefined,
        },
        { limit: 20, offset: 0 },
      );
    });

    it("should filter by read=true", async () => {
      vi.mocked(auth).mockResolvedValue(mockSession as any);
      vi.mocked(getUserNotifications).mockResolvedValue({
        notifications: [mockNotification2 as any],
        total: 1,
        unreadCount: 1,
      });

      const request = new Request(
        "http://localhost/api/notifications?read=true",
      );
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.notifications).toHaveLength(1);
      expect(getUserNotifications).toHaveBeenCalledWith(
        "test-user-id",
        {
          read: true,
          type: undefined,
          severity: undefined,
        },
        { limit: 20, offset: 0 },
      );
    });

    it("should filter by read=false (unread only)", async () => {
      vi.mocked(auth).mockResolvedValue(mockSession as any);
      vi.mocked(getUserNotifications).mockResolvedValue({
        notifications: [mockNotification as any, mockNotification3 as any],
        total: 2,
        unreadCount: 2,
      });

      const request = new Request(
        "http://localhost/api/notifications?read=false",
      );
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.notifications).toHaveLength(2);
      expect(getUserNotifications).toHaveBeenCalledWith(
        "test-user-id",
        {
          read: false,
          type: undefined,
          severity: undefined,
        },
        { limit: 20, offset: 0 },
      );
    });

    it("should filter by type", async () => {
      vi.mocked(auth).mockResolvedValue(mockSession as any);
      vi.mocked(getUserNotifications).mockResolvedValue({
        notifications: [mockNotification as any],
        total: 1,
        unreadCount: 1,
      });

      const request = new Request(
        "http://localhost/api/notifications?type=DEADLINE_APPROACHING",
      );
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.notifications).toHaveLength(1);
      expect(getUserNotifications).toHaveBeenCalledWith(
        "test-user-id",
        {
          read: undefined,
          type: "DEADLINE_APPROACHING",
          severity: undefined,
        },
        { limit: 20, offset: 0 },
      );
    });

    it("should filter by severity", async () => {
      vi.mocked(auth).mockResolvedValue(mockSession as any);
      vi.mocked(getUserNotifications).mockResolvedValue({
        notifications: [mockNotification3 as any],
        total: 1,
        unreadCount: 1,
      });

      const request = new Request(
        "http://localhost/api/notifications?severity=URGENT",
      );
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.notifications).toHaveLength(1);
      expect(getUserNotifications).toHaveBeenCalledWith(
        "test-user-id",
        {
          read: undefined,
          type: undefined,
          severity: "URGENT",
        },
        { limit: 20, offset: 0 },
      );
    });

    it("should support pagination with limit and offset", async () => {
      vi.mocked(auth).mockResolvedValue(mockSession as any);
      vi.mocked(getUserNotifications).mockResolvedValue({
        notifications: [mockNotification2 as any],
        total: 3,
        unreadCount: 2,
      });

      const request = new Request(
        "http://localhost/api/notifications?limit=1&offset=1",
      );
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.notifications).toHaveLength(1);
      expect(data.total).toBe(3);
      expect(data.limit).toBe(1);
      expect(data.offset).toBe(1);
      expect(getUserNotifications).toHaveBeenCalledWith(
        "test-user-id",
        {
          read: undefined,
          type: undefined,
          severity: undefined,
        },
        { limit: 1, offset: 1 },
      );
    });

    it("should enrich notifications with config", async () => {
      vi.mocked(auth).mockResolvedValue(mockSession as any);
      vi.mocked(getUserNotifications).mockResolvedValue({
        notifications: [mockNotification as any, mockNotification3 as any],
        total: 2,
        unreadCount: 2,
      });

      const request = new Request("http://localhost/api/notifications");
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);

      // First notification (DEADLINE_APPROACHING) should have its config
      expect(data.notifications[0].config).toEqual(
        (NOTIFICATION_CONFIG as Record<string, unknown>)[
          "DEADLINE_APPROACHING"
        ],
      );

      // Third notification (INCIDENT_ALERT) should have its config
      expect(data.notifications[1].config).toEqual(
        (NOTIFICATION_CONFIG as Record<string, unknown>)["INCIDENT_ALERT"],
      );
    });

    it("should include categories in response", async () => {
      vi.mocked(auth).mockResolvedValue(mockSession as any);
      vi.mocked(getUserNotifications).mockResolvedValue({
        notifications: [],
        total: 0,
        unreadCount: 0,
      });

      const request = new Request("http://localhost/api/notifications");
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.categories).toEqual(NOTIFICATION_CATEGORIES);
      expect(data.categories).toHaveLength(3);
      expect(data.categories[0]).toEqual({
        id: "deadlines",
        label: "Deadlines & Reminders",
      });
    });

    it("should return 500 on service error", async () => {
      vi.mocked(auth).mockResolvedValue(mockSession as any);
      vi.mocked(getUserNotifications).mockRejectedValue(
        new Error("Database connection failed"),
      );

      const request = new Request("http://localhost/api/notifications");
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("Failed to fetch notifications");
    });
  });

  describe("GET /api/notifications/unread-count", () => {
    it("should return 401 when not authenticated", async () => {
      vi.mocked(auth).mockResolvedValue(null);

      const response = await getUnreadCountRoute();
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });

    it("should return unread count for authenticated user", async () => {
      vi.mocked(auth).mockResolvedValue(mockSession as any);
      vi.mocked(getUnreadCount).mockResolvedValue(5);

      const response = await getUnreadCountRoute();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.count).toBe(5);
      expect(getUnreadCount).toHaveBeenCalledWith("test-user-id");
    });

    it("should return zero when no unread notifications", async () => {
      vi.mocked(auth).mockResolvedValue(mockSession as any);
      vi.mocked(getUnreadCount).mockResolvedValue(0);

      const response = await getUnreadCountRoute();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.count).toBe(0);
    });

    it("should return 500 on service error", async () => {
      vi.mocked(auth).mockResolvedValue(mockSession as any);
      vi.mocked(getUnreadCount).mockRejectedValue(
        new Error("Database connection failed"),
      );

      const response = await getUnreadCountRoute();
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("Failed to fetch unread count");
    });
  });
});
