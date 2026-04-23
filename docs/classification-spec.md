# Pulse — Tier 1 Channel Classification Algorithm Specification

**Version:** 1.0
**Date:** April 22, 2026
**Status:** Ready for Implementation
**Scope:** Tier 1 MVP — YouTube Subscription Organization
**Authority:** This document is the canonical source for classification work. Any prior spec pack content that conflicts with this is superseded.

---

## 1. Goal Statement

**What we are building:**
An algorithm that places every subscribed YouTube channel into a stable, browsable two-level hierarchy (Group → Niche) with high enough precision that users trust the organization on first view.

**What we are not building:**
A general-purpose YouTube content classifier. A video classifier. A per-channel content reader. A dynamically discovered taxonomy. An AI that learns per-user.

**The principle:**
Precision over recall. It is better to leave a channel in a broad group than to force a wrong niche assignment. "I don't know" is always better than "I'm wrong."

---

## 2. Classification Object

We are classifying a **YouTube channel** — not a video, not a playlist, not a piece of content.

A channel is a content identity: a creator's persistent thematic focus expressed over time. Classification should reflect what the channel consistently covers, not any single video.

### Input Signal Bundle (per channel)

Collected at import time from YouTube Data API v3. Zero additional API calls beyond what's needed for the channel list.

| Signal | API Field | Trust Level | Notes |
|---|---|---|---|
| Channel title | `snippet.title` | Medium | Often descriptive, sometimes a personal name |
| Channel description | `snippet.description` | High | Up to 1000 chars. Creator's own words. |
| Creator keywords | `brandingSettings.channel.keywords` | High | Self-declared. Often the best signal. |
| YouTube topic categories | `topicDetails.topicCategories` | Very High when present | Wikipedia URLs. Sparse — ~40% of channels have them. |
| Topic IDs | `topicDetails.topicIds` | High when present | Freebase IDs. Often missing. |
| Subscriber count | `statistics.subscriberCount` | Low | Context only. Not a category signal. |
| Video count | `statistics.videoCount` | Low | Context only. |
| Channel creation date | `snippet.publishedAt` | Low | Tenure signal only. |
| Country | `snippet.country` | Low | Regional context only. |

**Not used at classification time:** Video transcripts, video thumbnails, comment data, watch history, liked videos. These are Tier 2+ signals.

**Fallback signal (low-confidence channels only):** Last 5 video titles from `playlistItems.list` on the uploads playlist. Only fetched when metadata confidence is below threshold. Adds ~1 quota unit per ambiguous channel.

### Canonical Signal String

Before classification, normalize all text signals into one string per channel:

```
[title]. [description]. Keywords: [keywords]. Topics: [topic slugs joined by comma].
```

Example:

```
Andrej Karpathy. I like to think about AI. Previously Director of AI at Tesla,
Research Scientist at OpenAI. Keywords: AI machine learning deep learning neural
networks. Topics: Artificial_intelligence, Computer_science.
```

Truncate to 512 characters maximum. This is the input to every classification layer.

---

## 3. Taxonomy — V1

### Design Principles

1. **Fixed schema** — defined once, same for all users. Not discovered per-user.
2. **Product-driven** — groups match how Pulse's target users think about their subscriptions.
3. **Browsable** — 10 groups visible on dashboard. 5-8 niches visible when clicking into a group.
4. **Stable** — a channel placed in a niche today should still be in that niche in 6 months.
5. **Sourced from evidence** — every group and niche must be validated against real channel examples before shipping.

### What Makes a Good Niche

A niche must describe a **recurring creator identity or audience promise**, not a one-off topic.

- ✅ Good: "AI & Machine Learning" — describes what the channel consistently covers
- ✅ Good: "Personal Finance" — describes who the audience is and what they expect
- ❌ Bad: "React Hooks Tutorials" — too narrow, a topic not an identity
- ❌ Bad: "Viral Videos" — format, not identity

### The V1 Taxonomy Tree

> **NOTE:** Niche structure below is a starting hypothesis. Must be validated against real YouTube `topicDetails` output before locking. See Section 6: Taxonomy Validation Protocol.

