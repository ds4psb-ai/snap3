// 🚨 GPT-5 Lean Recursion 통합 - Enhanced Circuit Breaker v2.0
// 목적: "디버그와 큰 사태" 방지 완전 솔루션

const fs = require('fs');
const { preflightVertex, MINIMUM_INTERVAL_MS } = require('./src/preflight-checks');
const { withSmartRetry, backoffWithJitter } = require('./src/exponential-backoff');

console.log("🛡️ Enhanced Circuit Breaker v2.0 시작 (Lean Recursion 통합)");

class EnhancedCircuitBreaker {
  constructor(name, options = {}) {
    this.name = name;
    this.state = 'CLOSED';
    this.failureCount = 0;
    this.successCount = 0;
    this.failureThreshold = options.failureThreshold || 5;
    this.successThreshold = options.successThreshold || 3;
    this.resetTimeout = options.resetTimeout || 60000;
    this.lastFailureTime = null;
    this.lastStateChange = new Date();
    
    // 메트릭 추가
    this.totalRequests = 0;
    this.responseTimes = [];
    this.uptime = Date.now();
    
    // GPT-5 Lean Recursion 통합
    this.lastVertexCall = 0;
    this.consecutiveFailures = 0;
    
    console.log(`🔧 ${name} Circuit Breaker 초기화 완료`);
  }

  /**
   * Lean Recursion + Circuit Breaker 통합 요청 검증
   */
  async shouldAllowRequest(gcsUri = null) {
    // 1. 기본 Circuit Breaker 로직
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailureTime > this.resetTimeout) {
        this.state = 'HALF_OPEN';
        this.lastStateChange = new Date();
        console.log(`🔄 ${this.name} → HALF_OPEN (복구 시도)`);
        return true;
      }
      return false;
    }

    // 2. GPT-5 Preflight 검증 (Vertex API 전용)
    if (this.name === 'VERTEX-API' && gcsUri) {
      try {
        await preflightVertex(gcsUri, this);
      } catch (error) {
        console.log(`🚫 ${this.name} Preflight 실패: ${error.message}`);
        return false;
      }
    }

    return true;
  }

  /**
   * 스마트 재시도 + Circuit Breaker 통합
   */
  async executeWithProtection(operation, options = {}) {
    const { enableRetry = true, maxRetries = 3, gcsUri = null } = options;

    // 사전 검증
    const allowed = await this.shouldAllowRequest(gcsUri);
    if (!allowed) {
      throw new Error(`Circuit breaker ${this.name} blocked request`);
    }

    const startTime = Date.now();
    let lastError = null;

    // 재시도 로직 (GPT-5 Exponential Backoff 사용)
    if (enableRetry) {
      return await withSmartRetry(async () => {
        try {
          const result = await operation();
          this.recordSuccess(Date.now() - startTime);
          return result;
        } catch (error) {
          lastError = error;
          this.recordFailure(Date.now() - startTime, error);
          throw error;
        }
      }, { maxRetries });
    } else {
      // 단일 실행
      try {
        const result = await operation();
        this.recordSuccess(Date.now() - startTime);
        return result;
      } catch (error) {
        this.recordFailure(Date.now() - startTime, error);
        throw error;
      }
    }
  }

  recordSuccess(responseTime) {
    this.totalRequests++;
    this.successCount++;
    this.consecutiveFailures = 0;
    
    if (this.failureCount > 0) {
      this.failureCount = Math.max(0, this.failureCount - 1);
    }

    // Response time 기록
    this.responseTimes.push(responseTime);
    if (this.responseTimes.length > 100) {
      this.responseTimes = this.responseTimes.slice(-100);
    }

    // HALF_OPEN → CLOSED 전환
    if (this.state === 'HALF_OPEN' && this.successCount >= this.successThreshold) {
      this.state = 'CLOSED';
      this.lastStateChange = new Date();
      console.log(`✅ ${this.name} → CLOSED (복구 완료)`);
    }

    console.log(`📊 ${this.name} SUCCESS: ${responseTime}ms (${this.getSuccessRate()}% success)`);
  }

  recordFailure(responseTime, error) {
    this.totalRequests++;
    this.failureCount++;
    this.consecutiveFailures++;
    this.lastFailureTime = Date.now();

    // Response time 기록 (실패시에도)
    this.responseTimes.push(responseTime);
    if (this.responseTimes.length > 100) {
      this.responseTimes = this.responseTimes.slice(-100);
    }

    // CLOSED → OPEN 전환
    if (this.state === 'CLOSED' && this.failureCount >= this.failureThreshold) {
      this.state = 'OPEN';
      this.lastStateChange = new Date();
      console.log(`🚨 ${this.name} → OPEN (임계값 초과: ${this.failureCount}/${this.failureThreshold})`);
    }

    // HALF_OPEN → OPEN 전환 (즉시)
    if (this.state === 'HALF_OPEN') {
      this.state = 'OPEN';
      this.lastStateChange = new Date();
      console.log(`🚨 ${this.name} → OPEN (복구 실패)`);
    }

    console.log(`❌ ${this.name} FAILURE: ${error.message} (${this.getSuccessRate()}% success)`);
  }

  getSuccessRate() {
    if (this.totalRequests === 0) return "100.00";
    return ((this.totalRequests - this.failureCount) / this.totalRequests * 100).toFixed(2);
  }

  getAvgResponseTime() {
    if (this.responseTimes.length === 0) return "0.00";
    return (this.responseTimes.reduce((sum, t) => sum + t, 0) / this.responseTimes.length).toFixed(2);
  }

  getP95ResponseTime() {
    if (this.responseTimes.length === 0) return "0";
    const sorted = [...this.responseTimes].sort((a, b) => a - b);
    const p95Index = Math.ceil(sorted.length * 0.95) - 1;
    return Math.floor(sorted[p95Index] || 0);
  }

  getStatus() {
    return {
      name: this.name,
      state: this.state,
      failureCount: this.failureCount,
      successCount: this.successCount,
      failureThreshold: this.failureThreshold,
      successThreshold: this.successThreshold,
      successRate: this.getSuccessRate() + '%',
      avgResponseTime: this.getAvgResponseTime() + 'ms',
      p95ResponseTime: this.getP95ResponseTime() + 'ms',
      totalRequests: this.totalRequests,
      uptime: (Date.now() - this.uptime) / 1000 + 's',
      lastStateChange: this.lastStateChange.toISOString()
    };
  }
}

