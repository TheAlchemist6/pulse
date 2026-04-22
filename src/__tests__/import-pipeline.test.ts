import { describe, it, expect } from "vitest";
import { buildChannelSignalBundle } from "@/lib/import-pipeline";

// ============================================================================
// Import Pipeline: buildChannelSignalBundle (local version)
// ============================================================================

describe("import-pipeline buildChannelSignalBundle", () => {
  it("builds bundle from YouTubeChannel type", () => {
    const channel = {
      id: "UCtest123",
      title: "Fireship",
      description: "High-intensity code tutorials and tech news",
      thumbnailUrl: "https://example.com/thumb.jpg",
      subscriberCount: "3100000",
      videoCount: "850",
      viewCount: "500000000",
      country: "US",
      publishedAt: "2017-06-15T00:00:00Z",
      keywords: "javascript typescript web development",
      topicCategories: ["https://en.wikipedia.org/wiki/Technology"],
      madeForKids: false,
    };

    const bundle = buildChannelSignalBundle(channel);

    expect(bundle.channelId).toBe("UCtest123");
    expect(bundle.name).toBe("Fireship");
    expect(bundle.subscriberCount).toBe(3100000);
    expect(bundle.videoCount).toBe(850);
    expect(bundle.madeForKids).toBe(false);
    expect(bundle.channelAge).toMatch(/\d+ years?/);
  });

  it("handles missing optional fields", () => {
    const channel = {
      id: "UCminimal",
      title: "Minimal Channel",
      description: null,
      thumbnailUrl: null,
      subscriberCount: null,
      videoCount: null,
      viewCount: null,
      country: null,
      publishedAt: null,
      keywords: null,
      topicCategories: [],
      madeForKids: null,
    };

    const bundle = buildChannelSignalBundle(channel);

    expect(bundle.channelId).toBe("UCminimal");
    expect(bundle.name).toBe("Minimal Channel");
    expect(bundle.description).toBe("");
    expect(bundle.keywords).toBe("");
    expect(bundle.subscriberCount).toBe(0);
    expect(bundle.videoCount).toBe(0);
    expect(bundle.channelAge).toBe("unknown");
    expect(bundle.country).toBe("");
    expect(bundle.madeForKids).toBe(false);
  });

  it("calculates months for young channels", () => {
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

    const channel = {
      id: "UCyoung",
      title: "New Channel",
      description: null,
      thumbnailUrl: null,
      subscriberCount: null,
      videoCount: null,
      viewCount: null,
      country: null,
      publishedAt: threeMonthsAgo.toISOString(),
      keywords: null,
      topicCategories: [],
      madeForKids: null,
    };

    const bundle = buildChannelSignalBundle(channel);
    expect(bundle.channelAge).toMatch(/\d+ months?/);
  });
});