```
GROUP 1 — Tech & Software
  Definition: Channels covering technology, software development, hardware,
              and the digital tools that power modern work and life.

  Niches:
    AI & Machine Learning        → AI concepts, research, tools, applications
    Programming & Dev            → Coding tutorials, languages, frameworks, OSS
    Cybersecurity                → Security research, hacking, privacy, infosec
    Consumer Tech & Gadgets      → Reviews, hardware, phones, peripherals
    Tech News & Reviews          → Industry news, product launches, commentary
    No-Code & Productivity       → Tools, workflows, automation, SaaS products

GROUP 2 — Business & Finance
  Definition: Channels covering entrepreneurship, investing, personal money
              management, and economic analysis.

  Niches:
    Entrepreneurship & Startups  → Founding, building, scaling companies
    Investing & Markets          → Stocks, ETFs, market analysis, trading
    Personal Finance             → Budgeting, debt, savings, financial independence
    Crypto & Web3                → Cryptocurrency, blockchain, DeFi
    Economics & Macro            → Policy, macroeconomics, global markets
    Real Estate                  → Property investing, REITs, real estate strategy

GROUP 3 — Creator Economy
  Definition: Channels about building an audience, creating content
              professionally, and the business of being a creator.

  Niches:
    Content Strategy & Growth    → YouTube strategy, audience building, algorithms
    Personal Brand & Influence   → Building online presence, personal branding
    Podcasting & Long-form       → Podcast strategy, long-form content creation
    Newsletters & Writing        → Email, Substack, writing for audiences
    Freelance & Solopreneurship  → Independent work, consulting, service business

GROUP 4 — Education & Science
  Definition: Channels primarily focused on teaching, explaining, or
              advancing understanding across academic disciplines.

  Niches:
    Physics & Mathematics        → Hard sciences, math, engineering concepts
    Biology & Medicine           → Life sciences, health science, medicine
    History & Geopolitics        → Historical events, political geography, diplomacy
    Philosophy & Psychology      → Ideas, thinking frameworks, human behavior
    Language Learning            → Learning languages, linguistics, communication
    How-To & Tutorials           → Practical skills teaching (non-tech)

GROUP 5 — Entertainment
  Definition: Channels primarily designed to entertain through storytelling,
              humor, drama, or commentary on popular culture.

  Niches:
    Comedy & Sketches            → Stand-up, sketch comedy, funny content
    Movies & TV Discussion       → Film/TV analysis, reviews, theories
    True Crime & Mystery         → Crime stories, unsolved cases, investigations
    Animation & Art              → Animated content, visual art, illustration
    Drama & Commentary           → Reaction, drama, hot takes, commentary culture
    Lifestyle & Vlog             → Personal vlogs, daily life, casual content

GROUP 6 — Gaming
  Definition: Channels covering video games — playing, reviewing,
              discussing, or developing them.

  Niches:
    Game Reviews & News          → Reviews, previews, gaming journalism
    Let's Plays & Streams        → Playthroughs, streaming content, gameplay
    Esports & Competitive        → Pro gaming, tournaments, competitive meta
    Game Development             → Making games, indie dev, game design
    Retro & Nostalgia            → Classic games, gaming history, preservation

GROUP 7 — Music
  Definition: Channels centered on music — making it, discussing it,
              performing it, or analyzing it.

  Niches:
    Hip Hop & Rap                → Hip hop culture, artists, rap music
    Pop & Chart Music            → Mainstream pop, chart analysis, pop culture
    Rock & Alternative           → Rock, metal, alternative, indie
    Electronic & Production      → EDM, beat-making, music production, synthesis
    Music Theory & Education     → Learning music, theory, instrument tutorials
    Music Commentary & Reviews   → Music criticism, analysis, industry discussion

GROUP 8 — News & Politics
  Definition: Channels covering current events, political analysis,
              journalism, and public affairs.

  Niches:
    Current Events & Journalism  → Breaking news, reporting, journalism
    Political Commentary         → Opinion, analysis of political events
    International Affairs        → Foreign policy, global news, geopolitics
    Cultural Commentary          → Society, culture, trends, discourse
    Investigative & Documentary  → Long-form investigations, documentary-style

GROUP 9 — Lifestyle & Health
  Definition: Channels covering how people live — their health, habits,
              hobbies, and personal environment.

  Niches:
    Fitness & Nutrition          → Workouts, diet, athletic performance
    Mental Health & Mindfulness  → Psychology, therapy, wellness, meditation
    Cooking & Food               → Recipes, culinary culture, food reviews
    Travel & Adventure           → Travel vlogs, destination guides, adventure
    Fashion & Beauty             → Style, makeup, skincare, clothing
    Home, DIY & Crafts           → Home improvement, crafting, making things
    Relationships & Self         → Dating, relationships, personal development

GROUP 10 — Sports
  Definition: Channels covering athletic competition — playing,
              watching, analyzing, or discussing sports.

  Niches:
    Football (NFL & Soccer)      → American football, soccer/football
    Basketball                   → NBA, WNBA, college basketball
    Combat Sports & MMA          → Boxing, MMA, wrestling, martial arts
    Motorsport                   → F1, NASCAR, rally, motorcycle racing
    Extreme Sports               → Skateboarding, surfing, BMX, climbing
    Sports Analysis              → Stats, tactics, commentary, predictions
```

