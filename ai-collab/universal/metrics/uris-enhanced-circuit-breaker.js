/**
 * URIS Enhanced Circuit Breaker System
 * Extends existing T3 circuit breaker with URIS-specific metrics integration
 * Maintains compatibility with current T3 monitoring infrastructure
 */

const fs = require('fs').promises;
const path = require('path');

class URISEnhancedCircuitBreaker {
  constructor(config = {}) {
    // Inherit from existing T3 circuit breaker configuration
    this.t3Config = {
      failureThreshold: config.failureThreshold || 3,
      successThreshold: config.successThreshold || 2,
      timeout: config.timeout || 60000,
      resetTimeout: config.resetTimeout || 60000,
    };

    // URIS-specific configuration
    this.urisConfig = {
      routingLatencyThreshold: config.routingLatencyThreshold || 50, // 50ms P95 target
      contextAccuracyThreshold: config.contextAccuracyThreshold || 90, // 90% accuracy
      consensusSuccessThreshold: config.consensusSuccessThreshold || 95, // 95% success rate
      metricsWindowMinutes: config.metricsWindowMinutes || 15,
    };

    // State management
    this.state = 'CLOSED';
    this.failureCount = 0;
    this.successCount = 0;
    this.lastFailureTime = null;
    this.metrics = [];
    this.urisMetrics = [];
    
    // SLO monitoring
    this.sloViolations = [];
    this.lastSLOCheck = Date.now();

    // File paths for integration
    this.liveMetricsPath = '../../../services/t2-extract/t3-circuit-breaker-live.json';
    this.urisLiveMetricsPath = './uris-metrics-live.json';
    
    console.log('[URIS-CB] Enhanced Circuit Breaker initialized with T3 integration');
  }

  /**
   * Execute operation with URIS metrics integration
   */
  async execute(operation, context = 'default') {
    const startTime = Date.now();
    
    try {
      if (this.state === 'OPEN') {
        if (Date.now() - this.lastFailureTime < this.t3Config.resetTimeout) {
          throw new Error('Circuit breaker is OPEN - operation rejected');
        }
        this.state = 'HALF_OPEN';
      }

      const result = await this.executeWithTimeout(operation);
      const duration = Date.now() - startTime;

      // Record URIS-specific metrics
      await this.recordURISMetric(context, {
        success: true,
        duration,
        confidence: result.confidence || 0.8,
        agent: result.agent || 'default',
        reasoning: result.reasoning || 'success',
      });

      this.onSuccess();
      return result;

    } catch (error) {
      const duration = Date.now() - startTime;
      
      // Record URIS failure metric
      await this.recordURISMetric(context, {
        success: false,
        duration,
        error: error.message,
        confidence: 0,
        agent: 'failed',
        reasoning: `Error: ${error.message}`,
      });

      this.onFailure();
      throw error;
    }
  }

  /**
   * Record URIS-specific metrics for Agent Router performance
   */
  async recordURISMetric(context, decision) {
    const metric = {
      timestamp: new Date().toISOString(),
      context,
      decision,
      duration_ms: decision.duration,
      consensus_achieved: decision.success,
      coordination_success: decision.success,
      routing_decision: {
        agent: decision.agent,
        confidence: decision.confidence,
        reasoning: decision.reasoning,
      },
    };

    this.urisMetrics.push(metric);

    // Keep only last 1000 metrics
    if (this.urisMetrics.length > 1000) {
      this.urisMetrics = this.urisMetrics.slice(-1000);
    }

    // Update live metrics files
    await this.updateLiveMetrics();
  }

  /**
   * Check SLO compliance and trigger alerts
   */
  async checkSLOCompliance() {
    const now = Date.now();
    const windowStart = now - (this.urisConfig.metricsWindowMinutes * 60 * 1000);
    
    const recentMetrics = this.urisMetrics.filter(
      m => new Date(m.timestamp).getTime() >= windowStart
    );

    if (recentMetrics.length === 0) return { status: 'UNKNOWN', violations: [] };

    // Calculate routing latency P95
    const durations = recentMetrics.map(m => m.duration_ms).sort((a, b) => a - b);
    const p95Index = Math.floor(durations.length * 0.95);
    const p95Latency = durations[p95Index] || 0;

    // Calculate context detection accuracy
    const successfulDecisions = recentMetrics.filter(m => m.decision.success).length;
    const contextAccuracy = (successfulDecisions / recentMetrics.length) * 100;

    // Calculate consensus success rate
    const consensusSuccesses = recentMetrics.filter(m => m.consensus_achieved).length;
    const consensusRate = (consensusSuccesses / recentMetrics.length) * 100;

    // Check SLO violations
    const violations = [];
    let status = 'PASS';

    if (p95Latency > this.urisConfig.routingLatencyThreshold) {
      violations.push(`Routing P95 latency ${p95Latency}ms > ${this.urisConfig.routingLatencyThreshold}ms`);
      status = 'FAIL';
    }

    if (contextAccuracy < this.urisConfig.contextAccuracyThreshold) {
      violations.push(`Context accuracy ${contextAccuracy.toFixed(1)}% < ${this.urisConfig.contextAccuracyThreshold}%`);
      status = status === 'FAIL' ? 'FAIL' : 'WARN';
    }

    if (consensusRate < this.urisConfig.consensusSuccessThreshold) {
      violations.push(`Consensus rate ${consensusRate.toFixed(1)}% < ${this.urisConfig.consensusSuccessThreshold}%`);
      status = status === 'FAIL' ? 'FAIL' : 'WARN';
    }

    this.lastSLOCheck = now;
    return {
      status,
      violations,
      metrics: {
        p95_latency_ms: p95Latency,
        context_accuracy_pct: contextAccuracy,
        consensus_rate_pct: consensusRate,
        sample_count: recentMetrics.length,
      },
    };
  }

