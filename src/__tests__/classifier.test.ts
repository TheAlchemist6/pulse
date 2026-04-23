import { describe, it, expect } from "vitest";
import {
  classifyChannel,
  classifyByTopics,
  classifyByKeywords,
} from "@/lib/classification/classifier";
import { NICHES_BY_GROUP, ALL_NICHES, GROUPS } from "@/lib/classification/taxonomy";
import { TOPIC_TO_TAXONOMY } from "@/lib/classification/topic-map";

// ============================================================================
// Taxonomy shape
// ============================================================================

describe("Taxonomy V1", () => {
  it("has 10 groups", () => {
    expect(GROUPS).toHaveLength(10);
  });

  it("has 59 niches total", () => {
    // Spec text says "58" but the listed groups sum to 59
    // (6+6+5+7+5+5+7+5+7+6). Taxonomy uses the listed niches as authoritative.
    expect(ALL_NICHES).toHaveLength(59);
  });

  it("has no duplicate niches across groups", () => {
    expect(new Set(ALL_NICHES).size).toBe(ALL_NICHES.length);
  });

  it("every group has 5-8 niches", () => {
    for (const [group, niches] of Object.entries(NICHES_BY_GROUP)) {
      expect(niches.length, `${group} niche count`).toBeGreaterThanOrEqual(5);
      expect(niches.length, `${group} niche count`).toBeLessThanOrEqual(8);
    }
  });
});

// ============================================================================
// Topic map coverage — all 41 observed slugs are mapped
// ============================================================================

describe("TOPIC_TO_TAXONOMY", () => {
  const observedSlugs = [
    "Knowledge", "Lifestyle_(sociology)", "Society", "Technology", "Music",
    "Hip_hop_music", "Entertainment", "Religion", "Video_game_culture",
    "Action_game", "Pop_music", "Health", "Action-adventure_game", "Soul_music",
    "Film", "Politics", "Electronic_music", "Role-playing_video_game",
    "Business", "Rhythm_and_blues", "Physical_fitness", "Sport", "Lifestyle",
    "Humour", "Food", "Fashion", "Travel", "Vehicle", "Basketball",
    "Artificial_intelligence", "Machine_learning", "Software",
    "Computer_programming", "Computer_security", "Entrepreneurship",
    "Finance", "Investment", "Economics", "Cryptocurrency", "Science",
    "Mathematics",
  ];

  it("maps every observed slug from the 540-channel audit", () => {
    for (const slug of observedSlugs) {
      expect(TOPIC_TO_TAXONOMY[slug], `slug ${slug} missing`).toBeDefined();
    }
  });

  it("every mapping targets a valid group", () => {
    for (const [slug, mapping] of Object.entries(TOPIC_TO_TAXONOMY)) {
      expect(GROUPS as string[], `${slug} → group`).toContain(mapping.group);
    }
  });

  it("every mapping with a niche targets a valid niche", () => {
    for (const [slug, mapping] of Object.entries(TOPIC_TO_TAXONOMY)) {
      if (mapping.niche) {
        expect(ALL_NICHES as string[], `${slug} → niche`).toContain(mapping.niche);
      }
    }
  });
});

// ============================================================================
// Named sanity checks from the audit CSV
// ============================================================================

describe("Named sanity checks", () => {
  it("NetworkChuck → Tech & Software", () => {
    const result = classifyChannel({
      channelId: "UC9x0AN7BWHpCDHSm9NiJFJQ",
      title: "NetworkChuck",
      description: "Learn networking, cybersecurity and linux with me.",
      keywords: 'Networking "Information Technology" "IT Certifications" CCNA CCNP linux',
      topicSlugs: ["Knowledge", "Technology", "Lifestyle_(sociology)"],
    });
    expect(result.primaryGroup).toBe("Tech & Software");
  });

  it("Fireship → Tech & Software", () => {
    const result = classifyChannel({
      channelId: "UCsBjURrPoezykLs9EqgamOA",
      title: "Fireship",
      description: "High-intensity code tutorials and web development tips.",
      keywords: "angular firebase web development javascript typescript",
      topicSlugs: ["Knowledge", "Technology", "Lifestyle_(sociology)"],
    });
    expect(result.primaryGroup).toBe("Tech & Software");
    expect(result.primaryNiche).toBe("Programming & Dev");
  });

  it("MrBeast → Entertainment", () => {
    const result = classifyChannel({
      channelId: "UCX6OQ3DkcsbYNE6H8uQQuVA",
      title: "MrBeast",
      description: "SUBSCRIBE FOR A COOKIE!",
      keywords: "mrbeast6000 beast mrbeast Mr.Beast",
      topicSlugs: ["Entertainment", "Lifestyle_(sociology)"],
    });
    expect(result.primaryGroup).toBe("Entertainment");
  });

  it("Greg Isenberg NOT Education & Science (should go to Business or Creator)", () => {
    const result = classifyChannel({
      channelId: "UCPjNBjflYl0-HQtUvOx0Ibw",
      title: "Greg Isenberg",
      description: "Entrepreneur. I talk about building startups and community.",
      keywords: 'Entrepreneur Entrepreneurship "Business ideas"',
      topicSlugs: ["Knowledge", "Technology", "Lifestyle_(sociology)"],
    });
    expect(result.primaryGroup).not.toBe("Education & Science");
  });
});