**Total: 10 groups, 58 niches**

---

## 4. Classification Algorithm — Five-Layer Cascade

### Architecture Principle

No single classifier solves this problem. A cascade of five layers, each handling what the previous couldn't, produces maximum accuracy with minimum cost.

Each layer outputs one of two results:
- **RESOLVED** → assign group + niche + confidence, stop
- **UNRESOLVED** → pass to next layer

### Layer 1 — YouTube Topic Mapping
*Instant, $0, handles ~40-60% of channels*

YouTube's `topicDetails.topicCategories` returns Wikipedia article URLs. These are the most reliable signal when present because they are curated by YouTube's own classification system.

```javascript
// Parse Wikipedia slug from URL
// "https://en.wikipedia.org/wiki/Artificial_intelligence" → "Artificial_intelligence"

const TOPIC_TO_TAXONOMY = {
  // HIGH CONFIDENCE MAPPINGS (weight: 5)
  "Artificial_intelligence":   { group: "Tech & Software",      niche: "AI & Machine Learning" },
  "Machine_learning":          { group: "Tech & Software",      niche: "AI & Machine Learning" },
  "Software":                  { group: "Tech & Software",      niche: "Programming & Dev" },
  "Computer_programming":      { group: "Tech & Software",      niche: "Programming & Dev" },
  "Computer_security":         { group: "Tech & Software",      niche: "Cybersecurity" },
  "Technology":                { group: "Tech & Software",      niche: null },  // group only

  "Entrepreneurship":          { group: "Business & Finance",   niche: "Entrepreneurship & Startups" },
  "Finance":                   { group: "Business & Finance",   niche: "Investing & Markets" },
  "Investment":                { group: "Business & Finance",   niche: "Investing & Markets" },
  "Cryptocurrency":            { group: "Business & Finance",   niche: "Crypto & Web3" },
  "Economics":                 { group: "Business & Finance",   niche: "Economics & Macro" },
  "Business":                  { group: "Business & Finance",   niche: null },  // group only

  "Knowledge":                 { group: "Education & Science",  niche: null },  // group only
  "Science":                   { group: "Education & Science",  niche: "Physics & Mathematics" },
  "Mathematics":               { group: "Education & Science",  niche: "Physics & Mathematics" },
  "History":                   { group: "Education & Science",  niche: "History & Geopolitics" },
  "Philosophy":                { group: "Education & Science",  niche: "Philosophy & Psychology" },

  "Video_game":                { group: "Gaming",               niche: "Let's Plays & Streams" },
  "Video_game_culture":        { group: "Gaming",               niche: "Game Reviews & News" },
  "Esports":                   { group: "Gaming",               niche: "Esports & Competitive" },

  "Music":                     { group: "Music",                niche: null },  // group only
  "Hip_hop_music":             { group: "Music",                niche: "Hip Hop & Rap" },
  "Rock_music":                { group: "Music",                niche: "Rock & Alternative" },
  "Electronic_music":          { group: "Music",                niche: "Electronic & Production" },
  "Pop_music":                 { group: "Music",                niche: "Pop & Chart Music" },

  "Entertainment":             { group: "Entertainment",        niche: null },  // group only
  "Humour":                    { group: "Entertainment",        niche: "Comedy & Sketches" },
  "Film":                      { group: "Entertainment",        niche: "Movies & TV Discussion" },
  "Animation":                 { group: "Entertainment",        niche: "Animation & Art" },

  "Sport":                     { group: "Sports",               niche: null },  // group only
  "American_football":         { group: "Sports",               niche: "Football (NFL & Soccer)" },
  "Association_football":      { group: "Sports",               niche: "Football (NFL & Soccer)" },
  "Basketball":                { group: "Sports",               niche: "Basketball" },
  "Mixed_martial_arts":        { group: "Sports",               niche: "Combat Sports & MMA" },
  "Motorsport":                { group: "Sports",               niche: "Motorsport" },

  "Health":                    { group: "Lifestyle & Health",   niche: "Fitness & Nutrition" },
  "Physical_fitness":          { group: "Lifestyle & Health",   niche: "Fitness & Nutrition" },
  "Food":                      { group: "Lifestyle & Health",   niche: "Cooking & Food" },
  "Fashion":                   { group: "Lifestyle & Health",   niche: "Fashion & Beauty" },
  "Travel":                    { group: "Lifestyle & Health",   niche: "Travel & Adventure" },
  "Lifestyle":                 { group: "Lifestyle & Health",   niche: null },  // group only

  "Politics":                  { group: "News & Politics",      niche: "Political Commentary" },
  "Society":                   { group: "News & Politics",      niche: "Cultural Commentary" },
}

// Algorithm:
// 1. Parse all topic slugs from topicCategories URLs
// 2. Map each slug to group + niche
// 3. If majority of topics agree on a group → RESOLVED
//    confidence = 5 if niche also matches, 4 if group only
// 4. If topics conflict → pass to Layer 2 with topic scores as seed
// 5. If no topics → pass to Layer 2
```

