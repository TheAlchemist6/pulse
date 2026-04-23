/**
 * Layer 1 — YouTube topic-category Wikipedia slug → group/niche mapping.
 * Exhaustive across the 41 unique slugs observed in OPEN-1 audit of 540 real
 * channels (2026-04-22). Weights: 5 = specific, 3-4 = medium, 2 = weak,
 * 1 = broad catch-all (loses ties to more specific mappings).
 */

import type { Group, Niche } from "./taxonomy";

export interface TopicMapping {
  group: Group;
  niche: Niche | null;
  weight: number;
}

export const TOPIC_TO_TAXONOMY: Record<string, TopicMapping> = {
  // ── TECH & SOFTWARE ──────────────────────────────────────────────
  Technology: { group: "Tech & Software", niche: null, weight: 3 },
  Artificial_intelligence: { group: "Tech & Software", niche: "AI & Machine Learning", weight: 5 },
  Machine_learning: { group: "Tech & Software", niche: "AI & Machine Learning", weight: 5 },
  Software: { group: "Tech & Software", niche: "Programming & Dev", weight: 5 },
  Computer_programming: { group: "Tech & Software", niche: "Programming & Dev", weight: 5 },
  Computer_security: { group: "Tech & Software", niche: "Cybersecurity", weight: 5 },
  Vehicle: { group: "Lifestyle & Health", niche: null, weight: 2 },

  // ── BUSINESS & FINANCE ───────────────────────────────────────────
  Business: { group: "Business & Finance", niche: null, weight: 4 },
  Entrepreneurship: { group: "Business & Finance", niche: "Entrepreneurship & Startups", weight: 5 },
  Finance: { group: "Business & Finance", niche: "Investing & Markets", weight: 5 },
  Investment: { group: "Business & Finance", niche: "Investing & Markets", weight: 5 },
  Economics: { group: "Business & Finance", niche: "Economics & Macro", weight: 5 },
  Cryptocurrency: { group: "Business & Finance", niche: "Crypto & Web3", weight: 5 },

  // ── EDUCATION & SCIENCE ──────────────────────────────────────────
  Knowledge: { group: "Education & Science", niche: null, weight: 1 },
  Science: { group: "Education & Science", niche: "Physics & Mathematics", weight: 5 },
  Mathematics: { group: "Education & Science", niche: "Physics & Mathematics", weight: 5 },
  History: { group: "Education & Science", niche: "History & Geopolitics", weight: 5 },
  Philosophy: { group: "Education & Science", niche: "Philosophy & Psychology", weight: 5 },
  Religion: { group: "Education & Science", niche: "Religion & Spirituality", weight: 5 },
  Military: { group: "Education & Science", niche: "History & Geopolitics", weight: 4 },

  // ── ENTERTAINMENT ────────────────────────────────────────────────
  Entertainment: { group: "Entertainment", niche: null, weight: 2 },
  Humour: { group: "Entertainment", niche: "Comedy & Sketches", weight: 5 },
  Film: { group: "Entertainment", niche: "Movies & TV Discussion", weight: 5 },
  Animation: { group: "Entertainment", niche: "Animation & Art", weight: 5 },
  Television_program: { group: "Entertainment", niche: "Movies & TV Discussion", weight: 4 },

  // ── GAMING ───────────────────────────────────────────────────────
  Video_game_culture: { group: "Gaming", niche: "Game Reviews & News", weight: 5 },
  Video_game: { group: "Gaming", niche: "Let's Plays & Streams", weight: 4 },
  Action_game: { group: "Gaming", niche: "Let's Plays & Streams", weight: 5 },
  "Action-adventure_game": { group: "Gaming", niche: "Let's Plays & Streams", weight: 5 },
  "Role-playing_video_game": { group: "Gaming", niche: "Let's Plays & Streams", weight: 5 },
  Strategy_video_game: { group: "Gaming", niche: "Let's Plays & Streams", weight: 5 },
  Sports_game: { group: "Gaming", niche: "Let's Plays & Streams", weight: 5 },
  Puzzle_video_game: { group: "Gaming", niche: "Let's Plays & Streams", weight: 5 },
  Simulation_video_game: { group: "Gaming", niche: "Let's Plays & Streams", weight: 5 },
  Racing_video_game: { group: "Gaming", niche: "Let's Plays & Streams", weight: 5 },
  Esports: { group: "Gaming", niche: "Esports & Competitive", weight: 5 },

  // ── MUSIC ────────────────────────────────────────────────────────
  Music: { group: "Music", niche: null, weight: 2 },
  Hip_hop_music: { group: "Music", niche: "Hip Hop, R&B & Soul", weight: 5 },
  Soul_music: { group: "Music", niche: "Hip Hop, R&B & Soul", weight: 5 },
  Rhythm_and_blues: { group: "Music", niche: "Hip Hop, R&B & Soul", weight: 5 },
  Pop_music: { group: "Music", niche: "Pop & Chart Music", weight: 5 },
  Rock_music: { group: "Music", niche: "Rock & Alternative", weight: 5 },
  Electronic_music: { group: "Music", niche: "Electronic & Production", weight: 5 },
  Music_of_Latin_America: { group: "Music", niche: "Latin Music", weight: 5 },
  Jazz: { group: "Music", niche: null, weight: 4 },

  // ── NEWS & POLITICS ──────────────────────────────────────────────
  Politics: { group: "News & Politics", niche: "Political Commentary", weight: 5 },
  Society: { group: "News & Politics", niche: null, weight: 1 },

  // ── LIFESTYLE & HEALTH ───────────────────────────────────────────
  Lifestyle: { group: "Lifestyle & Health", niche: null, weight: 2 },
  "Lifestyle_(sociology)": { group: "Lifestyle & Health", niche: null, weight: 1 },
  Health: { group: "Lifestyle & Health", niche: "Fitness & Nutrition", weight: 5 },
  Physical_fitness: { group: "Lifestyle & Health", niche: "Fitness & Nutrition", weight: 5 },
  Food: { group: "Lifestyle & Health", niche: "Cooking & Food", weight: 5 },
  Fashion: { group: "Lifestyle & Health", niche: "Fashion & Beauty", weight: 5 },
  Travel: { group: "Lifestyle & Health", niche: "Travel & Adventure", weight: 5 },
  Tourism: { group: "Lifestyle & Health", niche: "Travel & Adventure", weight: 5 },
  Hobby: { group: "Lifestyle & Health", niche: null, weight: 2 },
  Pet: { group: "Lifestyle & Health", niche: null, weight: 3 },

  // ── SPORTS ───────────────────────────────────────────────────────
  Sport: { group: "Sports", niche: null, weight: 3 },
  American_football: { group: "Sports", niche: "Football (NFL & Soccer)", weight: 5 },
  Association_football: { group: "Sports", niche: "Football (NFL & Soccer)", weight: 5 },
  Basketball: { group: "Sports", niche: "Basketball", weight: 5 },
  Mixed_martial_arts: { group: "Sports", niche: "Combat Sports & MMA", weight: 5 },
  Motorsport: { group: "Sports", niche: "Motorsport", weight: 5 },
};

export function parseWikipediaSlug(url: string): string {
  const match = url.match(/\/wiki\/([^/?#]+)/);
  return match ? decodeURIComponent(match[1]) : url;
}
