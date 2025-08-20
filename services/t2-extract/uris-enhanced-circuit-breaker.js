/**
 * URIS Enhanced Circuit Breaker Monitor
 * Extends the existing T3 circuit breaker system with URIS Agent Router metrics
 * Integrates routing performance with existing API monitoring
 */

const http = require('http');
const fs = require('fs');

console.log("🔍 URIS Enhanced Circuit Breaker 상태 모니터링 시작...");
console.log("📅 시작 시간:", new Date().toISOString());

// Circuit Breaker States from existing system
const CircuitBreakerStates = {
  CLOSED: 'CLOSED',
  OPEN: 'OPEN', 
  HALF_OPEN: 'HALF_OPEN'
};

// URIS-specific monitoring states
const URISStates = {
  OPTIMAL: 'OPTIMAL',          // All SLOs met
  DEGRADED: 'DEGRADED',        // Some SLO violations
  CRITICAL: 'CRITICAL'         // Multiple SLO violations
};

class URISEnhancedCircuitBreaker {
  constructor() {
    // Inherit existing circuit breaker logic
    this.state = CircuitBreakerStates.CLOSED;
    this.failureCount = 0;
    this.failureThreshold = 5;
    this.resetTimeout = 60000;
    this.lastFailureTime = null;
    this.totalRequests = 0;
    this.successfulRequests = 0;
    this.metrics = [];
    
    // URIS-specific metrics
    this.urisState = URISStates.OPTIMAL;
    this.routingDecisions = [];
    this.sloViolations = {
      latency: 0,
      accuracy: 0,
      consensus: 0
    };
    
    // SLO targets matching URIS collector
    this.sloTargets = {
      routingLatencyP95: 50,      // ms
      contextAccuracy: 0.90,      // 90%
      consensusRate: 0.95         // 95%
    };
    
    this.startTime = Date.now();
  }

  /**
   * Record API request (existing T3 functionality)
   */
  recordRequest(success, responseTime, errorType = null) {
    this.totalRequests++;
    const timestamp = new Date().toISOString();

    if (success) {
      this.successfulRequests++;
      this.failureCount = Math.max(0, this.failureCount - 1);

      if (this.state === CircuitBreakerStates.HALF_OPEN) {
        this.state = CircuitBreakerStates.CLOSED;
        console.log(`🔄 Circuit Breaker → CLOSED (복구 성공)`);
      }
    } else {
      this.failureCount++;
      this.lastFailureTime = Date.now();

      if (this.failureCount >= this.failureThreshold && this.state === CircuitBreakerStates.CLOSED) {
        this.state = CircuitBreakerStates.OPEN;
        console.log(`🚨 Circuit Breaker → OPEN (임계값 초과: ${this.failureCount}/${this.failureThreshold})`);
      }
    }

    const metric = {
      timestamp,
      state: this.state,
      success,
      responseTime,
      errorType,
      failureCount: this.failureCount,
      totalRequests: this.totalRequests,
      successRate: (this.successfulRequests / this.totalRequests * 100).toFixed(2)
    };

    this.metrics.push(metric);

    if (this.metrics.length > 100) {
      this.metrics = this.metrics.slice(-100);
    }

    return metric;
  }

  /**
   * Record URIS routing decision (NEW)
   */
  recordRoutingDecision(context, decision, duration, consensusReached = true) {
    const timestamp = new Date().toISOString();
    
    const routingMetric = {
      timestamp,
      context,
      agent: decision.agent,
      confidence: decision.confidence,
      duration,
      consensusReached,
      success: decision.success
    };

    this.routingDecisions.push(routingMetric);

    // Keep last 200 routing decisions
    if (this.routingDecisions.length > 200) {
      this.routingDecisions = this.routingDecisions.slice(-200);
    }

    // Check SLO violations
    this.checkSLOViolations(duration, decision.confidence, consensusReached);
    
    // Update URIS state based on SLO compliance
    this.updateURISState();

    console.log(`📊 URIS Routing [${context}]: ${decision.success ? '✅' : '❌'} ${duration}ms (confidence: ${(decision.confidence * 100).toFixed(1)}%)`);

    return routingMetric;
  }