**Output:** `{ group, niche, confidence: 4-5, source: "topic_map" }` or UNRESOLVED

### Layer 2 — Keyword Lexicon Scoring
*Fast, $0, handles ~25-30% of remaining channels*

Weighted keyword matching against the canonical signal string. Produces a score distribution across all groups and niches.

```javascript
const NICHE_LEXICONS = {
  "AI & Machine Learning": {
    group: "Tech & Software",
    keywords: {
      weight5: ["machine learning", "deep learning", "neural network", "llm",
                "artificial intelligence", "transformer model", "diffusion model",
                "openai", "anthropic", "gemini", "hugging face"],
      weight3: ["ai", "ml", "nlp", "computer vision", "reinforcement learning",
                "fine-tuning", "embeddings", "rag", "vector database"],
      weight1: ["model", "algorithm", "training", "inference", "dataset"]
    }
  },
  "Programming & Dev": {
    group: "Tech & Software",
    keywords: {
      weight5: ["javascript", "python", "typescript", "react", "rust", "golang",
                "software engineer", "web developer", "backend", "frontend",
                "full stack", "open source", "github"],
      weight3: ["coding", "programming", "developer", "api", "database", "devops",
                "kubernetes", "docker", "aws", "system design"],
      weight1: ["code", "build", "deploy", "debug", "tutorial"]
    }
  },
  "Entrepreneurship & Startups": {
    group: "Business & Finance",
    keywords: {
      weight5: ["startup", "founder", "build in public", "saas", "bootstrapped",
                "solopreneur", "indie hacker", "product launch", "mrr", "arr"],
      weight3: ["entrepreneur", "venture capital", "pitch deck", "business model",
                "product market fit", "growth hacking", "b2b", "b2c"],
      weight1: ["business", "company", "scale", "revenue", "customers"]
    }
  },
  "Investing & Markets": {
    group: "Business & Finance",
    keywords: {
      weight5: ["stock market", "investing", "portfolio", "dividend", "etf",
                "options trading", "value investing", "warren buffett",
                "hedge fund", "valuation", "earnings"],
      weight3: ["stocks", "equity", "bonds", "index fund", "401k", "ira",
                "financial markets", "bull market", "bear market"],
      weight1: ["invest", "returns", "money", "wealth", "financial"]
    }
  },
  "Personal Finance": {
    group: "Business & Finance",
    keywords: {
      weight5: ["personal finance", "budgeting", "debt free", "financial independence",
                "fire movement", "frugal", "emergency fund", "net worth"],
      weight3: ["saving money", "budget", "credit score", "mortgage", "student loans",
                "side hustle", "passive income"],
      weight1: ["money", "save", "spend", "debt", "income"]
    }
  },
  "Crypto & Web3": {
    group: "Business & Finance",
    keywords: {
      weight5: ["bitcoin", "ethereum", "crypto", "defi", "nft", "blockchain",
                "web3", "altcoin", "cryptocurrency", "solana"],
      weight3: ["token", "wallet", "decentralized", "protocol", "smart contract",
                "dao", "yield farming", "staking"],
      weight1: ["coin", "chain", "crypto market"]
    }
  },
  "Content Strategy & Growth": {
    group: "Creator Economy",
    keywords: {
      weight5: ["youtube growth", "algorithm", "content creator", "youtube strategy",
                "grow your channel", "monetization", "adsense", "sponsorship"],
      weight3: ["content strategy", "audience building", "personal brand",
                "social media", "engagement", "subscribers", "views"],
      weight1: ["content", "creator", "channel", "audience"]
    }
  },
  "True Crime & Mystery": {
    group: "Entertainment",
    keywords: {
      weight5: ["true crime", "serial killer", "unsolved", "cold case", "murder mystery",
                "criminal investigation", "detective", "forensics"],
      weight3: ["crime", "case", "suspect", "victim", "evidence", "trial"],
      weight1: ["mystery", "investigation", "criminal"]
    }
  },
  "Fitness & Nutrition": {
    group: "Lifestyle & Health",
    keywords: {
      weight5: ["workout", "fitness", "gym", "bodybuilding", "calisthenics",
                "nutrition", "diet", "weight loss", "muscle gain", "crossfit"],
      weight3: ["exercise", "training", "protein", "calories", "cardio",
                "strength", "health", "wellness"],
      weight1: ["body", "fat", "muscle", "healthy"]
    }
  },
  "Cooking & Food": {
    group: "Lifestyle & Health",
    keywords: {
      weight5: ["recipe", "cooking", "chef", "baking", "cuisine", "restaurant",
                "meal prep", "vegan", "food review", "kitchen"],
      weight3: ["food", "ingredients", "dish", "eat", "taste"],
      weight1: ["cook", "meal", "dinner", "lunch"]
    }
  }
  // ... full lexicon for all 58 niches
}

// Algorithm:
// 1. Lowercase canonical signal string
// 2. For each niche lexicon, compute weighted match score
// 3. Normalize scores across all niches
// 4. Top niche score > RESOLVE_THRESHOLD (0.65):
//    → RESOLVED, confidence based on score magnitude
// 5. Top niche score between SEED_THRESHOLD (0.35) and RESOLVE_THRESHOLD:
//    → Pass top 3 candidate groups + scores to Layer 3
// 6. Score below SEED_THRESHOLD:
//    → Pass to Layer 3 with no seeds
```