  /**
   * Update live metrics files for T3 integration
   */
  async updateLiveMetrics() {
    try {
      // Generate URIS metrics report
      const sloStatus = await this.checkSLOCompliance();
      
      const urisLiveData = {
        timestamp: new Date().toISOString(),
        uris_circuit_breaker: {
          name: 'URIS-AGENT-ROUTER',
          state: this.state,
          failureCount: this.failureCount,
          successCount: this.successCount,
          failureThreshold: this.t3Config.failureThreshold,
          successThreshold: this.t3Config.successThreshold,
          lastFailureTime: this.lastFailureTime,
          uptime: process.uptime(),
        },
        slo_compliance: sloStatus,
        integration: {
          t3_compatible: true,
          metrics_window_minutes: this.urisConfig.metricsWindowMinutes,
          total_routing_decisions: this.urisMetrics.length,
        },
        performance_summary: {
          current_p95_ms: sloStatus.metrics?.p95_latency_ms || 0,
          target_p95_ms: this.urisConfig.routingLatencyThreshold,
          slo_status: sloStatus.status,
        },
      };

      // Write URIS metrics file
      await fs.writeFile(
        this.urisLiveMetricsPath,
        JSON.stringify(urisLiveData, null, 2)
      );

      // Enhance existing T3 metrics file with URIS data
      await this.enhanceT3Metrics(urisLiveData);

      console.log(`[URIS-CB] Live metrics updated - SLO: ${sloStatus.status}, P95: ${sloStatus.metrics?.p95_latency_ms || 0}ms`);
      
    } catch (error) {
      console.error('[URIS-CB] Failed to update live metrics:', error.message);
    }
  }

  /**
   * Enhance existing T3 circuit breaker metrics with URIS data
   */
  async enhanceT3Metrics(urisData) {
    try {
      // Read existing T3 metrics
      const t3MetricsData = await fs.readFile(this.liveMetricsPath, 'utf8');
      const t3Metrics = JSON.parse(t3MetricsData);

      // Add URIS enhancement section
      const enhancedMetrics = {
        ...t3Metrics,
        uris_enhancement: {
          agent_router_metrics: urisData.slo_compliance.metrics,
          slo_status: urisData.slo_compliance.status,
          violations: urisData.slo_compliance.violations,
          integration_status: 'ACTIVE',
          enhancement_timestamp: new Date().toISOString(),
        },
      };

      // Write enhanced metrics back (non-destructive)
      await fs.writeFile(
        path.join(path.dirname(this.liveMetricsPath), 't3-uris-enhanced-metrics.json'),
        JSON.stringify(enhancedMetrics, null, 2)
      );

    } catch (error) {
      console.error('[URIS-CB] Failed to enhance T3 metrics:', error.message);
    }
  }

  /**
   * Execute operation with timeout (T3 compatibility)
   */
  async executeWithTimeout(operation) {
    return Promise.race([
      operation(),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Operation timeout')), this.t3Config.timeout)
      ),
    ]);
  }

  /**
   * Handle successful operation
   */
  onSuccess() {
    this.failureCount = 0;
    
    if (this.state === 'HALF_OPEN') {
      this.successCount++;
      if (this.successCount >= this.t3Config.successThreshold) {
        this.state = 'CLOSED';
        this.successCount = 0;
      }
    }
  }

  /**
   * Handle failed operation
   */
  onFailure() {
    this.failureCount++;
    this.lastFailureTime = Date.now();
    
    if (this.failureCount >= this.t3Config.failureThreshold) {
      this.state = 'OPEN';
    }
  }

  /**
   * Get current circuit breaker status with URIS metrics
   */
  async getStatus() {
    const sloStatus = await this.checkSLOCompliance();
    
    return {
      circuit_breaker: {
        state: this.state,
        failureCount: this.failureCount,
        successCount: this.successCount,
        lastFailureTime: this.lastFailureTime,
      },
      uris_metrics: sloStatus,
      t3_integration: {
        compatible: true,
        live_metrics_path: this.liveMetricsPath,
        enhanced_metrics_available: true,
      },
    };
  }
}

// Export for integration with existing T3 system
module.exports = { URISEnhancedCircuitBreaker };

// Demo usage for testing
if (require.main === module) {
  const circuitBreaker = new URISEnhancedCircuitBreaker();
  
  // Simulate URIS Agent Router operations
  const testOperation = () => ({
    agent: 'performance-analyzer',
    confidence: 0.95,
    reasoning: 'High confidence routing decision based on context analysis',
  });

  console.log('[URIS-CB] Starting integration test...');
  
  setInterval(async () => {
    try {
      await circuitBreaker.execute(testOperation, 'performance-optimization');
    } catch (error) {
      console.log('[URIS-CB] Test operation failed (expected for testing):', error.message);
    }
  }, 2000);
}