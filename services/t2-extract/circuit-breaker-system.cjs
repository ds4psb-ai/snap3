const http = require('http');
const fs = require('fs');

// node-fetch 동적 import 처리
let fetch;
(async () => {
  try {
    fetch = require('node-fetch');
  } catch (e) {
    // ES module fallback
    const fetchModule = await import('node-fetch');
    fetch = fetchModule.default;
  }
})();

console.log("⚡ T3 고급 Circuit Breaker + 메트릭 시스템 시작...");
console.log("📅 시작 시간:", new Date().toISOString());

// 고급 Circuit Breaker 클래스
class AdvancedCircuitBreaker {
  constructor(name, config = {}) {
    this.name = name;
    this.state = 'CLOSED';
    this.failureCount = 0;
    this.successCount = 0;
    this.failureThreshold = config.failureThreshold || 5;
    this.successThreshold = config.successThreshold || 3; // HALF_OPEN에서 CLOSED로 전환 기준
    this.timeout = config.timeout || 60000; // 1분
    this.halfOpenMaxCalls = config.halfOpenMaxCalls || 3;
    this.halfOpenCallCount = 0;
    this.lastFailureTime = null;
    this.lastStateChange = Date.now();

    // 메트릭 수집
    this.metrics = {
      requests: [],
      stateChanges: [],
      performance: {
        avgResponseTime: 0,
        p95ResponseTime: 0,
        totalRequests: 0,
        successRate: 0
      }
    };
  }