**Output:** `{ group, niche, confidence: 3-4, source: "keyword" }` or `{ candidates: top3groups }` + UNRESOLVED

### Layer 3 — Embedding Retrieval (Candidate Pruning)
*~$0.002 per full import, narrows input for DeBERTa*

This layer is **retrieval**, not classification. Its job is to reduce what DeBERTa evaluates from 10 groups → 3 candidates, cutting cost and improving accuracy.

```javascript
// Pre-compute once at server startup:
// Embed each of the 10 group descriptions + all 58 niche descriptions
// Store as fixed vectors

// At classification time:
// 1. Embed canonical signal string via Voyage lite
// 2. Cosine similarity against all 10 group embeddings
// 3. Return top 3 groups by similarity score
// 4. Pass candidates to Layer 4

// Key constraint:
// Voyage already in stack for Pulse terminal
// Batch all ambiguous channels together (1 API call for N channels)
// Cost: ~$0.002 for 300 channels total
```

**Output:** `{ candidates: [group1, group2, group3] }` for Layer 4

### Layer 4 — DeBERTa-v3 Zero-Shot (Group Level)
*Accurate, CPU-local via ONNX Runtime, handles ambiguous channels*

- **Model:** `MoritzLaurer/deberta-v3-large-zeroshot-v2.0`
- **Deployment:** ONNX Runtime in Node.js (no Python server)
- **Input:** Canonical signal string + top 3 candidate groups from Layer 3

```javascript
// Classification reframed as Natural Language Inference
// For each candidate group, construct hypothesis:
// "This YouTube channel is about [group description]."

// Example:
// Signal: "Andrej Karpathy. I like to think about AI..."
// Hypothesis A: "This YouTube channel is about technology and software."
// Hypothesis B: "This YouTube channel is about education and science."
// → Model scores entailment probability for each hypothesis
// → Winner = highest entailment score

// Multi-label: set multi_label=true
// If second group score > 0.4 → flag as multi-group channel

// Hierarchical constraint:
// Confidence of group assignment = entailment score
// This becomes the ceiling for niche confidence in Layer 5

const result = await classifier(
  signalBundle,
  candidateGroups.map(g => HYPOTHESIS_TEMPLATE(g)),
  { multi_label: true }
)

// Map entailment scores to confidence:
// score ≥ 0.85 → confidence 5
// score ≥ 0.70 → confidence 4
// score ≥ 0.55 → confidence 3
// score ≥ 0.40 → confidence 2
// score < 0.40 → confidence 1 (low, route to Uncategorized)
```

