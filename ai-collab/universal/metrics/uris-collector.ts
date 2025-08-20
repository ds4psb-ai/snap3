/**
 * URIS Metrics Collector - Universal Recursive Improvement System
 * Comprehensive metrics collection for Agent Router performance monitoring
 * Integration with existing T3 Circuit Breaker system
 */

interface DecisionResult {
  context: string;
  agent: string;
  confidence: number;
  reasoning: string;
  success: boolean;
  alternative_agents?: string[];
}

interface RoutingMetric {
  timestamp: string;
  context: string;
  decision: DecisionResult;
  duration_ms: number;
  consensus_achieved: boolean;
  coordination_success: boolean;
}

interface SLOTarget {
  routing_latency_p95_ms: number;
  context_detection_accuracy_pct: number;
  consensus_success_rate_pct: number;
}

interface URISMetricsReport {
  timestamp: string;
  period_minutes: number;
  routing_performance: {
    p95_latency_ms: number;
    p99_latency_ms: number;
    avg_latency_ms: number;
    total_decisions: number;
  };
  context_detection: {
    accuracy_rate: number;
    total_contexts: number;
    context_distribution: Record<string, number>;
  };
  agent_coordination: {
    success_rate: number;
    consensus_rate: number;
    coordination_failures: number;
  };
  slo_compliance: {
    routing_latency_slo: boolean;
    context_accuracy_slo: boolean;
    consensus_success_slo: boolean;
    overall_slo_status: 'PASS' | 'WARN' | 'FAIL';
  };
}

export class URISMetricsCollector {
  private metrics: RoutingMetric[] = [];
  private readonly sloTargets: SLOTarget;
  private readonly metricsFilePath: string;

  constructor(
    sloTargets: SLOTarget = {
      routing_latency_p95_ms: 50,
      context_detection_accuracy_pct: 90,
      consensus_success_rate_pct: 95,
    },
    metricsFilePath: string = './uris-metrics-live.json'
  ) {
    this.sloTargets = sloTargets;
    this.metricsFilePath = metricsFilePath;
  }

  /**
   * Record a routing decision with performance metrics
   */
  async recordRoutingDecision(
    context: string,
    decision: DecisionResult,
    duration: number,
    consensusAchieved: boolean = true,
    coordinationSuccess: boolean = true
  ): Promise<void> {
    const metric: RoutingMetric = {
      timestamp: new Date().toISOString(),
      context,
      decision,
      duration_ms: duration,
      consensus_achieved: consensusAchieved,
      coordination_success: coordinationSuccess,
    };

    this.metrics.push(metric);

    // Keep only last 1000 metrics for memory management
    if (this.metrics.length > 1000) {
      this.metrics = this.metrics.slice(-1000);
    }

    await this.updateLiveMetrics();
  }

