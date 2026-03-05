import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

type GoldenExample = {
  id: string;
  question: string;
  expectedAnswer: string;
  expectedKeywords: string[];
  expectedSourceUrl: string;
  minCitations: number;
};

type ChatApiResponse = {
  answer: string;
  citations: Array<{ sourceUrl: string }>;
  metrics: {
    estimatedCostUsd: number;
  };
};

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '../../../../');
const goldenPath = path.resolve(repoRoot, 'eval', 'golden_set.jsonl');
const reportsDir = path.resolve(repoRoot, 'eval', 'reports');
const apiBaseUrl = process.env.EVAL_API_URL ?? 'http://localhost:4000';
const apiToken = process.env.EVAL_API_TOKEN ?? '';
const limit = Number(process.env.EVAL_LIMIT ?? 50);

const normalize = (value: string): string =>
  value
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const tokenize = (value: string): string[] => normalize(value).split(' ').filter(Boolean);

const f1Score = (prediction: string, expected: string): number => {
  const pTokens = tokenize(prediction);
  const eTokens = tokenize(expected);
  if (pTokens.length === 0 || eTokens.length === 0) {
    return 0;
  }
  const eSet = new Map<string, number>();
  for (const token of eTokens) {
    eSet.set(token, (eSet.get(token) ?? 0) + 1);
  }
  let overlap = 0;
  for (const token of pTokens) {
    const remaining = eSet.get(token) ?? 0;
    if (remaining > 0) {
      overlap += 1;
      eSet.set(token, remaining - 1);
    }
  }
  const precision = overlap / pTokens.length;
  const recall = overlap / eTokens.length;
  if (precision + recall === 0) {
    return 0;
  }
  return (2 * precision * recall) / (precision + recall);
};

const exactMatch = (prediction: string, expected: string): number =>
  normalize(prediction) === normalize(expected) ? 1 : 0;

const groundednessProxy = (
  answer: string,
  citations: Array<{ sourceUrl: string }>,
  expectedKeywords: string[],
  minCitations: number,
): number => {
  const normalizedAnswer = normalize(answer);
  const coveredClaims = expectedKeywords.every((keyword) => normalizedAnswer.includes(normalize(keyword)));
  if (!coveredClaims) {
    return 0;
  }
  return citations.length >= minCitations ? 1 : 0;
};

const loadGoldenSet = async (): Promise<GoldenExample[]> => {
  const raw = await fs.readFile(goldenPath, 'utf-8');
  return raw
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => JSON.parse(line) as GoldenExample);
};

const run = async (): Promise<void> => {
  const examples = (await loadGoldenSet()).slice(0, limit);

  let emTotal = 0;
  let f1Total = 0;
  let groundedTotal = 0;
  let citationCoverage = 0;
  let totalCostUsd = 0;
  const failures: string[] = [];

  for (const example of examples) {
    const response = await fetch(`${apiBaseUrl}/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: apiToken ? `Bearer ${apiToken}` : '',
        'x-user-id': 'eval-runner',
        'x-user-role': 'support',
      },
      body: JSON.stringify({
        message: example.question,
      }),
    });

    if (!response.ok) {
      failures.push(`${example.id}: API status ${response.status}`);
      continue;
    }

    const payload = (await response.json()) as ChatApiResponse;
    const em = exactMatch(payload.answer, example.expectedAnswer);
    const f1 = f1Score(payload.answer, example.expectedAnswer);
    const grounded = groundednessProxy(
      payload.answer,
      payload.citations,
      example.expectedKeywords,
      example.minCitations,
    );
    const citesSource = payload.citations.some((citation) => citation.sourceUrl === example.expectedSourceUrl);

    emTotal += em;
    f1Total += f1;
    groundedTotal += grounded;
    citationCoverage += citesSource ? 1 : 0;
    totalCostUsd += payload.metrics.estimatedCostUsd ?? 0;
  }

  const count = Math.max(1, examples.length);
  const report = `# Eval Report\n\n` +
    `- Date: ${new Date().toISOString()}\n` +
    `- Questions: ${examples.length}\n` +
    `- API: ${apiBaseUrl}\n` +
    `- Exact Match: ${(emTotal / count).toFixed(3)}\n` +
    `- F1 Baseline: ${(f1Total / count).toFixed(3)}\n` +
    `- Groundedness Proxy: ${(groundedTotal / count).toFixed(3)}\n` +
    `- Expected Source Hit Rate: ${(citationCoverage / count).toFixed(3)}\n` +
    `- Estimated Cost USD: ${totalCostUsd.toFixed(4)}\n\n` +
    `## Failures\n` +
    `${failures.length ? failures.map((failure) => `- ${failure}`).join('\n') : '- None'}\n`;

  await fs.mkdir(reportsDir, { recursive: true });
  const filename = `report-${new Date().toISOString().replace(/[:.]/g, '-')}.md`;
  const outputPath = path.resolve(reportsDir, filename);
  await fs.writeFile(outputPath, report, 'utf-8');
  process.stdout.write(`Report generated: ${outputPath}\n`);
};

run().catch((error) => {
  process.stderr.write(`Eval failed: ${error instanceof Error ? error.message : String(error)}\n`);
  process.exit(1);
});