**Output:** `{ group, groupScore, secondGroup, confidence: 2-5, source: "deberta_group" }`

### Layer 5 — DeBERTa-v3 Zero-Shot (Niche Level)
*Same model, second pass, within winning group only*

```javascript
// ONLY evaluate niches within the group assigned in Layer 4
// Tech & Software → evaluate its 6 niches only
// Reduces label confusion dramatically

// Hierarchical score propagation:
// niche.finalScore = niche.entailmentScore × group.entailmentScore
// This ensures a niche cannot outrank an incompatible parent

// Multi-niche: if secondNiche.finalScore > 0.35 → flag multi-niche

// If all niche scores below 0.40:
// → Assign to group only, niche = null
// → Displayed as "[Group] — General" in UI

const niches = TAXONOMY[group].niches
const nicheResult = await classifier(
  signalBundle,
  niches.map(n => NICHE_HYPOTHESIS_TEMPLATE(n)),
  { multi_label: true }
)

const finalNicheScore = nicheResult.topScore * groupScore
```

**Output:** `{ group, niche, finalScore, secondNiche, confidence: 1-5, source: "deberta_niche" }`

### Layer 6 — Fallback: Video Title Sampling
*Only for confidence < 2 channels*

```javascript
// Fetch last 5 video titles from uploads playlist
// playlistItems.list?playlistId=UU{channelId}&maxResults=5
// Append titles to canonical signal string
// Re-run Layer 2 (keyword scoring) only — not DeBERTa again
// If still unresolved → Uncategorized with confidence 1

// Cost: 1 quota unit per ambiguous channel
// Expected volume: ~5-10% of channels need this fallback
```

**Output:** `{ group, niche, confidence: 1-2 }` or UNCATEGORIZED

### Community Override Learning (Persistent Layer)

After any user manually moves a channel to a different group or niche:

```javascript
// 1. Log to override_log: { channel_id, from_group, from_niche, to_group, to_niche }
// 2. Update channel_metadata.override_count += 1
// 3. Recompute override_consensus per channel
// 4. THRESHOLD: override_count >= 5 AND consensus >= 0.70
//    → Set community_category = consensus winner
//    → Future imports: skip all 5 layers, use community_category
//    → Confidence = 5 (community verified)
// 5. User override always respected: user_overridden = true, never re-classified
```

This layer improves accuracy over time. Channels popular across users get permanently verified.

---

## 5. Pipeline Timing Architecture

```
SYNCHRONOUS (blocks import progress bar):
  Layer 1 (topic map):     <1 second   for all channels
  Layer 2 (keywords):      <2 seconds  for all channels
  Layer 3 (embeddings):    3-5 seconds batch all channels
  ─────────────────────────────────────────────────────
  Dashboard renders with GROUP-level classification
  User can see category grid and start exploring

ASYNCHRONOUS (runs after dashboard renders):
  Layer 4 (DeBERTa group): 15-25 seconds for ambiguous channels
  Layer 5 (DeBERTa niche): 20-30 seconds for all channels
  ─────────────────────────────────────────────────────
  Niches progressively appear inside each group
  UI shows subtle "Refining..." indicator, updates as niches resolve

PERSISTENT (background, no user-visible timing):
  Layer 6 (fallback):      only for confidence < 2 channels
  Community learning:      logs on every user override
```

**User experience:**
- Sees category grid in ~8 seconds
- Sees niches fully loaded in ~45 seconds
- Never blocked waiting for perfect classification

---

## 6. Taxonomy Validation Protocol

Before shipping, the taxonomy must be validated against real data.

### Step 1 — Pull YouTube's topicDetails at Scale

Before finalizing niche definitions, pull `channels.list` for ~500 real channels across all expected groups. Examine what `topicDetails.topicCategories` returns for each.

> Purpose: Ensure our taxonomy is aligned with what YouTube's own system already classifies channels as. Do not define niches that YouTube's topic system never produces signals for.

### Step 2 — Build the Golden Dataset

