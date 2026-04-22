import { describe, it, expect } from "vitest";
import {
  TAXONOMY,
  ALL_LEAF_CATEGORIES,
  ALL_TOP_LEVEL_CATEGORIES,
  computeCategoryDistribution,
  computeDiversityScore,
  isValidLeafCategory,
  getTopLevelCategory,
  buildChannelSignalBundle,
} from "@/lib/ai-categorize";

// ============================================================================
// Taxonomy Structure
// ============================================================================

describe("TAXONOMY", () => {
  it("has 10 top-level categories", () => {
    expect(Object.keys(TAXONOMY)).toHaveLength(10);
  });

  it("has at least 45 leaf categories", () => {
    expect(ALL_LEAF_CATEGORIES.length).toBeGreaterThanOrEqual(45);
  });

  it("includes the Creator Economy & Media category", () => {
    expect(ALL_TOP_LEVEL_CATEGORIES).toContain("Creator Economy & Media");
  });

  it("every top-level has at least 4 leaves", () => {
    for (const [top, leaves] of Object.entries(TAXONOMY)) {
      expect(leaves.length, `${top} should have >= 4 leaves`).toBeGreaterThanOrEqual(4);
    }
  });

  it("has no duplicate leaf categories", () => {
    const set = new Set(ALL_LEAF_CATEGORIES);
    expect(set.size).toBe(ALL_LEAF_CATEGORIES.length);
  });
});

// ============================================================================
// Category Validation
// ============================================================================

describe("isValidLeafCategory", () => {
  it("returns true for valid leaf categories", () => {
    expect(isValidLeafCategory("AI & Machine Learning")).toBe(true);
    expect(isValidLeafCategory("Esports")).toBe(true);
    expect(isValidLeafCategory("Podcasting")).toBe(true);
  });

  it("returns false for top-level categories", () => {
    expect(isValidLeafCategory("Technology & Software")).toBe(false);
    expect(isValidLeafCategory("Gaming")).toBe(false);
  });

  it("returns false for invalid strings", () => {
    expect(isValidLeafCategory("Not A Category")).toBe(false);
    expect(isValidLeafCategory("")).toBe(false);
  });
});

describe("getTopLevelCategory", () => {
  it("maps leaf to correct parent", () => {
    expect(getTopLevelCategory("AI & Machine Learning")).toBe("Technology & Software");
    expect(getTopLevelCategory("Esports")).toBe("Gaming");
    expect(getTopLevelCategory("Podcasting")).toBe("Creator Economy & Media");
    expect(getTopLevelCategory("Combat Sports")).toBe("Sports");
  });

  it("returns null for invalid categories", () => {
    expect(getTopLevelCategory("Not A Category")).toBeNull();
    expect(getTopLevelCategory("Technology & Software")).toBeNull(); // top-level, not leaf
  });
});

// ============================================================================
// Category Distribution
// ============================================================================

describe("computeCategoryDistribution", () => {
  it("counts channels per top-level category", () => {
    const channels = [
      { category: "AI & Machine Learning" },
      { category: "Programming & Dev" },
      { category: "Esports" },
      { category: "AI & Machine Learning" },
    ];

    const dist = computeCategoryDistribution(channels);
    expect(dist["Technology & Software"].count).toBe(3);
    expect(dist["Gaming"].count).toBe(1);
  });

  it("tracks subcategory counts", () => {
    const channels = [
      { category: "AI & Machine Learning" },
      { category: "AI & Machine Learning" },
      { category: "Programming & Dev" },
    ];

    const dist = computeCategoryDistribution(channels);
    expect(dist["Technology & Software"].subcategories?.["AI & Machine Learning"]).toBe(2);
    expect(dist["Technology & Software"].subcategories?.["Programming & Dev"]).toBe(1);
  });

  it("returns empty object for empty input", () => {
    expect(computeCategoryDistribution([])).toEqual({});
  });

  it("ignores invalid categories", () => {
    const channels = [
      { category: "Not A Real Category" },
      { category: "AI & Machine Learning" },
    ];

    const dist = computeCategoryDistribution(channels);
    expect(Object.keys(dist)).toHaveLength(1);
    expect(dist["Technology & Software"].count).toBe(1);
  });
});

// ============================================================================
// Diversity Score (Inverted Herfindahl-Hirschman Index)
// ============================================================================