// 실제 Circuit Breaker 인스턴스들 생성
const t1ApiBreaker = new EnhancedCircuitBreaker('T1-API', {
  failureThreshold: 3,
  successThreshold: 2,
  resetTimeout: 30000
});

const vertexApiBreaker = new EnhancedCircuitBreaker('VERTEX-API', {
  failureThreshold: 5,
  successThreshold: 3,
  resetTimeout: 60000
});

/**
 * 실시간 상태 모니터링 및 파일 출력
 */
function startLiveMonitoring() {
  setInterval(() => {
    const status = {
      timestamp: new Date().toISOString(),
      t1_api_breaker: t1ApiBreaker.getStatus(),
      vertex_api_breaker: vertexApiBreaker.getStatus(),
      system_uptime: process.uptime(),
      memory_usage: process.memoryUsage()
    };

    // 실시간 JSON 파일 업데이트
    fs.writeFileSync('t3-circuit-breaker-live.json', JSON.stringify(status, null, 2));
    
    // P95 결과만 별도로 저장
    const p95Results = {
      timestamp: new Date().toISOString().split('T')[0] + 'T' + 
                 new Date().toISOString().split('T')[1].split('.')[0] + 'Z',
      metrics: {
        p95_response_time_ms: t1ApiBreaker.getP95ResponseTime(),
        p50_response_time_ms: Math.floor(t1ApiBreaker.responseTimes.length > 0 ?
          t1ApiBreaker.responseTimes.sort((a,b) => a-b)[Math.floor(t1ApiBreaker.responseTimes.length/2)] || 0 : 0),
        avg_response_time_ms: Math.floor(parseFloat(t1ApiBreaker.getAvgResponseTime())),
        sample_count: Math.min(t1ApiBreaker.responseTimes.length, 100)
      },
      target: {
        p95_threshold: 500,
        status: t1ApiBreaker.getP95ResponseTime() < 500 ? 'PASS' : 'FAIL'
      }
    };
    fs.writeFileSync('p95-results.json', JSON.stringify(p95Results, null, 4));

  }, 5000); // 5초마다 업데이트
}

// 5분 RCA 프레임워크 (GPT-5 권장사항)
function generate5MinRCA() {
  const rcaData = {
    timestamp: new Date().toISOString(),
    rca_analysis: {
      t1_api: {
        status: t1ApiBreaker.state,
        recent_failures: t1ApiBreaker.consecutiveFailures,
        avg_response: t1ApiBreaker.getAvgResponseTime(),
        success_rate: t1ApiBreaker.getSuccessRate()
      },
      vertex_api: {
        status: vertexApiBreaker.state,
        recent_failures: vertexApiBreaker.consecutiveFailures,
        avg_response: vertexApiBreaker.getAvgResponseTime(),
        success_rate: vertexApiBreaker.getSuccessRate()
      },
      system_health: {
        memory_usage: Math.round(process.memoryUsage().rss / 1024 / 1024) + 'MB',
        uptime: Math.round(process.uptime()) + 's',
        lean_recursion_active: true
      },
      recommendations: [
        t1ApiBreaker.state === 'OPEN' ? '🚨 T1 API 복구 대기 중' : '✅ T1 API 정상',
        vertexApiBreaker.state === 'OPEN' ? '🚨 Vertex API 복구 대기 중' : '✅ Vertex API 정상',
        'GPT-5 Lean Recursion 디버깅 예방 활성화됨'
      ]
    }
  };

  fs.writeFileSync('5min-rca-report.json', JSON.stringify(rcaData, null, 2));
  return rcaData;
}

// 모니터링 시작
startLiveMonitoring();

// 5분마다 RCA 리포트 생성
setInterval(generate5MinRCA, 5 * 60 * 1000);

console.log("✅ Enhanced Circuit Breaker v2.0 실행 중");
console.log("📊 실시간 모니터링: t3-circuit-breaker-live.json, p95-results.json");
console.log("🕵️ RCA 리포트: 5min-rca-report.json (5분마다)");

module.exports = {
  t1ApiBreaker,
  vertexApiBreaker,
  EnhancedCircuitBreaker
};