Manually label 150 real YouTube channels:

```
Per channel record:
  channel_url:              string
  channel_name:             string
  correct_group:            string  (human assigned)
  correct_niche:            string  (human assigned)
  is_multi_topic:           boolean
  second_group:             string | null
  second_niche:             string | null
  difficulty:               easy | medium | hard
  difficulty_reason:        string (why it's hard if applicable)
  metadata_quality:         rich | sparse | misleading
  notes:                    string
```

**Composition of 150 channels:**
- 10-15 channels per group (balanced)
- 30% should be "easy" (clear metadata, obvious category)
- 40% should be "medium" (some ambiguity)
- 30% should be "hard" (vague description, personal brand, multi-topic)
- 10-15 channels with no `topicCategories` (tests fallback layers)
- 5-10 non-English channels

### Step 3 — Run Algorithm, Measure Against Golden Dataset

For each of the 6 success metrics:

```javascript
// Run full 5-layer cascade against all 150 channels
// Compare output vs human labels
// Calculate metrics per Section 7
```

### Step 4 — Adjust Taxonomy If Needed

Common failure patterns that require taxonomy fixes:

- 5 channels consistently "don't fit anywhere" → add a missing niche
- One niche consistently misclassifies into another → rename/redefine niche labels
- One niche receives <5 channels across the 150-channel dataset → merge it up

---

## 7. Success Metrics

### The 6 Testable Outcomes

| # | Metric | Target | Failing |
|---|---|---|---|
| 1 | Group Precision | ≥90% correct group | <80% |
| 2 | Niche Precision | ≥75% correct niche (given correct group) | <65% |
| 3 | Uncategorized Rate | ≤15% of channels | >25% |
| 4 | Multi-Topic Precision | ≥70% of flags confirmed by human | <60% |
| 5 | User Correction Rate | ≤20% channels moved in first session | >30% |
| 6 | Time to Group Render | ≤8 seconds | >15 seconds |

### Metric Definitions

**Metric 1 — Group Precision:**
```
= (channels assigned to correct group) / (total channels)

Test: Run algorithm on 150-channel golden dataset
      Compare output group vs human-labeled group
      Channels in Uncategorized counted as incorrect for this metric
```

**Metric 2 — Niche Precision:**
```
= (channels assigned to correct niche) / (channels with correct group)
Only evaluates channels where group was correct
Channels with niche=null counted as incorrect
```

**Metric 3 — Uncategorized Rate:**
```
= (channels with confidence < threshold or niche=null) / (total channels)
Target: system should confidently place ≥85% of channels
```

**Metric 4 — Multi-Topic Precision:**
```
= (multi-topic flags confirmed by human) / (total multi-topic flags)
Tests whether the secondGroup/secondNiche signal is meaningful
```

**Metric 5 — User Correction Rate:**

This is the **north star metric** — everything else serves this one.

```
= (channels moved via drag or "Move to" action in session 1) / (total channels)
Tracked via override_log in production
Cannot be measured pre-launch; establish baseline at 50-user milestone
```

**Metric 6 — Time to Group Render:**
```
= Time from import complete to dashboard category grid fully rendered
Measure Layers 1-3 combined execution time
Test against 100-channel, 300-channel, 600-channel import sizes
```

---

## 8. Database Schema (Classification Fields)

Fields on `user_subscriptions` relevant to classification:

```sql
primary_group         TEXT     -- Level 1 group name
primary_niche         TEXT     -- Level 2 niche name (nullable)
secondary_group       TEXT     -- Second group if multi-topic (nullable)
secondary_niche       TEXT     -- Second niche if multi-topic (nullable)
is_multi_topic        BOOLEAN  DEFAULT FALSE
ai_confidence         INTEGER  -- 1-5 scale
classification_source TEXT     -- topic_map | keyword | embedding | deberta | community | user
user_overridden       BOOLEAN  DEFAULT FALSE
override_from_group   TEXT     -- what it was before user moved it
override_to_group     TEXT     -- what user moved it to
override_from_niche   TEXT
override_to_niche     TEXT
```

Fields on `channel_metadata` (shared cache, community learning):

```sql
community_group       TEXT     -- consensus group from override_log (nullable)
community_niche       TEXT     -- consensus niche from override_log (nullable)
override_count        INTEGER  DEFAULT 0
override_consensus    FLOAT    -- 0.0-1.0, fraction of overrides agreeing
```

