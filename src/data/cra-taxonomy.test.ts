import {
  SPACE_PRODUCT_TAXONOMY,
  getSpaceProductById,
  getSpaceProductsByClass,
  getSpaceProductsBySegment,
} from "./cra-taxonomy";

describe("CRA Space Product Taxonomy", () => {
  it("contains exactly 19 products", () => {
    expect(SPACE_PRODUCT_TAXONOMY).toHaveLength(19);
  });

  it("has 6 Class II products", () => {
    expect(getSpaceProductsByClass("class_II")).toHaveLength(6);
  });

  it("has 9 Class I products", () => {
    expect(getSpaceProductsByClass("class_I")).toHaveLength(9);
  });

  it("has 4 Default products", () => {
    expect(getSpaceProductsByClass("default")).toHaveLength(4);
  });

  it("every product has a non-empty classificationReasoning", () => {
    for (const product of SPACE_PRODUCT_TAXONOMY) {
      expect(product.classificationReasoning.length).toBeGreaterThan(0);
    }
  });

  it("every reasoning step has legalBasis", () => {
    for (const product of SPACE_PRODUCT_TAXONOMY) {
      for (const step of product.classificationReasoning) {
        expect(step.legalBasis).toBeTruthy();
      }
    }
  });

  it("every product has unique id", () => {
    const ids = SPACE_PRODUCT_TAXONOMY.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  describe("getSpaceProductById", () => {
    it("returns OBC for id 'obc'", () => {
      const obc = getSpaceProductById("obc");
      expect(obc).toBeDefined();
      expect(obc!.name).toBe("On-board Computer");
      expect(obc!.classification).toBe("class_II");
    });

    it("returns undefined for unknown id", () => {
      expect(getSpaceProductById("nonexistent")).toBeUndefined();
    });
  });

  describe("getSpaceProductsBySegment", () => {
    it("ground segment includes TT&C Ground System", () => {
      const ground = getSpaceProductsBySegment("ground");
      expect(ground.some((p) => p.id === "ttc_ground_system")).toBe(true);
    });

    it("link segment includes intersatellite_link", () => {
      const link = getSpaceProductsBySegment("link");
      expect(link.some((p) => p.id === "intersatellite_link")).toBe(true);
    });
  });
});
