/**
 * validate-classifier — run the Tier 1 cascade against the OPEN-1 audit CSV
 * and measure: group assignment rate, niche assignment rate, uncategorized
 * rate, group distribution, and sanity-check outcomes for named channels.
 *
 * Usage: tsx scripts/validate-classifier.ts <path-to-csv>
 * If no path given, defaults to ./audit-output/latest or the EchoDrop outbox.
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { classifyChannel, type ClassificationResult } from "../src/lib/classification/classifier";
import { GROUPS } from "../src/lib/classification/taxonomy";

interface CsvRow {
  channel_id: string;
  title: string;
  topic_slugs: string;
  keywords: string;
  subscriber_count: string;
  has_topic_details: string;
}

function parseCsvRow(line: string): string[] {
  const cells: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (inQuotes) {
      if (c === '"') {
        if (line[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        cur += c;
      }
    } else {
      if (c === '"') inQuotes = true;
      else if (c === ",") {
        cells.push(cur);
        cur = "";
      } else cur += c;
    }
  }
  cells.push(cur);
  return cells;
}

function readCsv(path: string): CsvRow[] {
  const text = readFileSync(path, "utf8");
  const lines = text.split(/\r?\n/).filter(Boolean);
  const header = parseCsvRow(lines[0]);
  const rows: CsvRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cells = parseCsvRow(lines[i]);
    const obj: Record<string, string> = {};
    for (let j = 0; j < header.length; j++) obj[header[j]] = cells[j] ?? "";
    rows.push(obj as unknown as CsvRow);
  }
  return rows;
}

function pickCsv(): string {
  const arg = process.argv[2];
  if (arg && existsSync(arg)) return arg;

  const candidates = [
    "/mnt/c/Users/Edwin/EchoDrop/outbox/topics-2026-04-22T21-52-03-113Z.csv",
    "./audit-output/latest.csv",
  ];
  for (const c of candidates) if (existsSync(c)) return c;
  throw new Error("No audit CSV found. Pass a path as first arg.");
}

function classifyRow(row: CsvRow): ClassificationResult {
  const slugs = row.topic_slugs ? row.topic_slugs.split("|").map((s) => s.trim()).filter(Boolean) : [];
  return classifyChannel({
    channelId: row.channel_id,
    title: row.title,
    description: "",
    keywords: row.keywords,
    topicSlugs: slugs,
  });
}

interface Metrics {
  total: number;
  withGroup: number;
  withNiche: number;
  uncategorized: number;
  bySource: Record<string, number>;
  byGroup: Record<string, number>;
  byNichePerGroup: Record<string, Record<string, number>>;
}

function computeMetrics(rows: CsvRow[]): { metrics: Metrics; perRow: { row: CsvRow; result: ClassificationResult }[] } {
  const metrics: Metrics = {
    total: rows.length,
    withGroup: 0,
    withNiche: 0,
    uncategorized: 0,
    bySource: {},
    byGroup: {},
    byNichePerGroup: {},
  };
  const perRow: { row: CsvRow; result: ClassificationResult }[] = [];
  for (const row of rows) {
    const result = classifyRow(row);
    perRow.push({ row, result });

    if (result.primaryGroup) {
      metrics.withGroup++;
      metrics.byGroup[result.primaryGroup] = (metrics.byGroup[result.primaryGroup] || 0) + 1;
    }
    if (result.primaryNiche) {
      metrics.withNiche++;
      metrics.byNichePerGroup[result.primaryGroup!] ??= {};
      metrics.byNichePerGroup[result.primaryGroup!][result.primaryNiche] =
        (metrics.byNichePerGroup[result.primaryGroup!][result.primaryNiche] || 0) + 1;
    }
    if (result.classificationSource === "uncategorized") metrics.uncategorized++;

    metrics.bySource[result.classificationSource] =
      (metrics.bySource[result.classificationSource] || 0) + 1;
  }
  return { metrics, perRow };
}

const SANITY_CHECKS: { title: string; expectedGroup: string; expectedNotGroup?: string }[] = [
  { title: "NetworkChuck", expectedGroup: "Tech & Software" },
  { title: "Fireship", expectedGroup: "Tech & Software" },
  { title: "MrBeast", expectedGroup: "Entertainment" },
  { title: "Greg Isenberg", expectedGroup: "", expectedNotGroup: "Education & Science" },
];

function formatReport(path: string, metrics: Metrics, perRow: { row: CsvRow; result: ClassificationResult }[]): string {
  const pct = (n: number, total: number) => `${((n / Math.max(total, 1)) * 100).toFixed(1)}%`;
  const groupPass = metrics.withGroup / metrics.total >= 0.95;
  const nichePass = metrics.withNiche / metrics.total >= 0.85;
  const uncategorizedPass = metrics.uncategorized / metrics.total <= 0.15;

  const lines: string[] = [];
  lines.push(`# Tier 1 Classifier Validation`);
  lines.push("");
  lines.push(`- **CSV:** ${path}`);
  lines.push(`- **Classifier:** Two-layer cascade (topic map → keyword lexicon)`);
  lines.push(`- **Date:** ${new Date().toISOString()}`);
  lines.push("");
  lines.push(`## Headline metrics`);
  lines.push("");
  lines.push(`| Metric | Value | Target | Result |`);
  lines.push(`| --- | --- | --- | --- |`);
  lines.push(
    `| Channels | ${metrics.total} | — | — |`,
    `| Group assignment rate | ${pct(metrics.withGroup, metrics.total)} | ≥95% | ${groupPass ? "**PASS**" : "**FAIL**"} |`,
    `| Niche assignment rate | ${pct(metrics.withNiche, metrics.total)} | ≥85% | ${nichePass ? "**PASS**" : "**FAIL**"} |`,
    `| Uncategorized rate | ${pct(metrics.uncategorized, metrics.total)} | ≤15% | ${uncategorizedPass ? "**PASS**" : "**FAIL**"} |`,
  );
  lines.push("");
  lines.push(`## Classification source breakdown`);
  lines.push("");
  lines.push(`| Source | Channels | % |`);
  lines.push(`| --- | --- | --- |`);
  const sources = Object.entries(metrics.bySource).sort((a, b) => b[1] - a[1]);
  for (const [src, n] of sources) {
    lines.push(`| ${src} | ${n} | ${pct(n, metrics.total)} |`);
  }
  lines.push("");
  lines.push(`## Group distribution`);
  lines.push("");
  lines.push(`| Group | Channels | % |`);
  lines.push(`| --- | --- | --- |`);
  const groupEntries = GROUPS.map((g) => [g, metrics.byGroup[g] ?? 0] as const).sort(
    (a, b) => b[1] - a[1],
  );
  for (const [g, n] of groupEntries) {
    lines.push(`| ${g} | ${n} | ${pct(n, metrics.total)} |`);
  }
  lines.push("");
  lines.push(`## Named sanity checks`);
  lines.push("");
  lines.push(`| Channel | Expected | Actual group | Actual niche | Pass |`);
  lines.push(`| --- | --- | --- | --- | --- |`);
  for (const check of SANITY_CHECKS) {
    const hit = perRow.find((p) => p.row.title === check.title);
    if (!hit) {
      lines.push(`| ${check.title} | ${check.expectedGroup || `not ${check.expectedNotGroup}`} | *(not in CSV)* | — | — |`);
      continue;
    }
    const actualGroup = hit.result.primaryGroup ?? "Uncategorized";
    const actualNiche = hit.result.primaryNiche ?? "—";
    const pass = check.expectedNotGroup
      ? actualGroup !== check.expectedNotGroup
      : actualGroup === check.expectedGroup;
    lines.push(
      `| ${check.title} | ${check.expectedGroup || `NOT ${check.expectedNotGroup}`} | ${actualGroup} | ${actualNiche} | ${pass ? "✓" : "✗"} |`,
    );
  }
  lines.push("");
  lines.push(`## Uncategorized channels (first 20)`);
  lines.push("");
  const uncat = perRow.filter((p) => p.result.classificationSource === "uncategorized");
  if (uncat.length === 0) {
    lines.push("*None.*");
  } else {
    lines.push(`| Channel | Topic slugs | Keywords (truncated) |`);
    lines.push(`| --- | --- | --- |`);
    for (const p of uncat.slice(0, 20)) {
      const kw = p.row.keywords.replace(/\|/g, " ").replace(/\n/g, " ").slice(0, 60);
      lines.push(`| ${p.row.title} | ${p.row.topic_slugs || "*(none)*"} | ${kw || "*(none)*"} |`);
    }
    if (uncat.length > 20) lines.push(`\n*…and ${uncat.length - 20} more.*`);
  }
  lines.push("");

  const allPass = groupPass && nichePass && uncategorizedPass;
  lines.push(`**Overall:** ${allPass ? "PASS" : "FAIL"} — ${
    allPass
      ? "Layers 1+2 meet all three assignment targets."
      : "One or more metrics below target. Adjust lexicon weights or extend TOPIC_TO_TAXONOMY."
  }`);
  lines.push("");

  return lines.join("\n");
}

function main(): void {
  const csvPath = pickCsv();
  console.log(`[validate] CSV: ${csvPath}`);
  const rows = readCsv(csvPath);
  console.log(`[validate] ${rows.length} rows loaded`);

  const { metrics, perRow } = computeMetrics(rows);
  console.log(`[validate] group: ${metrics.withGroup}/${metrics.total}`);
  console.log(`[validate] niche: ${metrics.withNiche}/${metrics.total}`);
  console.log(`[validate] uncategorized: ${metrics.uncategorized}/${metrics.total}`);

  const reportsDir = resolve(process.cwd(), "reports");
  mkdirSync(reportsDir, { recursive: true });
  const ts = new Date().toISOString().replace(/[:.]/g, "-");
  const reportPath = resolve(reportsDir, `classifier-validation-${ts}.md`);
  writeFileSync(reportPath, formatReport(csvPath, metrics, perRow), "utf8");
  console.log(`[validate] report: ${reportPath}`);
}

main();