  async execute(operation, context = {}) {
    const requestId = `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const startTime = Date.now();

    // 상태별 요청 처리
    switch (this.state) {
      case 'CLOSED':
        return await this.executeClosed(operation, requestId, startTime, context);
      case 'OPEN':
        return await this.executeOpen(operation, requestId, startTime, context);
      case 'HALF_OPEN':
        return await this.executeHalfOpen(operation, requestId, startTime, context);
    }
  }

  async executeClosed(operation, requestId, startTime, context) {
    try {
      const result = await operation();
      const responseTime = Date.now() - startTime;

      this.recordSuccess(requestId, responseTime, context);
      return result;

    } catch (error) {
      const responseTime = Date.now() - startTime;
      this.recordFailure(requestId, responseTime, error, context);

      // 임계값 체크
      if (this.failureCount >= this.failureThreshold) {
        this.transitionToOpen();
      }

      throw error;
    }
  }

  async executeOpen(operation, requestId, startTime, context) {
    // OPEN 상태에서는 타임아웃 후에만 HALF_OPEN으로 전환
    if (Date.now() - this.lastFailureTime < this.timeout) {
      const waitTime = this.timeout - (Date.now() - this.lastFailureTime);
      this.recordBlocked(requestId, context, waitTime);
      throw new Error(`Circuit breaker OPEN - wait ${Math.ceil(waitTime/1000)}s`);
    }

    // 타임아웃 경과 → HALF_OPEN으로 전환
    this.transitionToHalfOpen();
    return await this.executeHalfOpen(operation, requestId, startTime, context);
  }

  async executeHalfOpen(operation, requestId, startTime, context) {
    // HALF_OPEN에서 최대 호출 수 제한
    if (this.halfOpenCallCount >= this.halfOpenMaxCalls) {
      this.recordBlocked(requestId, context, 0);
      throw new Error('Circuit breaker HALF_OPEN - max calls exceeded');
    }

    this.halfOpenCallCount++;

    try {
      const result = await operation();
      const responseTime = Date.now() - startTime;

      this.recordSuccess(requestId, responseTime, context);
      this.successCount++;

      // 충분한 성공시 CLOSED로 전환
      if (this.successCount >= this.successThreshold) {
        this.transitionToClosed();
      }

      return result;

    } catch (error) {
      const responseTime = Date.now() - startTime;
      this.recordFailure(requestId, responseTime, error, context);

      // 하나라도 실패하면 다시 OPEN
      this.transitionToOpen();
      throw error;
    }
  }

  recordSuccess(requestId, responseTime, context) {
    const metric = {
      requestId,
      timestamp: new Date().toISOString(),
      success: true,
      responseTime,
      state: this.state,
      context
    };

    this.metrics.requests.push(metric);
    this.updatePerformanceMetrics();

    console.log(`✅ ${this.name} Success: ${requestId} (${responseTime}ms) [${this.state}]`);
  }

  recordFailure(requestId, responseTime, error, context) {
    this.failureCount++;
    this.lastFailureTime = Date.now();

    const metric = {
      requestId,
      timestamp: new Date().toISOString(),
      success: false,
      responseTime,
      state: this.state,
      error: error.message,
      context
    };

    this.metrics.requests.push(metric);
    this.updatePerformanceMetrics();

    console.log(`❌ ${this.name} Failure: ${requestId} (${responseTime}ms) [${this.state}] - ${error.message}`);
  }

  recordBlocked(requestId, context, waitTime) {
    const metric = {
      requestId,
      timestamp: new Date().toISOString(),
      success: false,
      blocked: true,
      state: this.state,
      waitTime,
      context
    };

    this.metrics.requests.push(metric);
    console.log(`🚫 ${this.name} Blocked: ${requestId} [${this.state}] - wait ${Math.ceil(waitTime/1000)}s`);
  }

  transitionToOpen() {
    const previousState = this.state;
    this.state = 'OPEN';
    this.halfOpenCallCount = 0;
    this.successCount = 0;

    this.recordStateChange(previousState, 'OPEN', 'FAILURE_THRESHOLD_EXCEEDED');
    console.log(`🚨 ${this.name} Circuit Breaker → OPEN (failures: ${this.failureCount}/${this.failureThreshold})`);
  }

  transitionToHalfOpen() {
    const previousState = this.state;
    this.state = 'HALF_OPEN';
    this.halfOpenCallCount = 0;
    this.successCount = 0;

    this.recordStateChange(previousState, 'HALF_OPEN', 'TIMEOUT_RECOVERY');
    console.log(`🔄 ${this.name} Circuit Breaker → HALF_OPEN (복구 시도)`);
  }

  transitionToClosed() {
    const previousState = this.state;
    this.state = 'CLOSED';
    this.failureCount = 0;
    this.halfOpenCallCount = 0;
    this.successCount = 0;

    this.recordStateChange(previousState, 'CLOSED', 'RECOVERY_SUCCESSFUL');
    console.log(`✅ ${this.name} Circuit Breaker → CLOSED (복구 완료)`);
  }

  recordStateChange(from, to, reason) {
    const change = {
      timestamp: new Date().toISOString(),
      from,
      to,
      reason,
      metrics: this.getStatus()
    };

    this.metrics.stateChanges.push(change);
    this.lastStateChange = Date.now();
  }

  updatePerformanceMetrics() {
    const requests = this.metrics.requests.filter(r => !r.blocked);
    const successful = requests.filter(r => r.success);

    if (requests.length > 0) {
      this.metrics.performance.totalRequests = requests.length;
      this.metrics.performance.successRate = (successful.length / requests.length * 100).toFixed(2);
      this.metrics.performance.avgResponseTime = (
        requests.reduce((sum, r) => sum + r.responseTime, 0) / requests.length
      ).toFixed(2);

      // P95 계산
      const sortedTimes = requests.map(r => r.responseTime).sort((a, b) => a - b);
      const p95Index = Math.ceil(sortedTimes.length * 0.95) - 1;
      this.metrics.performance.p95ResponseTime = sortedTimes[p95Index] || 0;
    }
  }

  getStatus() {
    return {
      name: this.name,
      state: this.state,
      failureCount: this.failureCount,
      successCount: this.successCount,
      failureThreshold: this.failureThreshold,
      successThreshold: this.successThreshold,
      successRate: this.metrics.performance.successRate + '%',
      avgResponseTime: this.metrics.performance.avgResponseTime + 'ms',
      p95ResponseTime: this.metrics.performance.p95ResponseTime + 'ms',
      totalRequests: this.metrics.performance.totalRequests,
      uptime: ((Date.now() - this.lastStateChange) / 1000).toFixed(1) + 's',
      lastStateChange: new Date(this.lastStateChange).toISOString()
    };
  }
}

// Circuit Breaker 인스턴스들
const t1ApiBreaker = new AdvancedCircuitBreaker('T1-API', {
  failureThreshold: 3,
  successThreshold: 2,
  timeout: 30000, // 30초
  halfOpenMaxCalls: 2
});

const vertexApiBreaker = new AdvancedCircuitBreaker('VERTEX-API', {
  failureThreshold: 5,
  successThreshold: 3,
  timeout: 60000, // 1분
  halfOpenMaxCalls: 3
});

// T1 API 연결 테스트 함수 (HTTP 모듈 사용)
async function testT1Connection() {
  try {
    const operation = async () => {
      return new Promise((resolve, reject) => {
        const req = http.request({
          hostname: 'localhost',
          port: 8080,
          path: '/api/health',
          method: 'GET',
          timeout: 5000
        }, (res) => {
          let data = '';
          res.on('data', chunk => data += chunk);
          res.on('end', () => {
            if (res.statusCode >= 200 && res.statusCode < 300) {
              try {
                resolve(JSON.parse(data));
              } catch (e) {
                resolve({ status: 'ok', statusCode: res.statusCode });
              }
            } else {
              reject(new Error(`HTTP ${res.statusCode}`));
            }
          });
        });

        req.on('error', reject);
        req.on('timeout', () => {
          req.destroy();
          reject(new Error('Request timeout'));
        });
        req.end();
      });
    };

    const result = await t1ApiBreaker.execute(operation, { test: 'health_check' });
    console.log("✅ T1 연결 테스트 성공:", result?.service || 'T1 API');
    return true;

  } catch (error) {
    console.log("❌ T1 연결 테스트 실패:", error.message);
    return false;
  }
}

// Vertex API 시뮬레이션 테스트
async function testVertexConnection() {
  try {
    const operation = async () => {
      // Vertex API 시뮬레이션 (실제 호출 대신)
      await new Promise(resolve => setTimeout(resolve, Math.random() * 1000));
      
      // 30% 확률로 실패 시뮬레이션
      if (Math.random() < 0.3) {
        throw new Error('Vertex AI quota exceeded');
      }
      
      return { status: 'success', model: 'gemini-2.5-pro' };
    };

    const result = await vertexApiBreaker.execute(operation, { test: 'vertex_simulation' });
    console.log("✅ Vertex 테스트 성공:", result.model);
    return true;

  } catch (error) {
    console.log("❌ Vertex 테스트 실패:", error.message);
    return false;
  }
}

// 주기적 상태 출력 (5초마다)
const statusInterval = setInterval(() => {
  const t1Status = t1ApiBreaker.getStatus();
  const vertexStatus = vertexApiBreaker.getStatus();

  console.log(`\n🔄 Circuit Breaker Status:`);
  console.log(`  T1-API: ${t1Status.state} (${t1Status.successRate}) - Failures: ${t1Status.failureCount}`);
  console.log(`  VERTEX: ${vertexStatus.state} (${vertexStatus.successRate}) - Failures: ${vertexStatus.failureCount}`);

  // 메트릭 파일 업데이트
  const metricsExport = {
    timestamp: new Date().toISOString(),
    t1_api_breaker: t1Status,
    vertex_api_breaker: vertexStatus,
    system_uptime: process.uptime(),
    memory_usage: process.memoryUsage()
  };

  fs.writeFileSync('t3-circuit-breaker-live.json', JSON.stringify(metricsExport, null, 2));

}, 5000);

// 주기적 연결 테스트 (15초마다)
const testInterval = setInterval(async () => {
  await testT1Connection();
  await testVertexConnection();
}, 15000);

// 초기 연결 테스트
setTimeout(async () => {
  console.log("\n🔗 초기 연결 테스트 실행...");
  await testT1Connection();
  await testVertexConnection();
}, 2000);

// 정리 함수
process.on('SIGINT', () => {
  console.log('\n🛑 T3 Circuit Breaker 시스템 종료...');
  clearInterval(statusInterval);
  clearInterval(testInterval);
  process.exit(0);
});

console.log("✅ T3 Circuit Breaker 시스템 완전 활성화");
console.log("📊 실시간 메트릭: tail -f t3-circuit-breaker-live.json");