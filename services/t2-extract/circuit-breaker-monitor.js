const http = require('http');
const fs = require('fs');

console.log("🔍 T3 Circuit Breaker 상태 모니터링 시작...");
console.log("📅 시작 시간:", new Date().toISOString());

// Circuit Breaker 상태 관리
const CircuitBreakerStates = {
  CLOSED: 'CLOSED',     // 정상 작동
  OPEN: 'OPEN',         // 회로 차단 (요청 차단)
  HALF_OPEN: 'HALF_OPEN' // 시험적 복구 중
};

class CircuitBreakerMonitor {
  constructor() {
    this.state = CircuitBreakerStates.CLOSED;
    this.failureCount = 0;
    this.failureThreshold = 5;
    this.resetTimeout = 60000; // 1분
    this.lastFailureTime = null;
    this.totalRequests = 0;
    this.successfulRequests = 0;
    this.metrics = [];
  }

  recordRequest(success, responseTime, errorType = null) {
    this.totalRequests++;
    const timestamp = new Date().toISOString();

    if (success) {
      this.successfulRequests++;
      this.failureCount = Math.max(0, this.failureCount - 1); // 성공시 실패 카운트 감소

      // HALF_OPEN에서 성공하면 CLOSED로 전환
      if (this.state === CircuitBreakerStates.HALF_OPEN) {
        this.state = CircuitBreakerStates.CLOSED;
        console.log(`🔄 Circuit Breaker → CLOSED (복구 성공)`);
      }
    } else {
      this.failureCount++;
      this.lastFailureTime = Date.now();

      // 실패 임계값 초과시 OPEN으로 전환
      if (this.failureCount >= this.failureThreshold && this.state === CircuitBreakerStates.CLOSED) {
        this.state = CircuitBreakerStates.OPEN;
        console.log(`🚨 Circuit Breaker → OPEN (임계값 초과: ${this.failureCount}/${this.failureThreshold})`);
      }
    }

    // 메트릭 기록
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

    // 최근 100개 메트릭만 유지
    if (this.metrics.length > 100) {
      this.metrics = this.metrics.slice(-100);
    }

    return metric;
  }

  shouldAllowRequest() {
    if (this.state === CircuitBreakerStates.CLOSED) {
      return true;
    }

    if (this.state === CircuitBreakerStates.OPEN) {
      // 리셋 타임아웃 후 HALF_OPEN으로 전환
      if (Date.now() - this.lastFailureTime > this.resetTimeout) {
        this.state = CircuitBreakerStates.HALF_OPEN;
        console.log(`🔄 Circuit Breaker → HALF_OPEN (복구 시도)`);
        return true;
      }
      return false;
    }

    // HALF_OPEN 상태에서는 제한적으로 요청 허용
    return this.state === CircuitBreakerStates.HALF_OPEN;
  }

  getStatus() {
    return {
      state: this.state,
      failureCount: this.failureCount,
      threshold: this.failureThreshold,
      totalRequests: this.totalRequests,
      successfulRequests: this.successfulRequests,
      successRate: (this.successfulRequests / this.totalRequests * 100).toFixed(2) + '%',
      lastFailureTime: this.lastFailureTime,
      uptime: process.uptime()
    };
  }

  exportMetrics() {
    const summary = {
      circuit_breaker_status: this.getStatus(),
      recent_metrics: this.metrics.slice(-10),
      performance_summary: {
        total_requests: this.totalRequests,
        success_rate: (this.successfulRequests / this.totalRequests * 100).toFixed(2) + '%',
        average_response_time: this.metrics.length > 0 ?
          (this.metrics.reduce((sum, m) => sum + (m.responseTime || 0), 0) / this.metrics.length).toFixed(3) + 's' : 'N/A',
        failure_count: this.failureCount,
        current_state: this.state
      }
    };

    fs.writeFileSync('circuit-breaker-metrics.json', JSON.stringify(summary, null, 2));
    return summary;
  }
}

// Circuit Breaker 인스턴스 생성
const monitor = new CircuitBreakerMonitor();

