import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import AuditLogItem, {
  type AuditLogEntry,
} from "@/components/audit/AuditLogItem";

// Mock framer-motion
vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children, ...props }: { children: React.ReactNode }) => (
      <div {...props}>{children}</div>
    ),
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
}));

const mockEntry: AuditLogEntry = {
  id: "audit-1",
  timestamp: new Date().toISOString(),
  action: "document_uploaded",
  entityType: "Document",
  entityId: "doc-123",
  description: "Uploaded compliance document for review",
  user: {
    id: "user-1",
    name: "John Doe",
    email: "john@example.com",
  },
};

describe("AuditLogItem", () => {
  describe("Basic rendering", () => {
    it("should render the action name", () => {
      render(<AuditLogItem entry={mockEntry} />);
      expect(screen.getByText("Document Uploaded")).toBeInTheDocument();
    });

    it("should render the description", () => {
      render(<AuditLogItem entry={mockEntry} />);
      expect(
        screen.getByText("Uploaded compliance document for review"),
      ).toBeInTheDocument();
    });

    it("should render the entity type badge", () => {
      render(<AuditLogItem entry={mockEntry} />);
      expect(screen.getByText("Document")).toBeInTheDocument();
    });

    it("should render the user name", () => {
      render(<AuditLogItem entry={mockEntry} />);
      expect(screen.getByText("John Doe")).toBeInTheDocument();
    });

    it("should render time indicator", () => {
      render(<AuditLogItem entry={mockEntry} />);
      expect(screen.getByText(/now|ago/i)).toBeInTheDocument();
    });
  });

  describe("Action categorization", () => {
    it("should categorize create actions", () => {
      const entry = { ...mockEntry, action: "user_created" };
      const { container } = render(<AuditLogItem entry={entry} />);
      expect(container.querySelector(".bg-green-500\\/10")).toBeInTheDocument();
    });

    it("should categorize update actions", () => {
      const entry = { ...mockEntry, action: "profile_updated" };
      const { container } = render(<AuditLogItem entry={entry} />);
      expect(container.querySelector(".bg-blue-500\\/10")).toBeInTheDocument();
    });

    it("should categorize delete actions", () => {
      const entry = { ...mockEntry, action: "record_deleted" };
      const { container } = render(<AuditLogItem entry={entry} />);
      expect(container.querySelector(".bg-red-500\\/10")).toBeInTheDocument();
    });

    it("should categorize upload actions", () => {
      const entry = { ...mockEntry, action: "file_upload" };
      const { container } = render(<AuditLogItem entry={entry} />);
      expect(
        container.querySelector(".bg-purple-500\\/10"),
      ).toBeInTheDocument();
    });
  });

  describe("User display", () => {
    it("should show user avatar when provided", () => {
      const entryWithAvatar = {
        ...mockEntry,
        user: { ...mockEntry.user, avatar: "https://example.com/avatar.jpg" },
      };
      const { container } = render(<AuditLogItem entry={entryWithAvatar} />);
      const img = container.querySelector("img");
      expect(img).toBeInTheDocument();
      expect(img?.getAttribute("src")).toBe("https://example.com/avatar.jpg");
    });

    it("should show fallback icon when no avatar", () => {
      const { container } = render(<AuditLogItem entry={mockEntry} />);
      // Should show the user icon in a placeholder
      expect(
        container.querySelector(".w-5.h-5.rounded-full"),
      ).toBeInTheDocument();
    });

    it("should use email prefix when no name", () => {
      const entryNoName = {
        ...mockEntry,
        user: { ...mockEntry.user, name: "" },
      };
      render(<AuditLogItem entry={entryNoName} />);
      expect(screen.getByText("john")).toBeInTheDocument();
    });
  });

  describe("Expandable details", () => {
    it("should be expandable when entry has changes", () => {
      const entryWithChanges: AuditLogEntry = {
        ...mockEntry,
        changes: [
          { field: "status", oldValue: "draft", newValue: "published" },
        ],
      };
      const { container } = render(<AuditLogItem entry={entryWithChanges} />);
      // Should show chevron svg
      expect(container.querySelector("svg")).toBeInTheDocument();
    });

    it("should show changes when expanded", () => {
      const entryWithChanges: AuditLogEntry = {
        ...mockEntry,
        changes: [
          { field: "status", oldValue: "draft", newValue: "published" },
        ],
      };
      render(<AuditLogItem entry={entryWithChanges} showDetails={true} />);
      expect(screen.getByText("Changes")).toBeInTheDocument();
      expect(screen.getByText("status:")).toBeInTheDocument();
      expect(screen.getByText("draft")).toBeInTheDocument();
      expect(screen.getByText("published")).toBeInTheDocument();
    });

    it("should show IP address when available", () => {
      const entryWithIP: AuditLogEntry = {
        ...mockEntry,
        ipAddress: "192.168.1.1",
      };
      render(<AuditLogItem entry={entryWithIP} showDetails={true} />);
      expect(screen.getByText(/IP: 192.168.1.1/)).toBeInTheDocument();
    });

    it("should show metadata when available", () => {
      const entryWithMetadata: AuditLogEntry = {
        ...mockEntry,
        metadata: { key: "value", count: 42 },
      };
      render(<AuditLogItem entry={entryWithMetadata} showDetails={true} />);
      expect(screen.getByText("Additional Data")).toBeInTheDocument();
    });

    it("should toggle expansion on click", () => {
      const entryWithChanges: AuditLogEntry = {
        ...mockEntry,
        changes: [
          { field: "status", oldValue: "draft", newValue: "published" },
        ],
      };
      render(<AuditLogItem entry={entryWithChanges} />);

      // Find the clickable content area
      const content = screen.getByText("Document Uploaded").closest(".group");
      if (content) {
        fireEvent.click(content);
      }

      // After click, should show details
      expect(screen.getByText("Changes")).toBeInTheDocument();
    });
  });

  describe("Time formatting", () => {
    it("should show 'Just now' for recent entries", () => {
      const recentEntry = {
        ...mockEntry,
        timestamp: new Date().toISOString(),
      };
      render(<AuditLogItem entry={recentEntry} />);
      expect(screen.getByText("Just now")).toBeInTheDocument();
    });

    it("should show minutes ago for entries within an hour", () => {
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
      const entry = { ...mockEntry, timestamp: fiveMinutesAgo };
      render(<AuditLogItem entry={entry} />);
      expect(screen.getByText("5m ago")).toBeInTheDocument();
    });

    it("should show hours ago for entries within a day", () => {
      const twoHoursAgo = new Date(
        Date.now() - 2 * 60 * 60 * 1000,
      ).toISOString();
      const entry = { ...mockEntry, timestamp: twoHoursAgo };
      render(<AuditLogItem entry={entry} />);
      expect(screen.getByText("2h ago")).toBeInTheDocument();
    });

    it("should show days ago for entries within a week", () => {
      const threeDaysAgo = new Date(
        Date.now() - 3 * 24 * 60 * 60 * 1000,
      ).toISOString();
      const entry = { ...mockEntry, timestamp: threeDaysAgo };
      render(<AuditLogItem entry={entry} />);
      expect(screen.getByText("3d ago")).toBeInTheDocument();
    });
  });

  describe("Entity handling", () => {
    it("should show entity ID in details", () => {
      const entryWithEntity: AuditLogEntry = {
        ...mockEntry,
        entityId: "doc-123",
        ipAddress: "127.0.0.1", // Need this to make details expandable
      };
      render(<AuditLogItem entry={entryWithEntity} showDetails={true} />);
      expect(screen.getByText("doc-123")).toBeInTheDocument();
    });

    it("should not show entity type badge when not provided", () => {
      const entryNoType = { ...mockEntry, entityType: undefined };
      render(<AuditLogItem entry={entryNoType} />);
      // Should not have the badge element with "Document" text
      const badges = screen.queryAllByText("Document");
      expect(badges).toHaveLength(0);
    });
  });
});
