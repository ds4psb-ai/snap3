#!/usr/bin/env node

/**
 * Metadata Performance Monitor
 * Instagram/TikTok 메타데이터 추출 성능 모니터링
 */

const { performance } = require('perf_hooks');
const fs = require('fs').promises;

class MetadataPerformanceMonitor {
  constructor() {
    this.results = {
      instagram: [],
      tiktok: [],
      errors: [],
      successRates: {}
    };
    
    this.testUrls = {
      instagram: [
        'https://www.instagram.com/p/test123/',
        'https://www.instagram.com/p/test456/',
        'https://www.instagram.com/p/test789/'
      ],
      tiktok: [
        'https://www.tiktok.com/@test/video/123456789',
        'https://www.tiktok.com/@test/video/987654321',
        'https://www.tiktok.com/@test/video/555666777'
      ]
    };
  }

  async measureMetadataExtraction(platform, url, attempt = 1) {
    const startTime = performance.now();
    
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10초 타임아웃
      
      const response = await fetch(`http://localhost:3000/api/${platform}/metadata`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
        },
        body: JSON.stringify({ url }),
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      const data = await response.json();
      const endTime = performance.now();
      
      const result = {
        platform,
        url: url.substring(0, 50) + '...',
        attempt,
        success: response.ok,
        duration: endTime - startTime,
        status: response.status,
        extractedFields: this.analyzeExtractedData(data),
        timestamp: new Date().toISOString()
      };
      
      this.results[platform].push(result);
      
      const status = result.success ? '✅' : '❌';
      console.log(`${status} ${platform} #${attempt}: ${result.duration.toFixed(2)}ms (${result.extractedFields.total}개 필드)`);
      
      return result;
      
    } catch (error) {
      const endTime = performance.now();
      const result = {
        platform,
        url: url.substring(0, 50) + '...',
        attempt,
        success: false,
        duration: endTime - startTime,
        error: error.message,
        timestamp: new Date().toISOString()
      };
      
      this.results.errors.push(result);
      console.log(`❌ ${platform} #${attempt}: ${error.message} (${result.duration.toFixed(2)}ms)`);
      
      return result;
    }
  }

  analyzeExtractedData(data) {
    const analysis = {
      total: 0,
      successful: 0,
      fields: {}
    };
    
    const expectedFields = {
      instagram: ['like_count', 'comment_count', 'author', 'upload_date', 'hashtags'],
      tiktok: ['view_count', 'like_count', 'comment_count', 'share_count', 'author', 'upload_date']
    };
    
    if (!data) return analysis;
    
    const platform = data.view_count !== undefined ? 'tiktok' : 'instagram';
    const fields = expectedFields[platform] || [];
    
    fields.forEach(field => {
      analysis.total++;
      const value = data[field];
      const hasValue = value !== null && value !== undefined && value !== '' && value !== 0;
      
      if (hasValue) {
        analysis.successful++;
      }
      
      analysis.fields[field] = {
        hasValue,
        value: hasValue ? value : null,
        type: typeof value
      };
    });
    
    return analysis;
  }

  async testPlatformPerformance(platform, iterations = 3) {
    console.log(`\n📊 ${platform.toUpperCase()} 성능 테스트 (${iterations}회 반복)`);
    console.log('================================================');
    
    const urls = this.testUrls[platform];
    
    for (let i = 0; i < iterations; i++) {
      console.log(`\n🔄 ${platform} 라운드 ${i + 1}:`);
      
      for (const url of urls) {
        await this.measureMetadataExtraction(platform, url, i + 1);
        // 요청 간 간격 (1초)
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
  }

  async testConcurrentExtraction(platform, concurrency = 3) {
    console.log(`\n⚡ ${platform.toUpperCase()} 동시 추출 테스트 (${concurrency}개 동시)`);
    console.log('================================================');
    
    const urls = this.testUrls[platform].slice(0, concurrency);
    const startTime = performance.now();
    
    const promises = urls.map((url, index) => 
      this.measureMetadataExtraction(platform, url, `concurrent-${index + 1}`)
    );
    
    const results = await Promise.allSettled(promises);
    const endTime = performance.now();
    
    console.log(`총 동시 처리 시간: ${(endTime - startTime).toFixed(2)}ms`);
    
    return results;
  }

  calculateSuccessRate(platform) {
    const platformResults = this.results[platform];
    if (platformResults.length === 0) return 0;
    
    const successful = platformResults.filter(r => r.success).length;
    return (successful / platformResults.length) * 100;
  }

  calculateAveragePerformance(platform) {
    const platformResults = this.results[platform].filter(r => r.success);
    if (platformResults.length === 0) return null;
    
    const totalDuration = platformResults.reduce((sum, r) => sum + r.duration, 0);
    const totalFields = platformResults.reduce((sum, r) => sum + r.extractedFields.successful, 0);
    
    return {
      avgDuration: totalDuration / platformResults.length,
      avgFieldsExtracted: totalFields / platformResults.length,
      p50: this.calculatePercentile(platformResults.map(r => r.duration), 0.5),
      p95: this.calculatePercentile(platformResults.map(r => r.duration), 0.95)
    };
  }

  calculatePercentile(values, percentile) {
    const sorted = values.sort((a, b) => a - b);
    const index = Math.ceil(sorted.length * percentile) - 1;
    return sorted[index];
  }

  async runFullTest() {
    console.log('🚀 메타데이터 추출 성능 모니터링 시작!\n');
    
    // 1. Instagram 성능 테스트
    await this.testPlatformPerformance('instagram', 2);
    
    // 2. TikTok 성능 테스트  
    await this.testPlatformPerformance('tiktok', 2);
    
    // 3. 동시 추출 테스트
    await this.testConcurrentExtraction('instagram', 2);
    await this.testConcurrentExtraction('tiktok', 2);
    
    // 결과 분석 및 출력
    await this.printResults();
    await this.saveResults();
  }

  async printResults() {
    console.log('\n📊 메타데이터 추출 성능 결과:');
    console.log('================================');
    
    ['instagram', 'tiktok'].forEach(platform => {
      const successRate = this.calculateSuccessRate(platform);
      const performance = this.calculateAveragePerformance(platform);
      
      console.log(`\n${platform.toUpperCase()}:`);
      console.log(`성공률: ${successRate.toFixed(1)}%`);
      
      if (performance) {
        console.log(`평균 응답시간: ${performance.avgDuration.toFixed(2)}ms`);
        console.log(`P50: ${performance.p50.toFixed(2)}ms`);
        console.log(`P95: ${performance.p95.toFixed(2)}ms`);
        console.log(`평균 추출 필드: ${performance.avgFieldsExtracted.toFixed(1)}개`);
      }
    });
    
    // 에러 분석
    if (this.results.errors.length > 0) {
      console.log('\n⚠️ 에러 분석:');
      const errorTypes = {};
      this.results.errors.forEach(error => {
        const type = error.error || 'Unknown';
        errorTypes[type] = (errorTypes[type] || 0) + 1;
      });
      
      Object.entries(errorTypes).forEach(([type, count]) => {
        console.log(`${type}: ${count}회`);
      });
    }
    
    // 성능 기준 체크
    console.log('\n🎯 성능 기준 체크:');
    
    ['instagram', 'tiktok'].forEach(platform => {
      const successRate = this.calculateSuccessRate(platform);
      const performance = this.calculateAveragePerformance(platform);
      
      console.log(`\n${platform}:`);
      console.log(`성공률 > 90%: ${successRate > 90 ? '✅' : '❌'} (${successRate.toFixed(1)}%)`);
      
      if (performance) {
        console.log(`평균 < 3000ms: ${performance.avgDuration < 3000 ? '✅' : '❌'} (${performance.avgDuration.toFixed(2)}ms)`);
        console.log(`P95 < 5000ms: ${performance.p95 < 5000 ? '✅' : '❌'} (${performance.p95.toFixed(2)}ms)`);
        console.log(`필드 추출 > 80%: ${performance.avgFieldsExtracted > 4 ? '✅' : '❌'} (${performance.avgFieldsExtracted.toFixed(1)}개)`);
      }
    });
  }

  async saveResults() {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `metadata-performance-${timestamp}.json`;
    
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        instagram: {
          successRate: this.calculateSuccessRate('instagram'),
          performance: this.calculateAveragePerformance('instagram')
        },
        tiktok: {
          successRate: this.calculateSuccessRate('tiktok'),
          performance: this.calculateAveragePerformance('tiktok')
        }
      },
      details: this.results
    };
    
    try {
      await fs.writeFile(`logs/${filename}`, JSON.stringify(report, null, 2));
      console.log(`\n💾 결과 저장: logs/${filename}`);
    } catch (error) {
      console.log(`\n⚠️ 결과 저장 실패: ${error.message}`);
    }
  }
}

// 실행
if (require.main === module) {
  const monitor = new MetadataPerformanceMonitor();
  monitor.runFullTest().catch(console.error);
}

module.exports = MetadataPerformanceMonitor;
