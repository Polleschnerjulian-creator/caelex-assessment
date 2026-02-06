import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import AuditFilters, {
  type AuditFilterState,
} from "@/components/audit/AuditFilters";

const mockFilters: AuditFilterState = {
  actions: [],
  users: [],
  dateRange: { from: null, to: null },
};

const mockActions = ["document_uploaded", "user_created", "profile_updated"];
const mockUsers = [
  { id: "user-1", name: "John Doe", email: "john@example.com" },
  { id: "user-2", name: "Jane Smith", email: "jane@example.com" },
];

describe("AuditFilters", () => {
  describe("Initial rendering", () => {
    it("should render action filter button", () => {
      render(
        <AuditFilters
          filters={mockFilters}
          onFiltersChange={vi.fn()}
          availableActions={mockActions}
          availableUsers={mockUsers}
        />,
      );
      expect(screen.getByText("Actions")).toBeInTheDocument();
    });

    it("should render user filter button", () => {
      render(
        <AuditFilters
          filters={mockFilters}
          onFiltersChange={vi.fn()}
          availableActions={mockActions}
          availableUsers={mockUsers}
        />,
      );
      expect(screen.getByText("Users")).toBeInTheDocument();
    });

    it("should render date inputs", () => {
      const { container } = render(
        <AuditFilters
          filters={mockFilters}
          onFiltersChange={vi.fn()}
          availableActions={mockActions}
          availableUsers={mockUsers}
        />,
      );
      const dateInputs = container.querySelectorAll('input[type="date"]');
      expect(dateInputs.length).toBe(2);
    });

    it("should not show clear button when no filters active", () => {
      render(
        <AuditFilters
          filters={mockFilters}
          onFiltersChange={vi.fn()}
          availableActions={mockActions}
          availableUsers={mockUsers}
        />,
      );
      expect(screen.queryByText("Clear all")).not.toBeInTheDocument();
    });
  });

  describe("Action filter", () => {
    it("should open action dropdown on click", () => {
      render(
        <AuditFilters
          filters={mockFilters}
          onFiltersChange={vi.fn()}
          availableActions={mockActions}
          availableUsers={mockUsers}
        />,
      );

      fireEvent.click(screen.getByText("Actions"));
      expect(screen.getByText("Document Uploaded")).toBeInTheDocument();
    });

    it("should call onFiltersChange when action is selected", () => {
      const onFiltersChange = vi.fn();
      render(
        <AuditFilters
          filters={mockFilters}
          onFiltersChange={onFiltersChange}
          availableActions={mockActions}
          availableUsers={mockUsers}
        />,
      );

      fireEvent.click(screen.getByText("Actions"));
      const checkbox = screen.getByRole("checkbox", {
        name: /Document Uploaded/i,
      });
      fireEvent.click(checkbox);

      expect(onFiltersChange).toHaveBeenCalledWith({
        ...mockFilters,
        actions: ["document_uploaded"],
      });
    });

    it("should show count badge when actions are selected", () => {
      const filtersWithAction: AuditFilterState = {
        ...mockFilters,
        actions: ["document_uploaded"],
      };
      render(
        <AuditFilters
          filters={filtersWithAction}
          onFiltersChange={vi.fn()}
          availableActions={mockActions}
          availableUsers={mockUsers}
        />,
      );

      expect(screen.getByText("1")).toBeInTheDocument();
    });

    it("should show message when no actions available", () => {
      render(
        <AuditFilters
          filters={mockFilters}
          onFiltersChange={vi.fn()}
          availableActions={[]}
          availableUsers={mockUsers}
        />,
      );

      fireEvent.click(screen.getByText("Actions"));
      expect(screen.getByText("No actions available")).toBeInTheDocument();
    });
  });

  describe("User filter", () => {
    it("should open user dropdown on click", () => {
      render(
        <AuditFilters
          filters={mockFilters}
          onFiltersChange={vi.fn()}
          availableActions={mockActions}
          availableUsers={mockUsers}
        />,
      );

      fireEvent.click(screen.getByText("Users"));
      expect(screen.getByText("John Doe")).toBeInTheDocument();
      expect(screen.getByText("Jane Smith")).toBeInTheDocument();
    });

    it("should call onFiltersChange when user is selected", () => {
      const onFiltersChange = vi.fn();
      render(
        <AuditFilters
          filters={mockFilters}
          onFiltersChange={onFiltersChange}
          availableActions={mockActions}
          availableUsers={mockUsers}
        />,
      );

      fireEvent.click(screen.getByText("Users"));
      const checkbox = screen.getByRole("checkbox", { name: /John Doe/i });
      fireEvent.click(checkbox);

      expect(onFiltersChange).toHaveBeenCalledWith({
        ...mockFilters,
        users: ["user-1"],
      });
    });

    it("should show user email when available", () => {
      render(
        <AuditFilters
          filters={mockFilters}
          onFiltersChange={vi.fn()}
          availableActions={mockActions}
          availableUsers={mockUsers}
        />,
      );

      fireEvent.click(screen.getByText("Users"));
      expect(screen.getByText("john@example.com")).toBeInTheDocument();
    });

    it("should show count badge when users are selected", () => {
      const filtersWithUser: AuditFilterState = {
        ...mockFilters,
        users: ["user-1", "user-2"],
      };
      render(
        <AuditFilters
          filters={filtersWithUser}
          onFiltersChange={vi.fn()}
          availableActions={mockActions}
          availableUsers={mockUsers}
        />,
      );

      expect(screen.getByText("2")).toBeInTheDocument();
    });
  });

  describe("Date range filter", () => {
    it("should call onFiltersChange when from date is changed", () => {
      const onFiltersChange = vi.fn();
      const { container } = render(
        <AuditFilters
          filters={mockFilters}
          onFiltersChange={onFiltersChange}
          availableActions={mockActions}
          availableUsers={mockUsers}
        />,
      );

      const dateInputs = container.querySelectorAll('input[type="date"]');
      const fromInput = dateInputs[0];
      fireEvent.change(fromInput, { target: { value: "2024-01-01" } });

      expect(onFiltersChange).toHaveBeenCalledWith({
        ...mockFilters,
        dateRange: { from: "2024-01-01", to: null },
      });
    });

    it("should call onFiltersChange when to date is changed", () => {
      const onFiltersChange = vi.fn();
      const { container } = render(
        <AuditFilters
          filters={mockFilters}
          onFiltersChange={onFiltersChange}
          availableActions={mockActions}
          availableUsers={mockUsers}
        />,
      );

      const dateInputs = container.querySelectorAll('input[type="date"]');
      const toInput = dateInputs[1];
      fireEvent.change(toInput, { target: { value: "2024-12-31" } });

      expect(onFiltersChange).toHaveBeenCalledWith({
        ...mockFilters,
        dateRange: { from: null, to: "2024-12-31" },
      });
    });
  });

  describe("Active filters", () => {
    it("should show clear all button when filters are active", () => {
      const filtersWithAction: AuditFilterState = {
        ...mockFilters,
        actions: ["document_uploaded"],
      };
      render(
        <AuditFilters
          filters={filtersWithAction}
          onFiltersChange={vi.fn()}
          availableActions={mockActions}
          availableUsers={mockUsers}
        />,
      );

      expect(screen.getByText("Clear all")).toBeInTheDocument();
    });

    it("should clear all filters when clear button is clicked", () => {
      const onFiltersChange = vi.fn();
      const activeFilters: AuditFilterState = {
        actions: ["document_uploaded"],
        users: ["user-1"],
        dateRange: { from: "2024-01-01", to: "2024-12-31" },
      };
      render(
        <AuditFilters
          filters={activeFilters}
          onFiltersChange={onFiltersChange}
          availableActions={mockActions}
          availableUsers={mockUsers}
        />,
      );

      fireEvent.click(screen.getByText("Clear all"));

      expect(onFiltersChange).toHaveBeenCalledWith({
        actions: [],
        users: [],
        dateRange: { from: null, to: null },
      });
    });

    it("should show filter chips when filters are active", () => {
      const activeFilters: AuditFilterState = {
        actions: ["document_uploaded"],
        users: ["user-1"],
        dateRange: { from: "2024-01-01", to: null },
      };
      render(
        <AuditFilters
          filters={activeFilters}
          onFiltersChange={vi.fn()}
          availableActions={mockActions}
          availableUsers={mockUsers}
        />,
      );

      expect(screen.getByText("Document Uploaded")).toBeInTheDocument();
      expect(screen.getByText("John Doe")).toBeInTheDocument();
      expect(screen.getByText(/From: 2024-01-01/)).toBeInTheDocument();
    });

    it("should remove action filter when chip X is clicked", () => {
      const onFiltersChange = vi.fn();
      const activeFilters: AuditFilterState = {
        ...mockFilters,
        actions: ["document_uploaded"],
      };
      render(
        <AuditFilters
          filters={activeFilters}
          onFiltersChange={onFiltersChange}
          availableActions={mockActions}
          availableUsers={mockUsers}
        />,
      );

      // Find the X button on the chip
      const chip = screen.getByText("Document Uploaded").parentElement;
      const removeButton = chip?.querySelector("button");
      if (removeButton) {
        fireEvent.click(removeButton);
      }

      expect(onFiltersChange).toHaveBeenCalledWith({
        ...mockFilters,
        actions: [],
      });
    });
  });

  describe("Dropdown behavior", () => {
    it("should close action dropdown when clicking outside", () => {
      render(
        <AuditFilters
          filters={mockFilters}
          onFiltersChange={vi.fn()}
          availableActions={mockActions}
          availableUsers={mockUsers}
        />,
      );

      // Open dropdown
      fireEvent.click(screen.getByText("Actions"));
      expect(screen.getByText("Document Uploaded")).toBeInTheDocument();

      // Click the overlay
      const overlay = document.querySelector(".fixed.inset-0");
      if (overlay) {
        fireEvent.click(overlay);
      }

      // Dropdown should be closed
      expect(screen.queryByText("Document Uploaded")).not.toBeInTheDocument();
    });

    it("should close user dropdown when action dropdown is opened", () => {
      render(
        <AuditFilters
          filters={mockFilters}
          onFiltersChange={vi.fn()}
          availableActions={mockActions}
          availableUsers={mockUsers}
        />,
      );

      // Open user dropdown
      fireEvent.click(screen.getByText("Users"));
      expect(screen.getByText("John Doe")).toBeInTheDocument();

      // Open action dropdown
      fireEvent.click(screen.getByText("Actions"));

      // User dropdown items should be hidden (in the dropdown, not in chips)
      // We need to check if the dropdown is closed
      const userDropdown = screen.queryAllByText("john@example.com");
      // Should either be empty or only show in chips area
      expect(userDropdown.length).toBe(0);
    });
  });
});