// T1 API 모니터링 함수
async function testT1API(testId, scenario) {
  const startTime = Date.now();

  try {
    // Circuit Breaker 상태 확인
    if (!monitor.shouldAllowRequest()) {
      console.log(`🚫 Request blocked by Circuit Breaker (${monitor.state})`);
      monitor.recordRequest(false, 0, 'CIRCUIT_BREAKER_OPEN');
      return false;
    }

    const response = await fetch('http://localhost:8080/api/vdp/extract-vertex', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(scenario),
      timeout: 5000
    });

    const responseTime = (Date.now() - startTime) / 1000;
    const success = response.ok;
    const errorType = success ? null : `HTTP_${response.status}`;

    monitor.recordRequest(success, responseTime, errorType);

    console.log(`📊 Test ${testId}: ${success ? '✅' : '❌'} (${response.status}) ${responseTime.toFixed(3)}s`);

    return success;

  } catch (error) {
    const responseTime = (Date.now() - startTime) / 1000;
    monitor.recordRequest(false, responseTime, error.code || 'NETWORK_ERROR');

    console.log(`📊 Test ${testId}: ❌ Error (${error.message}) ${responseTime.toFixed(3)}s`);
    return false;
  }
}

// 메인 벤치마크 실행
async function runBenchmark() {
  console.log("🚀 Circuit Breaker + DLQ 통합 벤치마크 시작...");

  // 1. 성공 시나리오 (20회)
  console.log("✅ 성공 시나리오 테스트...");
  for (let i = 1; i <= 20; i++) {
    await testT1API(`Success-${i}`, {
      platform: 'youtube',
      content_id: `success-test-${i}`,
      source_url: `https://youtube.com/shorts/test${i}`,
      language: 'ko',
      video_origin: 'social_media',
      correlation_id: `bench-success-${i}`
    });

    await new Promise(resolve => setTimeout(resolve, 200));
  }

  // 2. 실패 시나리오 (30회) - Circuit Breaker 트리거 목적
  console.log("🚨 실패 시나리오 테스트 (Circuit Breaker 트리거)...");
  for (let i = 1; i <= 30; i++) {
    const scenarios = [
      { invalid: "schema_test", correlation_id: `bench-schema-${i}` },
      { platform: "youtube", correlation_id: `bench-missing-${i}` },
      { platform: "invalid", content_id: `test${i}`, correlation_id: `bench-platform-${i}` },
      { correlation_id: `bench-empty-${i}` }
    ];

    const scenario = scenarios[i % 4];
    await testT1API(`Failure-${i}`, scenario);

    await new Promise(resolve => setTimeout(resolve, 100));
  }

  // 3. Circuit Breaker 복구 테스트
  console.log("🔄 Circuit Breaker 복구 테스트...");
  await new Promise(resolve => setTimeout(resolve, 65000)); // 1분 대기

  for (let i = 1; i <= 5; i++) {
    await testT1API(`Recovery-${i}`, {
      platform: 'youtube',
      content_id: `recovery-test-${i}`,
      source_url: `https://youtube.com/shorts/recovery${i}`,
      language: 'ko',
      video_origin: 'social_media',
      correlation_id: `bench-recovery-${i}`
    });

    await new Promise(resolve => setTimeout(resolve, 500));
  }

  // 4. 최종 결과 출력
  const finalMetrics = monitor.exportMetrics();
  console.log("📊 최종 벤치마크 결과:");
  console.log(JSON.stringify(finalMetrics, null, 2));

  console.log("✅ T3 Circuit Breaker + DLQ 벤치마크 완료");
  console.log("📁 결과 파일: dlq-benchmark-results.csv, circuit-breaker-metrics.json");
}

// Node.js fetch 폴리필
const fetch = (() => {
  try {
    return require('node-fetch');
  } catch (e) {
    try {
      return global.fetch;
    } catch (e2) {
      console.log('⚠️ fetch not available - using basic HTTP implementation');
      return null;
    }
  }
})();

// fetch가 없으면 기본 HTTP로 대체
if (!fetch) {
  global.fetch = async (url, options = {}) => {
    return new Promise((resolve, reject) => {
      const urlObj = new URL(url);
      const req = http.request({
        hostname: urlObj.hostname,
        port: urlObj.port,
        path: urlObj.pathname,
        method: options.method || 'GET',
        headers: options.headers || {}
      }, (res) => {
        resolve({
          ok: res.statusCode >= 200 && res.statusCode < 300,
          status: res.statusCode,
          text: () => Promise.resolve('')
        });
      });

      req.on('error', reject);
      if (options.body) {
        req.write(options.body);
      }
      req.end();
    });
  };
}

// 벤치마크 실행
runBenchmark().catch(console.error);