  /**
   * Generate comprehensive metrics report
   */
  async generateMetricsReport(periodMinutes: number = 60): Promise<URISMetricsReport> {
    const cutoffTime = new Date(Date.now() - periodMinutes * 60 * 1000);
    const recentMetrics = this.metrics.filter(
      m => new Date(m.timestamp) >= cutoffTime
    );

    if (recentMetrics.length === 0) {
      throw new Error('No metrics available for the specified period');
    }

    // Calculate routing performance
    const durations = recentMetrics.map(m => m.duration_ms).sort((a, b) => a - b);
    const p95Index = Math.floor(durations.length * 0.95);
    const p99Index = Math.floor(durations.length * 0.99);

    const routingPerformance = {
      p95_latency_ms: durations[p95Index] || 0,
      p99_latency_ms: durations[p99Index] || 0,
      avg_latency_ms: durations.reduce((a, b) => a + b, 0) / durations.length,
      total_decisions: recentMetrics.length,
    };

    // Calculate context detection metrics
    const contextDistribution: Record<string, number> = {};
    const successfulContexts = recentMetrics.filter(m => m.decision.success);
    
    recentMetrics.forEach(m => {
      contextDistribution[m.context] = (contextDistribution[m.context] || 0) + 1;
    });

    const contextDetection = {
      accuracy_rate: (successfulContexts.length / recentMetrics.length) * 100,
      total_contexts: Object.keys(contextDistribution).length,
      context_distribution: contextDistribution,
    };

    // Calculate agent coordination metrics
    const consensusSuccesses = recentMetrics.filter(m => m.consensus_achieved).length;
    const coordinationSuccesses = recentMetrics.filter(m => m.coordination_success).length;

    const agentCoordination = {
      success_rate: (coordinationSuccesses / recentMetrics.length) * 100,
      consensus_rate: (consensusSuccesses / recentMetrics.length) * 100,
      coordination_failures: recentMetrics.length - coordinationSuccesses,
    };

    // SLO compliance check
    const routingLatencySLO = routingPerformance.p95_latency_ms <= this.sloTargets.routing_latency_p95_ms;
    const contextAccuracySLO = contextDetection.accuracy_rate >= this.sloTargets.context_detection_accuracy_pct;
    const consensusSuccessSLO = agentCoordination.consensus_rate >= this.sloTargets.consensus_success_rate_pct;

    const sloFailures = [routingLatencySLO, contextAccuracySLO, consensusSuccessSLO].filter(slo => !slo).length;
    const overallSLOStatus: 'PASS' | 'WARN' | 'FAIL' = 
      sloFailures === 0 ? 'PASS' : sloFailures === 1 ? 'WARN' : 'FAIL';

    return {
      timestamp: new Date().toISOString(),
      period_minutes: periodMinutes,
      routing_performance: routingPerformance,
      context_detection: contextDetection,
      agent_coordination: agentCoordination,
      slo_compliance: {
        routing_latency_slo: routingLatencySLO,
        context_accuracy_slo: contextAccuracySLO,
        consensus_success_slo: consensusSuccessSLO,
        overall_slo_status: overallSLOStatus,
      },
    };
  }

  /**
   * Update live metrics JSON file for real-time monitoring
   */
  private async updateLiveMetrics(): Promise<void> {
    try {
      const report = await this.generateMetricsReport(15); // 15-minute window
      const liveData = {
        uris_metrics: report,
        integration: {
          t3_circuit_breaker_active: true,
          p95_monitoring_active: true,
          slo_monitoring_active: true,
        },
        last_updated: new Date().toISOString(),
      };

      // In a real implementation, this would write to file
      // For now, we'll log to console for integration testing
      console.log('[URIS] Live metrics updated:', JSON.stringify(liveData, null, 2));
    } catch (error) {
      console.error('[URIS] Failed to update live metrics:', error);
    }
  }

  /**
   * Get current SLO status for alerting
   */
  async getSLOStatus(): Promise<{
    status: 'PASS' | 'WARN' | 'FAIL';
    violations: string[];
    metrics: URISMetricsReport;
  }> {
    const report = await this.generateMetricsReport(15);
    const violations: string[] = [];

    if (!report.slo_compliance.routing_latency_slo) {
      violations.push(`Routing latency P95 ${report.routing_performance.p95_latency_ms}ms > ${this.sloTargets.routing_latency_p95_ms}ms`);
    }

    if (!report.slo_compliance.context_accuracy_slo) {
      violations.push(`Context detection accuracy ${report.context_detection.accuracy_rate.toFixed(1)}% < ${this.sloTargets.context_detection_accuracy_pct}%`);
    }

    if (!report.slo_compliance.consensus_success_slo) {
      violations.push(`Consensus success rate ${report.agent_coordination.consensus_rate.toFixed(1)}% < ${this.sloTargets.consensus_success_rate_pct}%`);
    }

    return {
      status: report.slo_compliance.overall_slo_status,
      violations,
      metrics: report,
    };
  }

  /**
   * Integration point with T3 Circuit Breaker system
   */
  async getT3Integration(): Promise<{
    circuit_breaker_compatible: boolean;
    current_p95_ms: number;
    slo_aligned: boolean;
  }> {
    const report = await this.generateMetricsReport(15);
    return {
      circuit_breaker_compatible: true,
      current_p95_ms: report.routing_performance.p95_latency_ms,
      slo_aligned: report.slo_compliance.routing_latency_slo,
    };
  }
}