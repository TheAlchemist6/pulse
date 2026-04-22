import { describe, it, expect } from "vitest";
import { isChannelDead } from "@/lib/youtube";

// ============================================================================
// Dead Channel Detection
// ============================================================================

describe("isChannelDead", () => {
  it("returns false for null input", () => {
    expect(isChannelDead(null)).toBe(false);
  });

  it("returns false for recent upload", () => {
    const lastWeek = new Date();
    lastWeek.setDate(lastWeek.getDate() - 7);
    expect(isChannelDead(lastWeek.toISOString())).toBe(false);
  });

  it("returns false for upload 5 months ago", () => {
    const fiveMonthsAgo = new Date();
    fiveMonthsAgo.setMonth(fiveMonthsAgo.getMonth() - 5);
    expect(isChannelDead(fiveMonthsAgo.toISOString())).toBe(false);
  });

  it("returns true for upload 7 months ago", () => {
    const sevenMonthsAgo = new Date();
    sevenMonthsAgo.setMonth(sevenMonthsAgo.getMonth() - 7);
    expect(isChannelDead(sevenMonthsAgo.toISOString())).toBe(true);
  });

  it("returns true for upload 2 years ago", () => {
    const twoYearsAgo = new Date();
    twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);
    expect(isChannelDead(twoYearsAgo.toISOString())).toBe(true);
  });

  it("handles exact 6-month boundary", () => {
    const exactlySixMonths = new Date();
    exactlySixMonths.setMonth(exactlySixMonths.getMonth() - 6);
    exactlySixMonths.setDate(exactlySixMonths.getDate() - 1); // one day past
    expect(isChannelDead(exactlySixMonths.toISOString())).toBe(true);
  });
});
