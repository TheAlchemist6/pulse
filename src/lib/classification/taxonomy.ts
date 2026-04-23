/**
 * Tier 1 Taxonomy — V1 (locked 2026-04-22).
 * 10 groups × 58 niches. All strings here are the canonical values written to
 * user_subscriptions.primary_group / primary_niche and displayed in the UI.
 */

export const NICHES_BY_GROUP = {
  "Tech & Software": [
    "AI & Machine Learning",
    "Programming & Dev",
    "Cybersecurity",
    "Consumer Tech & Gadgets",
    "Tech News & Reviews",
    "No-Code & Productivity",
  ],
  "Business & Finance": [
    "Entrepreneurship & Startups",
    "Investing & Markets",
    "Personal Finance",
    "Crypto & Web3",
    "Economics & Macro",
    "Real Estate",
  ],
  "Creator Economy": [
    "Content Strategy & Growth",
    "Personal Brand & Influence",
    "Podcasting & Long-form",
    "Newsletters & Writing",
    "Freelance & Solopreneurship",
  ],
  "Education & Science": [
    "Physics & Mathematics",
    "Biology & Medicine",
    "History & Geopolitics",
    "Philosophy & Psychology",
    "Religion & Spirituality",
    "Language Learning",
    "How-To & Tutorials",
  ],
  "Entertainment": [
    "Comedy & Sketches",
    "Movies & TV Discussion",
    "True Crime & Mystery",
    "Animation & Art",
    "Drama & Commentary",
  ],
  "Gaming": [
    "Game Reviews & News",
    "Let's Plays & Streams",
    "Esports & Competitive",
    "Game Development",
    "Retro & Nostalgia",
  ],
  "Music": [
    "Hip Hop, R&B & Soul",
    "Pop & Chart Music",
    "Rock & Alternative",
    "Electronic & Production",
    "Latin Music",
    "Music Theory & Education",
    "Music Commentary & Reviews",
  ],
  "News & Politics": [
    "Current Events & Journalism",
    "Political Commentary",
    "International Affairs",
    "Cultural Commentary",
    "Investigative & Documentary",
  ],
  "Lifestyle & Health": [
    "Fitness & Nutrition",
    "Mental Health & Mindfulness",
    "Cooking & Food",
    "Travel & Adventure",
    "Fashion & Beauty",
    "Home, DIY & Crafts",
    "Relationships & Self",
  ],
  "Sports": [
    "Football (NFL & Soccer)",
    "Basketball",
    "Combat Sports & MMA",
    "Motorsport",
    "Extreme Sports",
    "Sports Analysis & Commentary",
  ],
} as const;

export type Group = keyof typeof NICHES_BY_GROUP;
export type Niche = (typeof NICHES_BY_GROUP)[Group][number];

export const GROUPS: Group[] = Object.keys(NICHES_BY_GROUP) as Group[];
export const ALL_NICHES: Niche[] = Object.values(NICHES_BY_GROUP).flat() as Niche[];

export function isValidGroup(value: string): value is Group {
  return (GROUPS as string[]).includes(value);
}

export function isValidNiche(value: string): value is Niche {
  return (ALL_NICHES as string[]).includes(value);
}

export function getGroupForNiche(niche: string): Group | null {
  for (const [group, niches] of Object.entries(NICHES_BY_GROUP)) {
    if ((niches as readonly string[]).includes(niche)) return group as Group;
  }
  return null;
}
