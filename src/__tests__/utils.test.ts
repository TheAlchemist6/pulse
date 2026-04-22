import { describe, it, expect } from "vitest";
import { cn, formatNumber, formatDate, slugify, generateId, DEFAULT_TAXONOMY } from "@/lib/utils";

// ============================================================================
// cn (class name merger)
// ============================================================================

describe("cn", () => {
  it("merges class names", () => {
    expect(cn("foo", "bar")).toBe("foo bar");
  });

  it("handles conditional classes", () => {
    expect(cn("base", false && "hidden", "visible")).toBe("base visible");
  });

  it("handles undefined/null", () => {
    expect(cn("base", undefined, null, "end")).toBe("base end");
  });

  it("resolves tailwind conflicts (last wins)", () => {
    const result = cn("p-4", "p-2");
    expect(result).toBe("p-2");
  });
});

// ============================================================================
// formatNumber
// ============================================================================

describe("formatNumber", () => {
  it("formats zero", () => {
    expect(formatNumber(0)).toBe("0");
  });

  it("formats small numbers without abbreviation", () => {
    expect(formatNumber(42)).toBe("42");
    expect(formatNumber(999)).toBe("999");
  });

  it("formats thousands with K", () => {
    expect(formatNumber(1000)).toBe("1.0K");
    expect(formatNumber(1500)).toBe("1.5K");
    expect(formatNumber(10000)).toBe("10.0K");
  });

  it("formats millions with M", () => {
    expect(formatNumber(1000000)).toBe("1.0M");
    expect(formatNumber(3500000)).toBe("3.5M");
  });
});

// ============================================================================
// slugify
// ============================================================================

describe("slugify", () => {
  it("converts to lowercase kebab-case", () => {
    expect(slugify("Hello World")).toBe("hello-world");
  });

  it("handles special characters", () => {
    const result = slugify("AI & Machine Learning");
    expect(result).toMatch(/^ai.*machine.*learning$/);
    expect(result).not.toMatch(/\s/); // no spaces
  });

  it("handles multiple spaces", () => {
    expect(slugify("too   many   spaces")).toBe("too-many-spaces");
  });
});

// ============================================================================
// generateId
// ============================================================================

describe("generateId", () => {
  it("generates a non-empty string", () => {
    const id = generateId();
    expect(id).toBeTruthy();
    expect(typeof id).toBe("string");
  });

  it("generates unique IDs", () => {
    const ids = new Set(Array.from({ length: 100 }, () => generateId()));
    expect(ids.size).toBe(100);
  });
});

// ============================================================================
// DEFAULT_TAXONOMY
// ============================================================================

describe("DEFAULT_TAXONOMY", () => {
  it("has 11 entries (10 categories + Uncategorized)", () => {
    expect(DEFAULT_TAXONOMY).toHaveLength(11);
  });

  it("every entry has name, slug, and children", () => {
    for (const cat of DEFAULT_TAXONOMY) {
      expect(cat.name).toBeTruthy();
      expect(cat.slug).toBeTruthy();
      expect(Array.isArray(cat.children)).toBe(true);
    }
  });

  it("children have name and slug", () => {
    for (const cat of DEFAULT_TAXONOMY) {
      for (const child of cat.children) {
        expect(child.name).toBeTruthy();
        expect(child.slug).toBeTruthy();
      }
    }
  });

  it("includes Uncategorized with no children", () => {
    const uncat = DEFAULT_TAXONOMY.find((c) => c.name === "Uncategorized");
    expect(uncat).toBeDefined();
    expect(uncat!.children).toHaveLength(0);
  });

  it("slugs are URL-safe (no spaces, lowercase)", () => {
    for (const cat of DEFAULT_TAXONOMY) {
      expect(cat.slug).not.toMatch(/\s/);
      expect(cat.slug).toBe(cat.slug.toLowerCase());
      for (const child of cat.children) {
        expect(child.slug).not.toMatch(/\s/);
        expect(child.slug).toBe(child.slug.toLowerCase());
      }
    }
  });

  it("has no duplicate slugs", () => {
    const allSlugs = DEFAULT_TAXONOMY.flatMap((c) => [c.slug, ...c.children.map((ch) => ch.slug)]);
    const set = new Set(allSlugs);
    expect(set.size).toBe(allSlugs.length);
  });
});