// ============================================================================
// Layer 1 (topic map) — topic slug → group/niche
// ============================================================================

describe("classifyByTopics (Layer 1)", () => {
  it("resolves gaming channel from two gaming slugs", () => {
    const out = classifyByTopics(["Video_game_culture", "Action_game"]);
    expect(out?.group).toBe("Gaming");
    expect(out?.niche).not.toBeNull();
  });

  it("resolves music channel with subgenre slug", () => {
    const out = classifyByTopics(["Hip_hop_music", "Music"]);
    expect(out?.group).toBe("Music");
    expect(out?.niche).toBe("Hip Hop, R&B & Soul");
  });

  it("returns null when no slugs map to taxonomy", () => {
    expect(classifyByTopics(["NonExistent_Slug_XYZ"])).toBeNull();
    expect(classifyByTopics([])).toBeNull();
  });

  it("picks group with highest accumulated weight on ties", () => {
    // Two Music hits (weight 5 each = 10) vs one Entertainment (weight 2)
    const out = classifyByTopics(["Hip_hop_music", "Pop_music", "Entertainment"]);
    expect(out?.group).toBe("Music");
  });

  it("uses topic niche when confidence >= 3 (Karpathy-like)", () => {
    const out = classifyByTopics(["Artificial_intelligence", "Machine_learning"]);
    expect(out?.group).toBe("Tech & Software");
    expect(out?.niche).toBe("AI & Machine Learning");
    expect(out?.confidence).toBeGreaterThanOrEqual(4);
  });
});

// ============================================================================
// Layer 2 (keywords) — signal string → group/niche
// ============================================================================

describe("classifyByKeywords (Layer 2)", () => {
  it("identifies AI channel from keywords alone", () => {
    const out = classifyByKeywords(
      "AI Engineer",
      "Deep learning, LLMs, GPT, fine-tuning models and shipping AI agents.",
      "llm artificial intelligence machine learning",
    );
    expect(out?.group).toBe("Tech & Software");
    expect(out?.niche).toBe("AI & Machine Learning");
  });

  it("narrows via groupHint to only the group's niches", () => {
    const out = classifyByKeywords(
      "Investor Talk",
      "Stock market analysis, dividend strategy, ETF reviews.",
      "investing stocks portfolio dividend",
      "Business & Finance",
    );
    expect(out?.group).toBe("Business & Finance");
    expect(out?.niche).toBe("Investing & Markets");
  });

  it("returns null when no keyword hits", () => {
    expect(classifyByKeywords("", "", "")).toBeNull();
  });

  it("rejects low-confidence matches (confidence < 2)", () => {
    // Single weight-1 hit = score 1 → confidence 1 → null
    const out = classifyByKeywords("coin thoughts", "", "");
    expect(out).toBeNull();
  });
});

// ============================================================================
// 20 real channels from the 540-row audit CSV
// ============================================================================

interface Sample {
  name: string;
  title: string;
  keywords: string;
  topicSlugs: string[];
  expectedGroup: string;
}

