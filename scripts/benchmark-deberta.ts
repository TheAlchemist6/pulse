/**
 * benchmark-deberta — OPEN-3 viability probe.
 *
 * Loads MoritzLaurer/deberta-v3-large-zeroshot-v2.0 via @huggingface/transformers
 * (bundles onnxruntime-node on Node) and runs zero-shot classification against
 * 10 synthetic "canonical signal strings" representing common YouTube channels.
 *
 * Outputs a markdown report with per-channel inference time, total time,
 * peak RSS memory delta, model files summary, and PASS/FAIL vs. 500ms/channel.
 *
 * Usage: npm run benchmark:deberta
 */

import { writeFileSync, mkdirSync, statSync, readdirSync } from "node:fs";
import { resolve, join } from "node:path";

type ZeroShotResult = {
  sequence: string;
  labels: string[];
  scores: number[];
};

const CANDIDATE_GROUPS = [
  "Tech & Software",
  "Business & Finance",
  "Creator Economy",
  "Education & Science",
  "Entertainment",
  "Gaming",
  "Music",
  "News & Politics",
  "Lifestyle & Health",
  "Sports",
] as const;

const TEST_SIGNALS: { name: string; signal: string; expectedGroup: string }[] = [
  {
    name: "Andrej Karpathy",
    signal:
      "Andrej Karpathy. I like to think about AI. Previously Director of AI at Tesla, Research Scientist at OpenAI. Keywords: AI machine learning deep learning neural networks. Topics: Artificial_intelligence, Computer_science.",
    expectedGroup: "Tech & Software",
  },
  {
    name: "Binging with Babish",
    signal:
      "Binging with Babish. Welcome to Binging with Babish. I'm Andrew, and I make food from movies and TV shows. Keywords: cooking recipe food chef. Topics: Food, Cooking.",
    expectedGroup: "Lifestyle & Health",
  },
  {
    name: "Coin Bureau",
    signal:
      "Coin Bureau. The leading source of information for cryptocurrency. Bitcoin, Ethereum, altcoins and blockchain analysis. Keywords: crypto bitcoin ethereum defi. Topics: Cryptocurrency, Finance.",
    expectedGroup: "Business & Finance",
  },
  {
    name: "Athlean-X",
    signal:
      "ATHLEAN-X. Physical therapist and strength coach Jeff Cavaliere breaks down workouts. Keywords: fitness workout gym bodybuilding nutrition. Topics: Physical_fitness, Health.",
    expectedGroup: "Lifestyle & Health",
  },
  {
    name: "Kyle Kulinski",
    signal:
      "Secular Talk with Kyle Kulinski. Political commentary from a progressive perspective. Daily news analysis and political opinion. Keywords: politics news progressive analysis. Topics: Politics, Society.",
    expectedGroup: "News & Politics",
  },
  {
    name: "Asmongold",
    signal:
      "Asmongold TV. Variety streamer playing the biggest releases and reacting to gaming drama. World of Warcraft, Elden Ring, and more. Keywords: gaming streaming mmorpg reactions. Topics: Video_game, Video_game_culture.",
    expectedGroup: "Gaming",
  },
  {
    name: "Anthony Fantano",
    signal:
      "theneedledrop. Music reviews by Anthony Fantano, the internet's busiest music nerd. Hip hop, rock, electronic, indie. Keywords: music review hip hop rock album. Topics: Music, Pop_music.",
    expectedGroup: "Music",
  },
  {
    name: "Ryan George",
    signal:
      "Ryan George. Comedy sketches including Pitch Meeting. Writer and comedian. Keywords: comedy sketch humor pitch meeting. Topics: Entertainment, Humour.",
    expectedGroup: "Entertainment",
  },
  {
    name: "The Plain Bagel",
    signal:
      "The Plain Bagel. Richard Coffin explains investing and personal finance. CFA charterholder breaking down markets. Keywords: investing stocks personal finance markets. Topics: Finance, Investment.",
    expectedGroup: "Business & Finance",
  },
  {
    name: "Veritasium",
    signal:
      "Veritasium. An element of truth - videos about science, education, and anything else I find interesting. Keywords: science physics education experiments. Topics: Science, Knowledge.",
    expectedGroup: "Education & Science",
  },
];

const HYPOTHESIS_TEMPLATE = "This YouTube channel is about {}.";
const DTYPE = "fp32" as const;

function dirSize(path: string): { files: number; bytes: number } {
  let files = 0;
  let bytes = 0;
  try {
    const walk = (p: string): void => {
      const entries = readdirSync(p, { withFileTypes: true });
      for (const e of entries) {
        const full = join(p, e.name);
        if (e.isDirectory()) walk(full);
        else if (e.isFile()) {
          files++;
          bytes += statSync(full).size;
        }
      }
    };
    walk(path);
  } catch {
    // Directory missing — leave totals at 0
  }
  return { files, bytes };
}

function fmtBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KiB`;
  if (n < 1024 * 1024 * 1024) return `${(n / 1024 / 1024).toFixed(1)} MiB`;
  return `${(n / 1024 / 1024 / 1024).toFixed(2)} GiB`;
}

async function main(): Promise<void> {
  console.log("[bench] Loading @huggingface/transformers pipeline...");
  const { pipeline, env } = await import("@huggingface/transformers");
  const cacheDir = resolve(process.cwd(), ".cache/hf");
  mkdirSync(cacheDir, { recursive: true });
  env.cacheDir = cacheDir;

  const model = "MoritzLaurer/deberta-v3-large-zeroshot-v2.0";

  const rssBeforeLoad = process.memoryUsage().rss;
  const t0 = Date.now();
  const classifier = await pipeline("zero-shot-classification", model, {
    dtype: DTYPE,
  });
  const loadMs = Date.now() - t0;
  const rssAfterLoad = process.memoryUsage().rss;
  console.log(`[bench] Model loaded in ${loadMs}ms. RSS delta: ${fmtBytes(rssAfterLoad - rssBeforeLoad)}`);

  const modelCacheSize = dirSize(cacheDir);
  console.log(`[bench] Cache: ${modelCacheSize.files} files, ${fmtBytes(modelCacheSize.bytes)}`);

  const perChannel: { name: string; expected: string; predicted: string; topScore: number; ms: number; correct: boolean }[] = [];
  let peakRssDelta = rssAfterLoad - rssBeforeLoad;

  for (const t of TEST_SIGNALS) {
    const start = Date.now();
    const result = (await classifier(t.signal, [...CANDIDATE_GROUPS], {
      multi_label: true,
      hypothesis_template: HYPOTHESIS_TEMPLATE,
    })) as ZeroShotResult;
    const ms = Date.now() - start;
    const predicted = result.labels[0];
    const topScore = result.scores[0];
    perChannel.push({
      name: t.name,
      expected: t.expectedGroup,
      predicted,
      topScore,
      ms,
      correct: predicted === t.expectedGroup,
    });
    const rssNow = process.memoryUsage().rss;
    if (rssNow - rssBeforeLoad > peakRssDelta) peakRssDelta = rssNow - rssBeforeLoad;
    console.log(
      `[bench] ${t.name.padEnd(24)} → ${predicted.padEnd(22)} (${topScore.toFixed(3)}) ${ms}ms ${predicted === t.expectedGroup ? "✓" : "✗ expected " + t.expectedGroup}`,
    );
  }

  const avgMs = perChannel.reduce((s, p) => s + p.ms, 0) / perChannel.length;
  const correctCount = perChannel.filter((p) => p.correct).length;
  const threshold = 500;
  const pass = avgMs <= threshold;

  const reportsDir = resolve(process.cwd(), "reports");
  mkdirSync(reportsDir, { recursive: true });
  const ts = new Date().toISOString().replace(/[:.]/g, "-");
  const reportPath = resolve(reportsDir, `deberta-benchmark-${ts}.md`);

  const lines = [
    `# DeBERTa-v3 Zero-Shot Benchmark`,
    ``,
    `- **Model:** ${model}`,
    `- **Runtime:** @huggingface/transformers (Node, onnxruntime-node)`,
    `- **Quantization:** ${DTYPE}`,
    `- **Host:** ${process.platform} ${process.arch}, Node ${process.version}`,
    `- **Date:** ${new Date().toISOString()}`,
    ``,
    `## Summary`,
    ``,
    `| Metric | Value |`,
    `| --- | --- |`,
    `| Channels benchmarked | ${perChannel.length} |`,
    `| Avg inference time per channel | ${avgMs.toFixed(1)} ms |`,
    `| Threshold (spec §4, Layer 4) | ${threshold} ms |`,
    `| Result vs. threshold | **${pass ? "PASS" : "FAIL"}** |`,
    `| Model load time | ${loadMs} ms |`,
    `| Cache size | ${fmtBytes(modelCacheSize.bytes)} (${modelCacheSize.files} files) |`,
    `| RSS delta after load | ${fmtBytes(rssAfterLoad - rssBeforeLoad)} |`,
    `| Peak RSS delta | ${fmtBytes(peakRssDelta)} |`,
    `| Group correct (top-1) | ${correctCount}/${perChannel.length} |`,
    ``,
    `## Per-channel`,
    ``,
    `| Channel | Expected group | Predicted group | Score | Time (ms) | Correct |`,
    `| --- | --- | --- | --- | --- | --- |`,
    ...perChannel.map(
      (p) => `| ${p.name} | ${p.expected} | ${p.predicted} | ${p.topScore.toFixed(3)} | ${p.ms} | ${p.correct ? "✓" : "✗"} |`,
    ),
    ``,
    `## Railway implications`,
    ``,
    `- **Model weights on disk:** ${fmtBytes(modelCacheSize.bytes)}. Must be fetched at container startup OR shipped alongside the image.`,
    `- **Memory at runtime:** Peak RSS delta ${fmtBytes(peakRssDelta)} above baseline. Compare to Railway plan memory cap before provisioning.`,
    `- **Inference hot path:** ${avgMs.toFixed(0)}ms/channel × N channels async — 600 channels => ${Math.round((avgMs * 600) / 1000)}s async work. Acceptable for Section 5 timing budget (niches fill in after group paint).`,
    ``,
    pass
      ? `**Conclusion:** Layer 4/5 architecture is viable on CPU with current quantization settings.`
      : `**Conclusion:** Inference exceeds spec threshold. Possible Plan B: smaller DeBERTa (base), distilled model, or hosted inference endpoint.`,
    ``,
  ];
  writeFileSync(reportPath, lines.join("\n"), "utf8");
  console.log(`\n[bench] Report: ${reportPath}`);
  console.log(`[bench] Result: ${pass ? "PASS" : "FAIL"} — avg ${avgMs.toFixed(1)}ms/channel vs ${threshold}ms threshold`);
  process.exit(pass ? 0 : 1);
}

main().catch((err) => {
  console.error("[bench] Fatal:", err);
  process.exit(2);
});
