/**
 * audit-topics — OPEN-1 data-gathering tool for Pulse classification v2.
 *
 * Pulls YouTube subscriptions + channel metadata for a given Pulse user and
 * writes a CSV of {channel_id, title, topic_slugs, keywords, subscriber_count,
 * has_topic_details}. Input to taxonomy validation (OPEN-2).
 *
 * Usage (against prod DB via Railway env):
 *   railway run -- npm run audit:topics -- --email you@example.com
 *   railway run -- npm run audit:topics -- --user-id <users.id>
 *
 * Output: audit-output/topics-<ISO timestamp>.csv
 */

import { writeFileSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { eq } from "drizzle-orm";
import { db } from "../src/lib/db";
import { users, authUsers } from "../src/lib/db/schema";
import {
  fetchSubscriptions,
  fetchChannelMetadata,
  getFreshAccessToken,
} from "../src/lib/youtube";
import { parseWikipediaSlug } from "../src/lib/classification/topic-map";

function parseArgs(argv: string[]): { email?: string; userId?: string } {
  const out: { email?: string; userId?: string } = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--email") out.email = argv[++i];
    else if (a === "--user-id") out.userId = argv[++i];
  }
  return out;
}

function csvEscape(value: string | number | boolean | null | undefined): string {
  if (value === null || value === undefined) return "";
  const s = String(value);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

async function main(): Promise<void> {
  const { email, userId } = parseArgs(process.argv.slice(2));
  if (!email && !userId) {
    console.error("Usage: npm run audit:topics -- --email <addr> | --user-id <id>");
    process.exit(2);
  }

  let targetUserId = userId;
  if (!targetUserId && email) {
    const authHit = await db
      .select({ id: authUsers.id })
      .from(authUsers)
      .where(eq(authUsers.email, email))
      .limit(1);
    targetUserId = authHit[0]?.id;
  }
  if (!targetUserId) {
    console.error(`No auth user row found for email ${email}.`);
    process.exit(1);
  }

  const [user] = await db.select().from(users).where(eq(users.id, targetUserId)).limit(1);
  if (!user) {
    console.error(`No Pulse users row for id ${targetUserId}. Sign in via the app first.`);
    process.exit(1);
  }
  if (!user.oauthAccessToken) {
    console.error(`User ${user.id} has no oauthAccessToken. Sign in via the app first.`);
    process.exit(1);
  }

  let accessToken = user.oauthAccessToken;
  if (user.oauthRefreshToken && user.oauthExpiresAt) {
    accessToken = await getFreshAccessToken(
      user.oauthAccessToken,
      user.oauthRefreshToken,
      user.oauthExpiresAt,
    );
  }

  console.log(`[audit] Fetching subscriptions for user ${user.id}...`);
  const subs = await fetchSubscriptions(accessToken);
  console.log(`[audit] ${subs.length} subscriptions.`);

  console.log(`[audit] Fetching channel metadata (topicDetails + brandingSettings)...`);
  const channelIds = subs.map((s) => s.channelId);
  const channels = await fetchChannelMetadata(accessToken, channelIds);
  console.log(`[audit] ${channels.length} channel records fetched.`);

  const outDir = resolve(process.cwd(), "audit-output");
  mkdirSync(outDir, { recursive: true });
  const ts = new Date().toISOString().replace(/[:.]/g, "-");
  const outPath = resolve(outDir, `topics-${ts}.csv`);

  const header = [
    "channel_id",
    "title",
    "topic_slugs",
    "keywords",
    "subscriber_count",
    "has_topic_details",
  ].join(",");

  const lines: string[] = [header];
  for (const ch of channels) {
    const slugs = (ch.topicCategories || []).map(parseWikipediaSlug).join("|");
    lines.push(
      [
        csvEscape(ch.id),
        csvEscape(ch.title),
        csvEscape(slugs),
        csvEscape(ch.keywords),
        csvEscape(ch.subscriberCount),
        csvEscape(ch.topicCategories && ch.topicCategories.length > 0),
      ].join(","),
    );
  }

  writeFileSync(outPath, lines.join("\n") + "\n", "utf8");
  console.log(`[audit] Wrote ${channels.length} rows → ${outPath}`);

  const withTopics = channels.filter((c) => c.topicCategories && c.topicCategories.length > 0).length;
  console.log(`[audit] topicCategories present on ${withTopics}/${channels.length} channels (${Math.round(100 * withTopics / Math.max(channels.length, 1))}%).`);

  process.exit(0);
}

main().catch((err) => {
  console.error("[audit] Fatal:", err);
  process.exit(1);
});
