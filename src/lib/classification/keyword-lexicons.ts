/**
 * Layer 2 — Keyword lexicons scored against the canonical signal string
 * (title + description + keywords). Priorities target niches where Layer 1
 * (topic map) leaves gaps: Creator Economy (0 topic slugs), Business niches,
 * Tech niches within "Technology" group slug, Education niches, Lifestyle
 * niches, News niches, Music commentary.
 *
 * Weights: 5 = unambiguous niche identifier, 3 = strong indicator, 1 = broad.
 */

import type { Group, Niche } from "./taxonomy";

export interface NicheLexicon {
  group: Group;
  niche: Niche;
  weight5: string[];
  weight3: string[];
  weight1: string[];
}

export const NICHE_LEXICONS: NicheLexicon[] = [
  // ── BUSINESS & FINANCE ───────────────────────────────────────────
  {
    group: "Business & Finance",
    niche: "Crypto & Web3",
    weight5: [
      "bitcoin", "ethereum", "crypto", "cryptocurrency", "defi", "nft",
      "blockchain", "web3", "altcoin", "solana", "btc", "eth", "binance",
    ],
    weight3: ["token", "wallet", "decentralized", "protocol", "coinbase", "hodl"],
    weight1: ["coin", "chain", "ledger"],
  },
  {
    group: "Business & Finance",
    niche: "Investing & Markets",
    weight5: [
      "investing", "stocks", "stock market", "trading", "portfolio",
      "dividend", "etf", "robinhood", "passive income", "wealth",
      "s&p 500", "nasdaq", "forex", "options trading", "value investing",
    ],
    weight3: ["market", "equity", "bonds", "returns", "bull", "bear", "hedging"],
    weight1: ["money", "financial", "fund", "shares"],
  },
  {
    group: "Business & Finance",
    niche: "Entrepreneurship & Startups",
    weight5: [
      "startup", "founder", "entrepreneur", "venture capital", "saas",
      "bootstrapped", "build in public", "indie hacker", "solopreneur",
      "mrr", "arr", "product launch", "pitch deck", "vc",
    ],
    weight3: ["business model", "growth hacking", "b2b", "monetization", "scale"],
    weight1: ["business", "company", "revenue", "customers"],
  },
  {
    group: "Business & Finance",
    niche: "Personal Finance",
    weight5: [
      "personal finance", "budgeting", "debt free", "financial independence",
      "fire movement", "frugal", "emergency fund", "net worth", "retire early",
      "student loans", "credit score", "savings rate",
    ],
    weight3: ["budget", "mortgage", "side hustle", "401k", "ira", "roth"],
    weight1: ["save", "spend", "debt", "income"],
  },

  // ── CREATOR ECONOMY (keyword-only, no topic slugs) ───────────────
  {
    group: "Creator Economy",
    niche: "Content Strategy & Growth",
    weight5: [
      "youtube growth", "youtube algorithm", "grow your channel",
      "content creator", "youtube strategy", "youtube tips",
      "video marketing", "youtube seo", "channel growth",
    ],
    weight3: [
      "content strategy", "audience building", "subscribers", "views",
      "thumbnails", "titles", "youtube analytics",
    ],
    weight1: ["content", "creator", "channel", "upload"],
  },
  {
    group: "Creator Economy",
    niche: "Personal Brand & Influence",
    weight5: [
      "personal brand", "build in public", "thought leadership",
      "newsletter", "substack", "twitter audience", "linkedin",
    ],
    weight3: ["audience", "following", "influence", "community building"],
    weight1: ["brand", "presence", "online"],
  },
  {
    group: "Creator Economy",
    niche: "Podcasting & Long-form",
    weight5: [
      "podcast", "podcasting", "long form", "interview show",
      "weekly show", "episode", "host",
    ],
    weight3: ["conversation", "guest", "interview", "show notes"],
    weight1: ["audio", "listen"],
  },

  // ── TECH NICHES (Technology slug gives group only) ───────────────
  {
    group: "Tech & Software",
    niche: "AI & Machine Learning",
    weight5: [
      "artificial intelligence", "machine learning", "deep learning",
      "neural network", "llm", "gpt", "chatgpt", "openai", "claude",
      "generative ai", "ai agents", "rag", "embeddings", "transformers",
      "diffusion model", "prompt engineering", "llama", "mistral",
    ],
    weight3: ["ai", "ml", "nlp", "computer vision", "fine-tuning", "inference"],
    weight1: ["model", "dataset", "training"],
  },
  {
    group: "Tech & Software",
    niche: "Programming & Dev",
    weight5: [
      "javascript", "python", "typescript", "react", "rust", "golang",
      "web development", "software engineering", "backend", "frontend",
      "full stack", "github", "open source", "api", "coding tutorial",
    ],
    weight3: [
      "programming", "developer", "devops", "kubernetes", "docker",
      "aws", "cloud", "database", "software",
    ],
    weight1: ["code", "build", "deploy", "debug"],
  },
  {
    group: "Tech & Software",
    niche: "Cybersecurity",
    weight5: [
      "cybersecurity", "hacking", "ethical hacking", "penetration testing",
      "infosec", "security research", "ctf", "malware", "vulnerability",
      "ccna", "ccnp", "networking", "cisco", "linux security",
    ],
    weight3: ["security", "privacy", "encryption", "firewall", "threat"],
    weight1: ["secure", "protect", "attack"],
  },
  {
    group: "Tech & Software",
    niche: "Consumer Tech & Gadgets",
    weight5: [
      "tech review", "smartphone review", "laptop review", "gadget",
      "unboxing", "camera review", "best phone", "apple", "samsung",
      "mkbhd", "linus tech",
    ],
    weight3: ["hardware", "specs", "benchmark", "display", "battery"],
    weight1: ["device", "product", "tech"],
  },

  // ── EDUCATION NICHES ─────────────────────────────────────────────
  {
    group: "Education & Science",
    niche: "History & Geopolitics",
    weight5: [
      "history", "geopolitics", "world war", "ancient", "historical",
      "empire", "civilization", "geography", "political geography",
      "foreign policy", "international relations",
    ],
    weight3: ["war", "nation", "country", "power"],
    weight1: ["past", "event", "era"],
  },
  {
    group: "Education & Science",
    niche: "Philosophy & Psychology",
    weight5: [
      "philosophy", "psychology", "stoicism", "existentialism",
      "cognitive science", "mental models", "critical thinking",
      "consciousness", "ethics", "epistemology",
    ],
    weight3: ["thinking", "mind", "behavior", "human nature", "ideas"],
    weight1: ["thought", "belief", "concept"],
  },
  {
    group: "Education & Science",
    niche: "Physics & Mathematics",
    weight5: [
      "physics", "mathematics", "quantum", "relativity", "calculus",
      "linear algebra", "statistics", "chemistry", "biology",
      "science explained", "stem",
    ],
    weight3: ["science", "research", "experiment", "theory", "equation"],
    weight1: ["math", "formula"],
  },

  // ── LIFESTYLE NICHES ─────────────────────────────────────────────
  {
    group: "Lifestyle & Health",
    niche: "Fitness & Nutrition",
    weight5: [
      "workout", "fitness", "gym", "bodybuilding", "calisthenics",
      "nutrition", "diet", "weight loss", "muscle", "crossfit",
      "strength training", "protein", "calories", "bulk", "cut",
    ],
    weight3: ["exercise", "training", "health", "wellness", "cardio"],
    weight1: ["body", "healthy", "physical"],
  },
  {
    group: "Lifestyle & Health",
    niche: "Cooking & Food",
    weight5: [
      "recipe", "cooking", "chef", "baking", "cuisine", "restaurant",
      "meal prep", "food review", "kitchen", "vegan recipes", "bbq",
    ],
    weight3: ["food", "ingredients", "dish", "eat", "taste"],
    weight1: ["cook", "meal", "delicious"],
  },
  {
    group: "Lifestyle & Health",
    niche: "Travel & Adventure",
    weight5: [
      "travel", "travel vlog", "destination", "backpacking", "road trip",
      "travel tips", "solo travel", "budget travel", "digital nomad",
    ],
    weight3: ["country", "city", "explore", "adventure", "trip"],
    weight1: ["visit", "place", "journey"],
  },
  {
    group: "Lifestyle & Health",
    niche: "Mental Health & Mindfulness",
    weight5: [
      "mental health", "mindfulness", "meditation", "anxiety", "therapy",
      "self improvement", "productivity", "journaling",
      "self care", "wellbeing", "personal development",
    ],
    weight3: ["stress", "habits", "growth", "mindset", "focus"],
    weight1: ["better", "improve", "calm"],
  },
  {
    group: "Lifestyle & Health",
    niche: "Fashion & Beauty",
    weight5: [
      "fashion", "style", "outfit", "makeup", "skincare", "beauty",
      "clothing", "streetwear", "luxury fashion", "thrift",
    ],
    weight3: ["look", "wear", "trend", "aesthetic"],
    weight1: ["clothes", "dress"],
  },

  // ── NEWS & POLITICS NICHES ───────────────────────────────────────
  {
    group: "News & Politics",
    niche: "Current Events & Journalism",
    weight5: [
      "news", "breaking news", "journalism", "reporter", "investigation",
      "documentary", "current events", "analysis", "world news",
    ],
    weight3: ["report", "coverage", "media", "press"],
    weight1: ["today", "update", "story"],
  },
  {
    group: "News & Politics",
    niche: "Cultural Commentary",
    weight5: [
      "culture", "society", "social commentary", "essay", "critique",
      "opinion", "discourse", "zeitgeist", "media criticism",
    ],
    weight3: ["commentary", "perspective", "cultural", "social"],
    weight1: ["think", "argue", "discuss"],
  },

  // ── MUSIC NICHES ─────────────────────────────────────────────────
  {
    group: "Music",
    niche: "Hip Hop, R&B & Soul",
    weight5: [
      "hip hop", "rap", "r&b", "soul", "trap", "drill", "freestyle",
      "bars", "lyrics", "rapper", "producer beats",
    ],
    weight3: ["flow", "verse", "hook", "sample"],
    weight1: ["music", "song", "track"],
  },
  {
    group: "Music",
    niche: "Music Commentary & Reviews",
    weight5: [
      "music review", "album review", "music reaction", "music analysis",
      "music theory", "music production tutorial", "mixing", "mastering",
    ],
    weight3: ["review", "react", "breakdown", "critique"],
    weight1: ["listen", "rate", "opinion"],
  },
];