  /**
   * Check for SLO violations and update counters
   */
  checkSLOViolations(duration, confidence, consensusReached) {
    // Reset violation counters periodically (every 100 decisions)
    if (this.routingDecisions.length % 100 === 0) {
      this.sloViolations = { latency: 0, accuracy: 0, consensus: 0 };
    }

    if (duration > this.sloTargets.routingLatencyP95) {
      this.sloViolations.latency++;
      console.log(`⚠️ SLO Violation: Routing latency ${duration}ms > ${this.sloTargets.routingLatencyP95}ms`);
    }

    if (confidence < this.sloTargets.contextAccuracy) {
      this.sloViolations.accuracy++;
      console.log(`⚠️ SLO Violation: Context accuracy ${(confidence * 100).toFixed(1)}% < ${this.sloTargets.contextAccuracy * 100}%`);
    }

    if (!consensusReached) {
      this.sloViolations.consensus++;
      console.log(`⚠️ SLO Violation: Consensus not reached`);
    }
  }

  /**
   * Update URIS state based on SLO violations
   */
  updateURISState() {
    const recentDecisions = this.routingDecisions.slice(-50); // Last 50 decisions
    if (recentDecisions.length < 10) return; // Need minimum data

    // Calculate recent performance
    const durations = recentDecisions.map(d => d.duration);
    const p95Index = Math.floor(durations.length * 0.95);
    const p95Latency = durations.sort((a, b) => a - b)[p95Index] || 0;
    
    const avgAccuracy = recentDecisions.reduce((sum, d) => sum + d.confidence, 0) / recentDecisions.length;
    const consensusRate = recentDecisions.filter(d => d.consensusReached).length / recentDecisions.length;

    // Determine URIS state
    let violationCount = 0;
    if (p95Latency > this.sloTargets.routingLatencyP95) violationCount++;
    if (avgAccuracy < this.sloTargets.contextAccuracy) violationCount++;
    if (consensusRate < this.sloTargets.consensusRate) violationCount++;

    const previousState = this.urisState;
    
    if (violationCount === 0) {
      this.urisState = URISStates.OPTIMAL;
    } else if (violationCount === 1) {
      this.urisState = URISStates.DEGRADED;
    } else {
      this.urisState = URISStates.CRITICAL;
    }

    if (previousState !== this.urisState) {
      console.log(`🔄 URIS State → ${this.urisState} (violations: ${violationCount})`);
    }
  }

  /**
   * Get enhanced status including URIS metrics
   */
  getEnhancedStatus() {
    const baseStatus = {
      state: this.state,
      failureCount: this.failureCount,
      threshold: this.failureThreshold,
      totalRequests: this.totalRequests,
      successfulRequests: this.successfulRequests,
      successRate: (this.successfulRequests / this.totalRequests * 100).toFixed(2) + '%',
      lastFailureTime: this.lastFailureTime,
      uptime: (Date.now() - this.startTime) / 1000
    };

    // Calculate URIS metrics
    const recentDecisions = this.routingDecisions.slice(-50);
    let urisMetrics = {
      available: false,
      total_decisions: this.routingDecisions.length
    };

    if (recentDecisions.length > 10) {
      const durations = recentDecisions.map(d => d.duration).sort((a, b) => a - b);
      const p95Index = Math.floor(durations.length * 0.95);
      
      urisMetrics = {
        available: true,
        state: this.urisState,
        total_decisions: this.routingDecisions.length,
        recent_decisions: recentDecisions.length,
        routing_performance: {
          p95_latency_ms: durations[p95Index] || 0,
          avg_latency_ms: durations.reduce((a, b) => a + b, 0) / durations.length || 0,
          target_latency_ms: this.sloTargets.routingLatencyP95
        },
        context_accuracy: {
          rate: (recentDecisions.reduce((sum, d) => sum + d.confidence, 0) / recentDecisions.length * 100).toFixed(2) + '%',
          target: (this.sloTargets.contextAccuracy * 100).toFixed(0) + '%'
        },
        consensus_success: {
          rate: (recentDecisions.filter(d => d.consensusReached).length / recentDecisions.length * 100).toFixed(2) + '%',
          target: (this.sloTargets.consensusRate * 100).toFixed(0) + '%'
        },
        slo_violations: this.sloViolations
      };
    }

    return {
      timestamp: new Date().toISOString(),
      circuit_breaker: baseStatus,
      uris_metrics: urisMetrics,
      memory_usage: process.memoryUsage(),
      integration_status: 'enhanced_monitoring_active'
    };
  }