const SAMPLES: Sample[] = [
  {
    name: "Call of Duty League",
    title: "Call of Duty League",
    keywords: "call of duty cod league esports cdl competitive",
    topicSlugs: ["Video_game_culture", "Action_game"],
    expectedGroup: "Gaming",
  },
  {
    name: "COAST CONTRA",
    title: "COAST CONTRA",
    keywords: "Music Life Hip-Hop Art",
    topicSlugs: ["Hip_hop_music", "Music"],
    expectedGroup: "Music",
  },
  {
    name: "Lost In Vegas",
    title: "Lost In Vegas",
    keywords: "music reactions music reviews rock hip hop",
    topicSlugs: ["Rock_music", "Music", "Hip_hop_music", "Pop_music"],
    expectedGroup: "Music",
  },
  {
    name: "OpTic Gaming",
    title: "OpTic Gaming",
    keywords: "Optic gaming call of duty esports apex legends fortnite",
    topicSlugs: ["Action-adventure_game", "Video_game_culture", "Action_game"],
    expectedGroup: "Gaming",
  },
  {
    name: "AI Engineer",
    title: "AI Engineer",
    keywords: "llm artificial intelligence machine learning ai agents",
    topicSlugs: ["Technology", "Knowledge", "Lifestyle_(sociology)"],
    expectedGroup: "Tech & Software",
  },
  {
    name: "J. Cole",
    title: "J. Cole",
    keywords: "J Cole Official dreamville hip hop rap",
    topicSlugs: ["Lifestyle_(sociology)", "Pop_music", "Hip_hop_music", "Music"],
    expectedGroup: "Music",
  },
  {
    name: "Prompt Engineering",
    title: "Prompt Engineering",
    keywords: "llm gpt openai prompt engineering ai",
    topicSlugs: ["Lifestyle_(sociology)", "Technology", "Knowledge"],
    expectedGroup: "Tech & Software",
  },
  {
    name: "CALEB SIMPSON",
    title: "CALEB SIMPSON",
    keywords: "fashion style streetwear thrift",
    topicSlugs: ["Fashion", "Lifestyle_(sociology)", "Hobby"],
    expectedGroup: "Lifestyle & Health",
  },
  {
    name: "IBM Technology",
    title: "IBM Technology",
    keywords: "cloud hybrid ai enterprise software",
    topicSlugs: ["Knowledge", "Technology", "Lifestyle_(sociology)"],
    expectedGroup: "Tech & Software",
  },
  {
    name: "Cleo Abram",
    title: "Cleo Abram",
    keywords: "science explained technology documentary",
    topicSlugs: ["Knowledge"],
    expectedGroup: "Education & Science",
  },
  {
    name: "Damian Lillard",
    title: "Damian Lillard",
    keywords: "nba basketball damian lillard portland",
    topicSlugs: ["Basketball", "Sport"],
    expectedGroup: "Sports",
  },
  {
    name: "WIRED",
    title: "WIRED",
    keywords: "technology culture science",
    topicSlugs: ["Society", "Entertainment", "Knowledge"],
    // Layer 1 is weak (top score 2, conf 2) → defers to Layer 2. "culture"
    // hits Cultural Commentary weight5, resolving to News & Politics.
    expectedGroup: "News & Politics",
  },
  {
    name: "Danny Duncan",
    title: "Danny Duncan",
    keywords: "vlog comedy entertainment",
    topicSlugs: ["Lifestyle_(sociology)", "Entertainment"],
    expectedGroup: "Entertainment",
  },
  {
    name: "Troy Reign",
    title: "Troy Reign",
    keywords: "hip hop r&b soul music",
    topicSlugs: ["Music", "Hip_hop_music", "Soul_music"],
    expectedGroup: "Music",
  },
  {
    name: "Conquer Trading & Investing",
    title: "Conquer Trading & Investing",
    keywords: "stock market investing trading portfolio options",
    topicSlugs: ["Society", "Knowledge"],
    expectedGroup: "Business & Finance",
  },
  {
    name: "NetworkChuck sample",
    title: "NetworkChuck",
    keywords: "networking ccna ccnp linux cybersecurity",
    topicSlugs: ["Knowledge", "Technology", "Lifestyle_(sociology)"],
    expectedGroup: "Tech & Software",
  },
  {
    name: "Fireship sample",
    title: "Fireship",
    keywords: "javascript typescript react web development",
    topicSlugs: ["Knowledge", "Technology", "Lifestyle_(sociology)"],
    expectedGroup: "Tech & Software",
  },
  {
    name: "Generic cooking channel",
    title: "Easy Recipes",
    keywords: "recipe cooking chef baking cuisine",
    topicSlugs: ["Food"],
    expectedGroup: "Lifestyle & Health",
  },
  {
    name: "Generic crypto channel",
    title: "DeFi Daily",
    keywords: "bitcoin ethereum defi crypto blockchain web3",
    topicSlugs: ["Cryptocurrency"],
    expectedGroup: "Business & Finance",
  },
  {
    name: "Kyle Kulinski-style politics",
    title: "Secular Talk",
    keywords: "politics news progressive analysis current events",
    topicSlugs: ["Politics", "Society"],
    expectedGroup: "News & Politics",
  },
];

describe("20 real-channel samples from audit CSV", () => {
  for (const s of SAMPLES) {
    it(`${s.name} → ${s.expectedGroup}`, () => {
      const result = classifyChannel({
        channelId: "test",
        title: s.title,
        description: "",
        keywords: s.keywords,
        topicSlugs: s.topicSlugs,
      });
      expect(result.primaryGroup, `${s.name} wrong group`).toBe(s.expectedGroup);
    });
  }
});
