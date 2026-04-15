import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatNumber(num: number): string {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + "M";
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + "K";
  }
  return num.toString();
}

export function formatDate(date: Date | string | null): string {
  if (!date) return "Never";
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function generateId(): string {
  return crypto.randomUUID();
}

export function encryptToken(token: string): string {
  // TODO: Implement AES-256-GCM encryption using TOKEN_ENCRYPTION_KEY
  // This is a placeholder - implement proper encryption in production
  return Buffer.from(token).toString("base64");
}

export function decryptToken(encrypted: string): string {
  // TODO: Implement AES-256-GCM decryption
  // This is a placeholder - implement proper decryption in production
  return Buffer.from(encrypted, "base64").toString();
}

export const DEFAULT_TAXONOMY = [
  {
    name: "Technology & Software",
    slug: "technology-software",
    children: [
      { name: "Programming & Dev", slug: "programming-dev" },
      { name: "AI & Machine Learning", slug: "ai-machine-learning" },
      { name: "Hardware & Gadgets", slug: "hardware-gadgets" },
      { name: "Cybersecurity", slug: "cybersecurity" },
      { name: "Tech News & Reviews", slug: "tech-news-reviews" },
    ],
  },
  {
    name: "Business & Finance",
    slug: "business-finance",
    children: [
      { name: "Investing & Markets", slug: "investing-markets" },
      { name: "Entrepreneurship", slug: "entrepreneurship" },
      { name: "Personal Finance", slug: "personal-finance" },
      { name: "Crypto & Web3", slug: "crypto-web3" },
      { name: "Economics & Policy", slug: "economics-policy" },
    ],
  },
  {
    name: "Creator Economy & Media",
    slug: "creator-economy-media",
    children: [
      { name: "Content Strategy & Growth", slug: "content-strategy-growth" },
      { name: "Podcasting", slug: "podcasting" },
      { name: "Newsletter & Writing", slug: "newsletter-writing" },
      { name: "Personal Brand & Audience Building", slug: "personal-brand-audience" },
    ],
  },
  {
    name: "Science & Education",
    slug: "science-education",
    children: [
      { name: "Science & Physics", slug: "science-physics" },
      { name: "Mathematics", slug: "mathematics" },
      { name: "History & Geopolitics", slug: "history-geopolitics" },
      { name: "Philosophy", slug: "philosophy" },
      { name: "Courses & Tutorials", slug: "courses-tutorials" },
    ],
  },
  {
    name: "Creative & Design",
    slug: "creative-design",
    children: [
      { name: "Film & Video Production", slug: "film-video-production" },
      { name: "Graphic Design & Art", slug: "graphic-design-art" },
      { name: "Music Production", slug: "music-production" },
      { name: "Photography", slug: "photography" },
      { name: "Writing & Storytelling", slug: "writing-storytelling" },
    ],
  },
  {
    name: "Lifestyle & Health",
    slug: "lifestyle-health",
    children: [
      { name: "Fitness & Nutrition", slug: "fitness-nutrition" },
      { name: "Mental Health & Productivity", slug: "mental-health-productivity" },
      { name: "Cooking & Food", slug: "cooking-food" },
      { name: "Travel & Vlogs", slug: "travel-vlogs" },
      { name: "Fashion & Beauty", slug: "fashion-beauty" },
    ],
  },
  {
    name: "Gaming",
    slug: "gaming",
    children: [
      { name: "Game Reviews & News", slug: "game-reviews-news" },
      { name: "Let's Plays & Streams", slug: "lets-plays-streams" },
      { name: "Esports", slug: "esports" },
      { name: "Game Development", slug: "game-development" },
    ],
  },
  {
    name: "Entertainment",
    slug: "entertainment",
    children: [
      { name: "Comedy & Sketches", slug: "comedy-sketches" },
      { name: "Podcasts & Commentary", slug: "podcasts-commentary" },
      { name: "Movies & TV Discussion", slug: "movies-tv-discussion" },
      { name: "Animation", slug: "animation" },
      { name: "Music & Music Videos", slug: "music-music-videos" },
    ],
  },
  {
    name: "News & Politics",
    slug: "news-politics",
    children: [
      { name: "Current Events", slug: "current-events" },
      { name: "Political Commentary", slug: "political-commentary" },
      { name: "Investigative Journalism", slug: "investigative-journalism" },
      { name: "Cultural Commentary", slug: "cultural-commentary" },
    ],
  },
  {
    name: "Sports",
    slug: "sports",
    children: [
      { name: "Traditional Sports", slug: "traditional-sports" },
      { name: "Combat Sports", slug: "combat-sports" },
      { name: "Motorsport", slug: "motorsport" },
      { name: "Sports Analysis", slug: "sports-analysis" },
    ],
  },
  {
    name: "Uncategorized",
    slug: "uncategorized",
    children: [],
  },
];
