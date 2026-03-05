type RequestSample = {
  latencyMs: number;
  endpoint: string;
  statusCode: number;
  estimatedCostUsd: number;
  citationsCount: number;
};

type CounterMap = Record<string, number>;

export class MetricsStore {
  private readonly samples: RequestSample[] = [];
  private readonly maxSamples = 5000;
  private readonly endpointUsage: CounterMap = {};
  private readonly endpointErrors: CounterMap = {};
  private totalCostUsd = 0;
  private chatWithTwoOrMoreCitations = 0;
  private chatResponses = 0;

  record(sample: RequestSample): void {
    this.samples.push(sample);
    if (this.samples.length > this.maxSamples) {
      this.samples.shift();
    }

    this.endpointUsage[sample.endpoint] = (this.endpointUsage[sample.endpoint] ?? 0) + 1;
    if (sample.statusCode >= 400) {
      this.endpointErrors[sample.endpoint] = (this.endpointErrors[sample.endpoint] ?? 0) + 1;
    }

    this.totalCostUsd += sample.estimatedCostUsd;

    if (sample.endpoint === '/chat' && sample.statusCode < 500) {
      this.chatResponses += 1;
      if (sample.citationsCount >= 2) {
        this.chatWithTwoOrMoreCitations += 1;
      }
    }
  }

  snapshot() {
    const sortedLatencies = [...this.samples].map((s) => s.latencyMs).sort((a, b) => a - b);
    const percentile = (p: number): number => {
      if (sortedLatencies.length === 0) {
        return 0;
      }
      const index = Math.min(sortedLatencies.length - 1, Math.ceil((p / 100) * sortedLatencies.length) - 1);
      return sortedLatencies[index] ?? 0;
    };

    return {
      p50LatencyMs: percentile(50),
      p95LatencyMs: percentile(95),
      errorsByEndpoint: this.endpointErrors,
      usageByEndpoint: this.endpointUsage,
      totalCostUsd: Number(this.totalCostUsd.toFixed(6)),
      citationCoveragePct:
        this.chatResponses === 0
          ? 0
          : Number(((this.chatWithTwoOrMoreCitations / this.chatResponses) * 100).toFixed(2)),
      responsesWith2OrMoreCitations: this.chatWithTwoOrMoreCitations,
      chatResponses: this.chatResponses,
      totalRequests: this.samples.length,
    };
  }

  toPrometheus(): string {
    const snap = this.snapshot();
    const lines: string[] = [
      '# HELP copiloto_latency_p50_ms Request latency p50 in milliseconds',
      '# TYPE copiloto_latency_p50_ms gauge',
      `copiloto_latency_p50_ms ${snap.p50LatencyMs}`,
      '# HELP copiloto_latency_p95_ms Request latency p95 in milliseconds',
      '# TYPE copiloto_latency_p95_ms gauge',
      `copiloto_latency_p95_ms ${snap.p95LatencyMs}`,
      '# HELP copiloto_cost_total_usd Total estimated LLM cost in USD',
      '# TYPE copiloto_cost_total_usd counter',
      `copiloto_cost_total_usd ${snap.totalCostUsd}`,
      '# HELP copiloto_citation_coverage_pct Chat responses with >=2 citations percent',
      '# TYPE copiloto_citation_coverage_pct gauge',
      `copiloto_citation_coverage_pct ${snap.citationCoveragePct}`,
    ];

    for (const [endpoint, value] of Object.entries(snap.usageByEndpoint)) {
      lines.push(
        '# HELP copiloto_endpoint_usage_total Requests grouped by endpoint',
        '# TYPE copiloto_endpoint_usage_total counter',
        `copiloto_endpoint_usage_total{endpoint="${endpoint}"} ${value}`,
      );
    }

    for (const [endpoint, value] of Object.entries(snap.errorsByEndpoint)) {
      lines.push(
        '# HELP copiloto_endpoint_errors_total Errors grouped by endpoint',
        '# TYPE copiloto_endpoint_errors_total counter',
        `copiloto_endpoint_errors_total{endpoint="${endpoint}"} ${value}`,
      );
    }

    return lines.join('\n');
  }
}

export const metricsStore = new MetricsStore();