---

## 9. Open Items Before Implementation

The following must be resolved before writing code:

### OPEN-1: YouTube topicDetails Audit (BLOCKING)
Pull `channels.list` for 200-300 real channels.
Catalog exactly what `topicDetails.topicCategories` returns.
Map observed Wikipedia slugs to proposed taxonomy.
Identify gaps where YouTube provides no signal.

- **Estimated effort:** 2-3 hours
- **Owner:** Alchemist6

### OPEN-2: Taxonomy Validation Against Real Subscriptions (BLOCKING)
Export own subscription list.
Manually assign each channel to proposed taxonomy.
Identify niches that need splitting, merging, or renaming.

- **Estimated effort:** 2-3 hours
- **Owner:** Alchemist6

### OPEN-3: DeBERTa ONNX Export and Node.js Test (BLOCKING)
Export `MoritzLaurer/deberta-v3-large-zeroshot-v2.0` to ONNX format.
Test inference via `onnxruntime-node` in Next.js API route.
Measure actual CPU inference time per channel.
Confirm model size and Railway memory constraints.

- **Estimated effort:** 4-6 hours
- **Owner:** Echo

### OPEN-4: Hypothesis Template Design (NON-BLOCKING)
Design the NLI hypothesis strings for each group and niche.
Test multiple phrasings to determine which produces best entailment scores.
Example: "This YouTube channel covers AI and machine learning topics." vs "This is an AI and machine learning channel."

- **Estimated effort:** 2-3 hours
- **Owner:** Alchemist6 + Echo

### OPEN-5: Confidence Threshold Calibration (NON-BLOCKING)
After ONNX model is running, run against 50 test channels.
Calibrate the entailment score thresholds that map to confidence 1-5.
These thresholds are model-specific and cannot be determined theoretically.

- **Estimated effort:** 2-3 hours
- **Owner:** Echo

---

## 10. Implementation Order for Echo

```
Phase A — Foundations (do first):
  1. Resolve OPEN-1: pull topicDetails from 200+ real channels
  2. Resolve OPEN-2: validate taxonomy against real subscriptions
  3. Lock taxonomy: finalize all group/niche names and definitions

Phase B — Layers 1 and 2 (fast, no ML):
  4. Build TOPIC_TO_TAXONOMY lookup table from Phase A findings
  5. Build NICHE_LEXICONS for all 58 niches
  6. Implement Layer 1 (topic mapping)
  7. Implement Layer 2 (keyword scoring)
  8. Test Layers 1+2 against golden dataset → achieve ≥75% group precision

Phase C — Layer 3 (embeddings):
  9. Integrate Voyage embedding API
  10. Pre-compute taxonomy embeddings, store as fixtures
  11. Implement Layer 3 (candidate pruning)
  12. Test combined Layers 1-3 → achieve ≥80% group precision

Phase D — Layers 4 and 5 (DeBERTa):
  13. Resolve OPEN-3: ONNX export + Node.js integration
  14. Resolve OPEN-4: hypothesis template design
  15. Implement Layer 4 (DeBERTa group)
  16. Implement Layer 5 (DeBERTa niche)
  17. Resolve OPEN-5: threshold calibration
  18. Test full cascade → achieve all 6 metrics in acceptable range

Phase E — Pipeline Integration:
  19. Wire all 5 layers into the import pipeline
  20. Implement async rendering (groups first, niches later)
  21. Implement Layer 6 (video title fallback)
  22. Implement community override logging
  23. Performance test: 100 / 300 / 600 channel imports

Phase F — Golden Dataset Validation:
  24. Build 150-channel golden dataset
  25. Run full algorithm against golden dataset
  26. Measure all 6 metrics
  27. Adjust taxonomy labels if any metric fails
  28. Ship when all metrics pass
```

---

## 11. What This Spec Does NOT Cover

The following are explicitly out of scope for this specification:

- Watch history analysis (Tier 2)
- Consumption rate calculation (Tier 2)
- Video transcript processing (Tier 4-5)
- Per-user taxonomy customization (post-MVP)
- Non-English channel classification optimization (post-MVP)
- Real-time re-classification (post-MVP)
- Fine-tuning DeBERTa on Pulse-specific data (post-MVP, once golden dataset is large enough)

---

*Specification produced for Pulse product development.*
*Companion documents: `pulse-tier-specifications.md`, `pulse-research-findings.md`*