  /**
   * Export comprehensive metrics (enhanced version)
   */
  exportEnhancedMetrics() {
    const status = this.getEnhancedStatus();
    const summary = {
      ...status,
      performance_summary: {
        circuit_breaker: {
          state: this.state,
          total_requests: this.totalRequests,
          success_rate: (this.successfulRequests / this.totalRequests * 100).toFixed(2) + '%',
          current_failures: this.failureCount
        },
        uris_routing: status.uris_metrics.available ? {
          state: this.urisState,
          p95_compliance: status.uris_metrics.routing_performance.p95_latency_ms <= this.sloTargets.routingLatencyP95,
          accuracy_compliance: parseFloat(status.uris_metrics.context_accuracy.rate) >= this.sloTargets.contextAccuracy * 100,
          consensus_compliance: parseFloat(status.uris_metrics.consensus_success.rate) >= this.sloTargets.consensusRate * 100
        } : { state: 'insufficient_data' }
      }
    };

    // Write to multiple output files for different consumers
    fs.writeFileSync('/Users/ted/snap3/services/t2-extract/t3-uris-enhanced.json', JSON.stringify(summary, null, 2));
    fs.writeFileSync('/Users/ted/snap3/services/t2-extract/uris-metrics-live.json', JSON.stringify(status.uris_metrics, null, 2));

    return summary;
  }

  /**
   * Should allow request - enhanced logic
   */
  shouldAllowRequest() {
    // Existing circuit breaker logic
    if (this.state === CircuitBreakerStates.CLOSED) {
      return true;
    }

    if (this.state === CircuitBreakerStates.OPEN) {
      if (Date.now() - this.lastFailureTime > this.resetTimeout) {
        this.state = CircuitBreakerStates.HALF_OPEN;
        console.log(`🔄 Circuit Breaker → HALF_OPEN (복구 시도)`);
        return true;
      }
      return false;
    }

    return this.state === CircuitBreakerStates.HALF_OPEN;
  }

  /**
   * Get dashboard data optimized for real-time display
   */
  getDashboardData() {
    const status = this.getEnhancedStatus();
    
    return {
      timestamp: status.timestamp,
      overall_health: {
        circuit_breaker: this.state === CircuitBreakerStates.CLOSED ? 'healthy' : 'degraded',
        uris_routing: this.urisState.toLowerCase(),
        integration: 'active'
      },
      key_metrics: {
        api_success_rate: parseFloat(status.circuit_breaker.successRate.replace('%', '')),
        api_total_requests: status.circuit_breaker.totalRequests,
        routing_p95_ms: status.uris_metrics.available ? status.uris_metrics.routing_performance.p95_latency_ms : null,
        routing_decisions: status.uris_metrics.total_decisions
      },
      slo_compliance: status.uris_metrics.available ? {
        routing_latency: status.uris_metrics.routing_performance.p95_latency_ms <= this.sloTargets.routingLatencyP95,
        context_accuracy: parseFloat(status.uris_metrics.context_accuracy.rate) >= this.sloTargets.contextAccuracy * 100,
        consensus_success: parseFloat(status.uris_metrics.consensus_success.rate) >= this.sloTargets.consensusRate * 100
      } : null
    };
  }
}

// Enhanced monitoring instance
const enhancedMonitor = new URISEnhancedCircuitBreaker();

