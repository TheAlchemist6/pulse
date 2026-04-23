/**
 * Two-layer cascade channel classifier.
 *
 *   Layer 1 — YouTube topicDetails → TOPIC_TO_TAXONOMY
 *   Layer 2 — Keyword lexicon scoring against title + description + keywords
 *   Layer 3 — (deferred) Video-title fallback for low-confidence channels
 *
 * Precision over recall: "Uncategorized" is honest. 1-5 confidence maps to
 * ai_confidence in user_subscriptions.
 */

import type { Group, Niche } from "./taxonomy";
import { TOPIC_TO_TAXONOMY } from "./topic-map";
import { NICHE_LEXICONS } from "./keyword-lexicons";

export type ClassificationSource =
  | "topic_map"
  | "keyword"
  | "video_titles"
  | "uncategorized"
  | "community"
  | "user";

export type Confidence = 1 | 2 | 3 | 4 | 5;

export interface ChannelInput {
  channelId: string;
  title: string;
  description: string;
  keywords: string;
  topicSlugs: string[];
}

export interface ClassificationResult {
  channelId: string;
  primaryGroup: Group | null;
  primaryNiche: Niche | null;
  confidence: Confidence;
  classificationSource: ClassificationSource;
}

interface LayerOutput {
  group: Group | null;
  niche: Niche | null;
  confidence: Confidence;
  source: ClassificationSource;
}

function topConfidenceFromScore(topScore: number, separation: number): Confidence {
  if (topScore >= 8) return 5;
  if (topScore >= 5 && separation >= 3) return 4;
  if (topScore >= 3) return 3;
  if (topScore >= 2) return 2;
  return 1;
}

export function classifyByTopics(topicSlugs: string[]): LayerOutput | null {
  const groupScores: Record<string, number> = {};
  const nicheScores: Record<string, { group: Group; score: number }> = {};

  for (const slug of topicSlugs) {
    const mapping = TOPIC_TO_TAXONOMY[slug];
    if (!mapping) continue;
    groupScores[mapping.group] = (groupScores[mapping.group] || 0) + mapping.weight;
    if (mapping.niche) {
      const existing = nicheScores[mapping.niche];
      nicheScores[mapping.niche] = existing
        ? { group: mapping.group, score: existing.score + mapping.weight }
        : { group: mapping.group, score: mapping.weight };
    }
  }

  const groupEntries = Object.entries(groupScores);
  if (groupEntries.length === 0) return null;

  groupEntries.sort((a, b) => b[1] - a[1]);
  const topGroup = groupEntries[0][0] as Group;
  const topGroupScore = groupEntries[0][1];
  const secondScore = groupEntries[1]?.[1] ?? 0;
  const separation = topGroupScore - secondScore;

  const nicheEntriesForGroup = Object.entries(nicheScores)
    .filter(([, v]) => v.group === topGroup)
    .sort((a, b) => b[1].score - a[1].score);

  const topNiche = (nicheEntriesForGroup[0]?.[0] ?? null) as Niche | null;
  const confidence = topConfidenceFromScore(topGroupScore, separation);

  return { group: topGroup, niche: topNiche, confidence, source: "topic_map" };
}

const regexCache = new Map<string, RegExp>();
function wordRegex(keyword: string): RegExp {
  let re = regexCache.get(keyword);
  if (!re) {
    const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    re = new RegExp(`\\b${escaped}\\b`, "i");
    regexCache.set(keyword, re);
  }
  return re;
}

function scoreText(text: string, weight5: string[], weight3: string[], weight1: string[]): number {
  let score = 0;
  for (const kw of weight5) if (wordRegex(kw).test(text)) score += 5;
  for (const kw of weight3) if (wordRegex(kw).test(text)) score += 3;
  for (const kw of weight1) if (wordRegex(kw).test(text)) score += 1;
  return score;
}

function confidenceFromKeywordScore(score: number): Confidence {
  if (score >= 20) return 5;
  if (score >= 12) return 4;
  if (score >= 6) return 3;
  if (score >= 3) return 2;
  return 1;
}

export function classifyByKeywords(
  title: string,
  description: string,
  keywords: string,
  groupHint?: Group | null,
): LayerOutput | null {
  const text = [title, description, keywords].join(" ").toLowerCase();

  const candidates = groupHint
    ? NICHE_LEXICONS.filter((l) => l.group === groupHint)
    : NICHE_LEXICONS;

  const scored: { group: Group; niche: Niche; score: number }[] = [];
  for (const lex of candidates) {
    const score = scoreText(text, lex.weight5, lex.weight3, lex.weight1);
    if (score > 0) scored.push({ group: lex.group, niche: lex.niche, score });
  }

  if (scored.length === 0) return null;

  scored.sort((a, b) => b.score - a.score);
  const top = scored[0];
  const confidence = confidenceFromKeywordScore(top.score);
  if (confidence < 2) return null;

  return { group: top.group, niche: top.niche, confidence, source: "keyword" };
}

export function classifyChannel(input: ChannelInput): ClassificationResult {
  const l1 = input.topicSlugs.length > 0 ? classifyByTopics(input.topicSlugs) : null;

  // Strong Layer 1 — full group + niche + confidence >= 3: ship it.
  if (l1 && l1.group && l1.niche && l1.confidence >= 3) {
    return {
      channelId: input.channelId,
      primaryGroup: l1.group,
      primaryNiche: l1.niche,
      confidence: l1.confidence,
      classificationSource: "topic_map",
    };
  }

  // Either no L1, L1 group-only, or L1 low-confidence — try keywords unhinted.
  // Unhinted L2 can override L1's group when keywords strongly signal a
  // different group (e.g., "Greg Isenberg" — Technology topic slug but
  // Entrepreneurship keywords).
  const l2 = classifyByKeywords(input.title, input.description, input.keywords);
  if (l2) {
    return {
      channelId: input.channelId,
      primaryGroup: l2.group,
      primaryNiche: l2.niche,
      confidence: l2.confidence,
      classificationSource: "keyword",
    };
  }

  // Fallback: use whatever L1 gave us, even if niche is null.
  if (l1 && l1.group) {
    return {
      channelId: input.channelId,
      primaryGroup: l1.group,
      primaryNiche: l1.niche,
      confidence: l1.confidence,
      classificationSource: "topic_map",
    };
  }

  return {
    channelId: input.channelId,
    primaryGroup: null,
    primaryNiche: null,
    confidence: 1,
    classificationSource: "uncategorized",
  };
}