describe("computeDiversityScore", () => {
  it("returns 0 for empty distribution", () => {
    expect(computeDiversityScore({})).toBe(0);
  });

  it("returns 0 for single category (all concentrated)", () => {
    const dist = { "Tech": { count: 100 } };
    expect(computeDiversityScore(dist)).toBe(0);
  });

  it("returns high score for even distribution", () => {
    const dist = {
      "A": { count: 20 },
      "B": { count: 20 },
      "C": { count: 20 },
      "D": { count: 20 },
      "E": { count: 20 },
    };
    const score = computeDiversityScore(dist);
    expect(score).toBeCloseTo(0.8, 1); // 1 - 1/5 = 0.8
  });

  it("returns lower score for concentrated distribution", () => {
    const dist = {
      "A": { count: 80 },
      "B": { count: 10 },
      "C": { count: 5 },
      "D": { count: 5 },
    };
    const score = computeDiversityScore(dist);
    expect(score).toBeLessThan(0.4);
  });

  it("score increases with more even distribution", () => {
    const concentrated = { "A": { count: 90 }, "B": { count: 10 } };
    const balanced = { "A": { count: 50 }, "B": { count: 50 } };

    expect(computeDiversityScore(balanced)).toBeGreaterThan(computeDiversityScore(concentrated));
  });

  it("returns value between 0 and 1", () => {
    const dist = {
      "A": { count: 34 },
      "B": { count: 28 },
      "C": { count: 19 },
      "D": { count: 17 },
      "E": { count: 11 },
    };
    const score = computeDiversityScore(dist);
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(1);
  });
});

// ============================================================================
// Build Channel Signal Bundle
// ============================================================================

describe("buildChannelSignalBundle", () => {
  it("builds correct bundle from channel data", () => {
    const channel = {
      id: "UCxyz",
      title: "Test Channel",
      description: "A test channel about testing",
      keywords: "test testing vitest",
      subscriberCount: "1000000",
      videoCount: "500",
      publishedAt: "2020-01-15T00:00:00Z",
      topicCategories: ["https://en.wikipedia.org/wiki/Technology"],
      country: "US",
      madeForKids: false,
    };

    const bundle = buildChannelSignalBundle(channel);

    expect(bundle.channelId).toBe("UCxyz");
    expect(bundle.name).toBe("Test Channel");
    expect(bundle.description).toBe("A test channel about testing");
    expect(bundle.keywords).toBe("test testing vitest");
    expect(bundle.subscriberCount).toBe(1000000);
    expect(bundle.videoCount).toBe(500);
    expect(bundle.country).toBe("US");
    expect(bundle.madeForKids).toBe(false);
    expect(bundle.topicCategories).toEqual(["https://en.wikipedia.org/wiki/Technology"]);
  });

  it("handles null/missing fields gracefully", () => {
    const channel = {
      id: "UCabc",
      title: "Minimal Channel",
      description: null,
      keywords: null,
      subscriberCount: null,
      videoCount: null,
      publishedAt: null,
      topicCategories: [],
      country: null,
      madeForKids: null,
    };

    const bundle = buildChannelSignalBundle(channel);

    expect(bundle.channelId).toBe("UCabc");
    expect(bundle.description).toBe("");
    expect(bundle.keywords).toBe("");
    expect(bundle.subscriberCount).toBe(0);
    expect(bundle.videoCount).toBe(0);
    expect(bundle.channelAge).toBe("unknown");
    expect(bundle.country).toBe("");
    expect(bundle.madeForKids).toBe(false);
  });

  it("truncates long descriptions to 1000 chars", () => {
    const channel = {
      id: "UClong",
      title: "Long Desc",
      description: "x".repeat(2000),
      keywords: "y".repeat(1000),
      subscriberCount: "100",
      videoCount: "10",
      publishedAt: null,
      topicCategories: [],
      country: null,
      madeForKids: null,
    };

    const bundle = buildChannelSignalBundle(channel);
    expect(bundle.description.length).toBeLessThanOrEqual(1000);
    expect(bundle.keywords.length).toBeLessThanOrEqual(500);
  });

  it("calculates channel age correctly", () => {
    const twoYearsAgo = new Date();
    twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);

    const channel = {
      id: "UCage",
      title: "Old Channel",
      description: null,
      keywords: null,
      subscriberCount: null,
      videoCount: null,
      publishedAt: twoYearsAgo.toISOString(),
      topicCategories: [],
      country: null,
      madeForKids: null,
    };

    const bundle = buildChannelSignalBundle(channel);
    expect(bundle.channelAge).toBe("2 years");
  });
});