// Test URIS routing decisions (simulated)
async function simulateURISDecision(testId, scenario) {
  const startTime = Date.now();
  
  // Simulate routing decision
  const decision = {
    agent: scenario.agent || 'claude-code',
    confidence: Math.random() * 0.4 + 0.6, // 0.6 to 1.0
    success: Math.random() > 0.1 // 90% success rate
  };
  
  const duration = Math.random() * 80 + 20; // 20-100ms
  const consensusReached = Math.random() > 0.05; // 95% consensus rate
  
  enhancedMonitor.recordRoutingDecision(
    scenario.context || `test-context-${testId}`,
    decision,
    duration,
    consensusReached
  );
  
  return { success: decision.success, duration, consensus: consensusReached };
}

// Enhanced benchmark with URIS simulation
async function runEnhancedBenchmark() {
  console.log("🚀 Enhanced Circuit Breaker + URIS 통합 벤치마크 시작...");

  // 1. API 성공 시나리오 (기존 기능)
  console.log("✅ API 성공 시나리오 테스트...");
  for (let i = 1; i <= 15; i++) {
    const responseTime = Math.random() * 50 + 10; // 10-60ms
    enhancedMonitor.recordRequest(true, responseTime);
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  // 2. URIS 라우팅 결정 시뮬레이션
  console.log("🧠 URIS 라우팅 결정 시뮬레이션...");
  const contexts = ['analyze', 'implement', 'debug', 'optimize', 'document'];
  
  for (let i = 1; i <= 30; i++) {
    const context = contexts[i % contexts.length];
    await simulateURISDecision(i, {
      context: context,
      agent: i % 3 === 0 ? 'gpt-5' : 'claude-code'
    });
    await new Promise(resolve => setTimeout(resolve, 50));
  }

  // 3. SLO 위반 시나리오
  console.log("⚠️ SLO 위반 시나리오 테스트...");
  for (let i = 1; i <= 10; i++) {
    // Simulate high latency and low confidence
    const decision = {
      agent: 'test-agent',
      confidence: 0.70, // Below 90% target  
      success: true
    };
    const highLatency = 80 + Math.random() * 40; // 80-120ms (above 50ms target)
    
    enhancedMonitor.recordRoutingDecision(
      `slo-violation-${i}`,
      decision,
      highLatency,
      false // Consensus failure
    );
    
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  // 4. 최종 결과 및 통합 데이터 출력
  const finalMetrics = enhancedMonitor.exportEnhancedMetrics();
  const dashboardData = enhancedMonitor.getDashboardData();
  
  console.log("\\n📊 Enhanced 벤치마크 최종 결과:");
  console.log("=".repeat(50));
  console.log(`Circuit Breaker State: ${finalMetrics.circuit_breaker.state}`);
  console.log(`URIS State: ${finalMetrics.uris_metrics.state || 'N/A'}`);
  console.log(`API Success Rate: ${finalMetrics.circuit_breaker.successRate}`);
  
  if (finalMetrics.uris_metrics.available) {
    console.log(`Routing P95 Latency: ${finalMetrics.uris_metrics.routing_performance.p95_latency_ms}ms (target: <50ms)`);
    console.log(`Context Accuracy: ${finalMetrics.uris_metrics.context_accuracy.rate} (target: ≥90%)`);
    console.log(`Consensus Rate: ${finalMetrics.uris_metrics.consensus_success.rate} (target: ≥95%)`);
  }
  
  console.log("\\n📈 Dashboard Data:");
  console.log(JSON.stringify(dashboardData, null, 2));
  
  console.log("\\n✅ Enhanced T3 + URIS 벤치마크 완료");
  console.log("📁 결과 파일:");
  console.log("   - t3-uris-enhanced.json (통합 메트릭)");
  console.log("   - uris-metrics-live.json (URIS 전용 메트릭)");
}

// Export for use as module
module.exports = { URISEnhancedCircuitBreaker, enhancedMonitor };

// Run benchmark if called directly
if (require.main === module) {
  runEnhancedBenchmark().catch(console.error);
}