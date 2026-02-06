import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import Card, {
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/Card";

describe("Card Components", () => {
  describe("Card", () => {
    it("should render children", () => {
      render(<Card>Card Content</Card>);
      expect(screen.getByText("Card Content")).toBeInTheDocument();
    });

    it("should apply default variant styles", () => {
      const { container } = render(<Card>Default</Card>);
      const card = container.firstChild as HTMLElement;
      expect(card.className).toContain("bg-white/[0.04]");
      expect(card.className).toContain("border-white/10");
    });

    it("should apply glass variant styles", () => {
      const { container } = render(<Card variant="glass">Glass</Card>);
      const card = container.firstChild as HTMLElement;
      expect(card.className).toContain("backdrop-blur-xl");
    });

    it("should apply elevated variant styles", () => {
      const { container } = render(<Card variant="elevated">Elevated</Card>);
      const card = container.firstChild as HTMLElement;
      expect(card.className).toContain("bg-white/[0.06]");
      expect(card.className).toContain("shadow-lg");
    });

    it("should apply interactive variant styles", () => {
      const { container } = render(
        <Card variant="interactive">Interactive</Card>,
      );
      const card = container.firstChild as HTMLElement;
      expect(card.className).toContain("cursor-pointer");
      expect(card.className).toContain("hover:bg-white/[0.06]");
    });

    it("should apply no padding", () => {
      const { container } = render(<Card padding="none">No Padding</Card>);
      const card = container.firstChild as HTMLElement;
      expect(card.className).not.toContain("p-4");
      expect(card.className).not.toContain("p-6");
      expect(card.className).not.toContain("p-8");
    });

    it("should apply small padding", () => {
      const { container } = render(<Card padding="sm">Small Padding</Card>);
      const card = container.firstChild as HTMLElement;
      expect(card.className).toContain("p-4");
    });

    it("should apply medium padding by default", () => {
      const { container } = render(<Card>Medium Padding</Card>);
      const card = container.firstChild as HTMLElement;
      expect(card.className).toContain("p-6");
    });

    it("should apply large padding", () => {
      const { container } = render(<Card padding="lg">Large Padding</Card>);
      const card = container.firstChild as HTMLElement;
      expect(card.className).toContain("p-8");
    });

    it("should apply custom className", () => {
      const { container } = render(
        <Card className="custom-class">Custom</Card>,
      );
      const card = container.firstChild as HTMLElement;
      expect(card.className).toContain("custom-class");
    });

    it("should have rounded corners", () => {
      const { container } = render(<Card>Rounded</Card>);
      const card = container.firstChild as HTMLElement;
      expect(card.className).toContain("rounded-xl");
    });
  });

  describe("CardHeader", () => {
    it("should render children", () => {
      render(<CardHeader>Header Content</CardHeader>);
      expect(screen.getByText("Header Content")).toBeInTheDocument();
    });

    it("should apply flex layout", () => {
      const { container } = render(<CardHeader>Header</CardHeader>);
      const header = container.firstChild as HTMLElement;
      expect(header.className).toContain("flex");
      expect(header.className).toContain("items-center");
      expect(header.className).toContain("justify-between");
    });

    it("should have margin bottom", () => {
      const { container } = render(<CardHeader>Header</CardHeader>);
      const header = container.firstChild as HTMLElement;
      expect(header.className).toContain("mb-4");
    });

    it("should apply custom className", () => {
      const { container } = render(
        <CardHeader className="custom-header">Header</CardHeader>,
      );
      const header = container.firstChild as HTMLElement;
      expect(header.className).toContain("custom-header");
    });
  });

  describe("CardTitle", () => {
    it("should render children", () => {
      render(<CardTitle>Title</CardTitle>);
      expect(screen.getByText("Title")).toBeInTheDocument();
    });

    it("should render as h3 by default", () => {
      render(<CardTitle>Title</CardTitle>);
      expect(screen.getByRole("heading", { level: 3 })).toBeInTheDocument();
    });

    it("should render as h1 when specified", () => {
      render(<CardTitle as="h1">Title</CardTitle>);
      expect(screen.getByRole("heading", { level: 1 })).toBeInTheDocument();
    });

    it("should render as h2 when specified", () => {
      render(<CardTitle as="h2">Title</CardTitle>);
      expect(screen.getByRole("heading", { level: 2 })).toBeInTheDocument();
    });

    it("should render as h4 when specified", () => {
      render(<CardTitle as="h4">Title</CardTitle>);
      expect(screen.getByRole("heading", { level: 4 })).toBeInTheDocument();
    });

    it("should apply text styles", () => {
      const { container } = render(<CardTitle>Title</CardTitle>);
      const title = container.firstChild as HTMLElement;
      expect(title.className).toContain("text-[16px]");
      expect(title.className).toContain("font-semibold");
      expect(title.className).toContain("text-white");
    });

    it("should apply custom className", () => {
      const { container } = render(
        <CardTitle className="custom-title">Title</CardTitle>,
      );
      const title = container.firstChild as HTMLElement;
      expect(title.className).toContain("custom-title");
    });
  });

  describe("CardDescription", () => {
    it("should render children", () => {
      render(<CardDescription>Description text</CardDescription>);
      expect(screen.getByText("Description text")).toBeInTheDocument();
    });

    it("should render as paragraph", () => {
      const { container } = render(
        <CardDescription>Description</CardDescription>,
      );
      expect(container.querySelector("p")).toBeInTheDocument();
    });

    it("should apply text styles", () => {
      const { container } = render(
        <CardDescription>Description</CardDescription>,
      );
      const description = container.firstChild as HTMLElement;
      expect(description.className).toContain("text-[13px]");
      expect(description.className).toContain("text-white/60");
    });

    it("should apply custom className", () => {
      const { container } = render(
        <CardDescription className="custom-desc">Description</CardDescription>,
      );
      const description = container.firstChild as HTMLElement;
      expect(description.className).toContain("custom-desc");
    });
  });

  describe("CardContent", () => {
    it("should render children", () => {
      render(<CardContent>Content</CardContent>);
      expect(screen.getByText("Content")).toBeInTheDocument();
    });

    it("should render as div", () => {
      const { container } = render(<CardContent>Content</CardContent>);
      expect(container.querySelector("div")).toBeInTheDocument();
    });

    it("should apply custom className", () => {
      const { container } = render(
        <CardContent className="custom-content">Content</CardContent>,
      );
      const content = container.firstChild as HTMLElement;
      expect(content.className).toContain("custom-content");
    });
  });

  describe("CardFooter", () => {
    it("should render children", () => {
      render(<CardFooter>Footer</CardFooter>);
      expect(screen.getByText("Footer")).toBeInTheDocument();
    });

    it("should apply flex layout", () => {
      const { container } = render(<CardFooter>Footer</CardFooter>);
      const footer = container.firstChild as HTMLElement;
      expect(footer.className).toContain("flex");
      expect(footer.className).toContain("items-center");
      expect(footer.className).toContain("justify-end");
    });

    it("should have gap between items", () => {
      const { container } = render(<CardFooter>Footer</CardFooter>);
      const footer = container.firstChild as HTMLElement;
      expect(footer.className).toContain("gap-3");
    });

    it("should have top border", () => {
      const { container } = render(<CardFooter>Footer</CardFooter>);
      const footer = container.firstChild as HTMLElement;
      expect(footer.className).toContain("border-t");
      expect(footer.className).toContain("border-white/10");
    });

    it("should have margin top and padding top", () => {
      const { container } = render(<CardFooter>Footer</CardFooter>);
      const footer = container.firstChild as HTMLElement;
      expect(footer.className).toContain("mt-6");
      expect(footer.className).toContain("pt-4");
    });

    it("should apply custom className", () => {
      const { container } = render(
        <CardFooter className="custom-footer">Footer</CardFooter>,
      );
      const footer = container.firstChild as HTMLElement;
      expect(footer.className).toContain("custom-footer");
    });
  });

  describe("Card Composition", () => {
    it("should compose all card parts together", () => {
      render(
        <Card>
          <CardHeader>
            <CardTitle>Card Title</CardTitle>
          </CardHeader>
          <CardDescription>This is a description</CardDescription>
          <CardContent>Main content here</CardContent>
          <CardFooter>Footer actions</CardFooter>
        </Card>,
      );

      expect(screen.getByText("Card Title")).toBeInTheDocument();
      expect(screen.getByText("This is a description")).toBeInTheDocument();
      expect(screen.getByText("Main content here")).toBeInTheDocument();
      expect(screen.getByText("Footer actions")).toBeInTheDocument();
    });
  });
});
