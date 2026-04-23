/**
 * Pulse Map Tier 1 taxonomy — UI-facing exports.
 *
 * Re-exports from src/lib/classification/taxonomy.ts (the canonical source written
 * to user_subscriptions.primary_group / primary_niche) and adds the explicit
 * display order that the dashboard grid expects (5 cards × 2 rows).
 */
export {
  NICHES_BY_GROUP,
  GROUPS as ALL_GROUPS,
  ALL_NICHES,
  isValidGroup,
  isValidNiche,
  getGroupForNiche,
  type Group,
  type Niche,
} from "./classification/taxonomy";

import type { Group } from "./classification/taxonomy";

/**
 * Display order for the 10-card grid (row 1, then row 2 — left to right).
 * This must match the spec's "10 groups in display order" exactly.
 */
export const TIER1_GROUP_ORDER: Group[] = [
  "Tech & Software",
  "Business & Finance",
  "Creator Economy",
  "Education & Science",
  "Entertainment",
  "Gaming",
  "News & Politics",
  "Lifestyle & Health",
  "Music",
  "Sports",
];

export const UNCATEGORIZED_LABEL = "Uncategorized";
