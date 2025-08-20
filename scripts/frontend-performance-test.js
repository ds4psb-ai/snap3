#!/usr/bin/env node

/**
 * Frontend Performance Test Script
 * localhost:3000 ↔ 8080 최적화 체감 테스트
 */

const https = require('https');
const http = require('http');
const { performance } = require('perf_hooks');

class FrontendPerformanceTester {
  constructor() {
    this.results = {
      coldStart: [],
      warmCache: [],
      keepAlive: [],
      metadata: []
    };
    
    // Keep-Alive Agent 준비
    this.keepAliveAgent = new http.Agent({
      keepAlive: true,
      maxSockets: 50,
      timeout: 2000
    });
  }

  async measureRequest(url, options = {}) {
    const startTime = performance.now();
    
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);
      
      const response = await fetch(url, {
        ...options,
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      const endTime = performance.now();
      
      return {
        success: true,
        duration: endTime - startTime,
        status: response.status,
        size: response.headers.get('content-length') || 0
      };
    } catch (error) {
      const endTime = performance.now();
      return {
        success: false,
        duration: endTime - startTime,
        error: error.message
      };
    }
  }

  async testColdStart() {
    console.log('🧊 Cold Start 테스트...');
    
    // 8080 서버 health check
    const result = await this.measureRequest('http://localhost:8080/healthz');
    this.results.coldStart.push(result);
    
    console.log(`Cold Start: ${result.duration.toFixed(2)}ms`);
    return result;
  }

  async testWarmCache() {
    console.log('🔥 Warm Cache 테스트...');
    
    // 동일한 요청을 5번 반복
    for (let i = 0; i < 5; i++) {
      const result = await this.measureRequest('http://localhost:8080/healthz');
      this.results.warmCache.push(result);
      console.log(`Warm ${i+1}: ${result.duration.toFixed(2)}ms`);
    }
    
    const avgWarm = this.results.warmCache.reduce((sum, r) => sum + r.duration, 0) / this.results.warmCache.length;
    console.log(`평균 Warm Cache: ${avgWarm.toFixed(2)}ms`);
    
    return avgWarm;
  }

  async testMetadataExtraction() {
    console.log('📊 메타데이터 추출 성능 테스트...');
    
    const testUrls = [
      'https://www.instagram.com/p/test123/',
      'https://www.tiktok.com/@test/video/123456789'
    ];
    
    for (const url of testUrls) {
      const platform = url.includes('instagram') ? 'instagram' : 'tiktok';
      
      const result = await this.measureRequest(`http://localhost:3000/api/${platform}/metadata`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url })
      });
      
      this.results.metadata.push({
        platform,
        url,
        ...result
      });
      
      console.log(`${platform}: ${result.duration.toFixed(2)}ms`);
    }
  }

  async test8080To3000Bridge() {
    console.log('🌉 8080 → 3000 브리지 테스트...');
    
    const result = await this.measureRequest('http://localhost:8080/api/extract-social-metadata', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url: 'https://www.instagram.com/p/test123/',
        platform: 'instagram'
      })
    });
    
    console.log(`브리지 연동: ${result.duration.toFixed(2)}ms`);
    return result;
  }

  async runFullTest() {
    console.log('🚀 Frontend Performance Test 시작!\n');
    
    // 1. Cold Start
    await this.testColdStart();
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // 2. Warm Cache
    await this.testWarmCache();
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // 3. Metadata Extraction
    await this.testMetadataExtraction();
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // 4. Bridge Test
    await this.test8080To3000Bridge();
    
    // 결과 출력
    this.printResults();
  }

  printResults() {
    console.log('\n📊 테스트 결과 요약:');
    console.log('================================');
    
    if (this.results.coldStart.length > 0) {
      const coldAvg = this.results.coldStart[0].duration;
      console.log(`Cold Start: ${coldAvg.toFixed(2)}ms`);
    }
    
    if (this.results.warmCache.length > 0) {
      const warmAvg = this.results.warmCache.reduce((sum, r) => sum + r.duration, 0) / this.results.warmCache.length;
      console.log(`Warm Cache: ${warmAvg.toFixed(2)}ms`);
      
      if (this.results.coldStart.length > 0) {
        const improvement = ((this.results.coldStart[0].duration - warmAvg) / this.results.coldStart[0].duration * 100);
        console.log(`캐시 개선율: ${improvement.toFixed(1)}%`);
      }
    }
    
    console.log('\n메타데이터 추출:');
    this.results.metadata.forEach(result => {
      const status = result.success ? '✅' : '❌';
      console.log(`${status} ${result.platform}: ${result.duration.toFixed(2)}ms`);
    });
    
    // 성능 기준 체크
    console.log('\n🎯 성능 기준 체크:');
    const warmAvg = this.results.warmCache.reduce((sum, r) => sum + r.duration, 0) / this.results.warmCache.length;
    
    console.log(`Warm Cache < 50ms: ${warmAvg < 50 ? '✅' : '❌'} (${warmAvg.toFixed(2)}ms)`);
    console.log(`메타데이터 < 3000ms: ${this.results.metadata.every(r => r.duration < 3000) ? '✅' : '❌'}`);
  }
}

// 실행
if (require.main === module) {
  const tester = new FrontendPerformanceTester();
  tester.runFullTest().catch(console.error);
}

module.exports = FrontendPerformanceTester;
