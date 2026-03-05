import { describe, it, expect } from "vitest";
import { getIcon } from "./icons";

describe("icons", () => {
  describe("getIcon", () => {
    it("returns a component for known icon names", () => {
      const knownIcons = [
        "Satellite",
        "Rocket",
        "Building2",
        "Wrench",
        "Radio",
        "Flag",
        "Globe",
        "Globe2",
        "Users",
        "User",
        "GraduationCap",
        "Building",
        "Landmark",
        "CircleDot",
        "Circle",
        "Hexagon",
        "Pentagon",
        "Target",
        "Moon",
        "ClipboardCheck",
        "FileCheck",
        "FileText",
        "FileSignature",
        "Leaf",
        "Shield",
        "LayoutDashboard",
        "Bell",
        "Search",
        "Award",
        "AlertTriangle",
        "Eye",
        "Wifi",
        "Navigation",
        "Radar",
        "MapPin",
        "Map",
      ];

      knownIcons.forEach((name) => {
        const icon = getIcon(name);
        expect(icon, `Expected icon "${name}" to exist`).not.toBeNull();
        expect(icon).toBeDefined();
      });
    });

    it("returns CircleDot for the Orbit alias", () => {
      const orbit = getIcon("Orbit");
      const circleDot = getIcon("CircleDot");
      expect(orbit).not.toBeNull();
      expect(orbit).toBe(circleDot);
    });

    it("returns null for unknown icon names", () => {
      expect(getIcon("NonExistent")).toBeNull();
      expect(getIcon("")).toBeNull();
      expect(getIcon("satellite")).toBeNull(); // case-sensitive
    });
  });
});
