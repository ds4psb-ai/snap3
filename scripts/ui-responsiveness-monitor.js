#!/usr/bin/env node

/**
 * UI Responsiveness Monitor
 * 사용자 경험 관점에서 UI 응답성 측정
 */

const { performance } = require('perf_hooks');

class UIResponsivenessMonitor {
  constructor() {
    this.metrics = {
      formAutoFill: [],
      buttonResponse: [],
      errorHandling: [],
      loadingStates: []
    };
  }

  // 폼 자동 채우기 성능 측정
  async measureFormAutoFill(url, platform) {
    console.log(`📝 폼 자동 채우기 테스트: ${platform}`);
    
    const startTime = performance.now();
    
    try {
      // 메타데이터 추출 요청
      const response = await fetch(`http://localhost:3000/api/${platform}/metadata`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url })
      });
      
      const data = await response.json();
      const endTime = performance.now();
      
      const result = {
        platform,
        success: response.ok,
        duration: endTime - startTime,
        fieldsCount: this.countAutoFilledFields(data),
        timestamp: new Date().toISOString()
      };
      
      this.metrics.formAutoFill.push(result);
      
      console.log(`  ${platform} 자동 채우기: ${result.duration.toFixed(2)}ms (${result.fieldsCount}개 필드)`);
      return result;
      
    } catch (error) {
      const endTime = performance.now();
      const result = {
        platform,
        success: false,
        duration: endTime - startTime,
        error: error.message,
        timestamp: new Date().toISOString()
      };
      
      this.metrics.formAutoFill.push(result);
      console.log(`  ❌ ${platform} 실패: ${error.message}`);
      return result;
    }
  }

  countAutoFilledFields(data) {
    if (!data) return 0;
    
    let count = 0;
    const fields = ['like_count', 'comment_count', 'view_count', 'author', 'upload_date', 'hashtags'];
    
    fields.forEach(field => {
      if (data[field] !== null && data[field] !== undefined && data[field] !== '') {
        count++;
      }
    });
    
    return count;
  }

  // 버튼 응답성 측정
  async measureButtonResponse() {
    console.log('🔘 버튼 응답성 테스트...');
    
    const buttons = [
      { name: '메타데이터 추출', endpoint: '/api/instagram/metadata' },
      { name: '비디오 다운로드', endpoint: '/api/instagram/download' },
      { name: '헬스 체크', endpoint: '/healthz' }
    ];
    
    for (const button of buttons) {
      const startTime = performance.now();
      
      try {
        const response = await fetch(`http://localhost:3000${button.endpoint}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: 'https://www.instagram.com/p/test123/' })
        });
        
        const endTime = performance.now();
        
        const result = {
          button: button.name,
          success: response.ok,
          duration: endTime - startTime,
          status: response.status
        };
        
        this.metrics.buttonResponse.push(result);
        console.log(`  ${button.name}: ${result.duration.toFixed(2)}ms`);
        
      } catch (error) {
        const endTime = performance.now();
        console.log(`  ❌ ${button.name}: ${error.message}`);
      }
    }
  }

  // 에러 처리 응답성 측정
  async measureErrorHandling() {
    console.log('⚠️ 에러 처리 응답성 테스트...');
    
    const errorCases = [
      { name: '잘못된 URL', url: 'invalid-url' },
      { name: '존재하지 않는 포스트', url: 'https://www.instagram.com/p/nonexistent/' },
      { name: '빈 요청', url: '' }
    ];
    
    for (const errorCase of errorCases) {
      const startTime = performance.now();
      
      try {
        const response = await fetch('http://localhost:3000/api/instagram/metadata', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: errorCase.url })
        });
        
        const endTime = performance.now();
        
        const result = {
          case: errorCase.name,
          duration: endTime - startTime,
          status: response.status,
          hasErrorMessage: response.status >= 400
        };
        
        this.metrics.errorHandling.push(result);
        console.log(`  ${errorCase.name}: ${result.duration.toFixed(2)}ms (${result.status})`);
        
      } catch (error) {
        const endTime = performance.now();
        console.log(`  ❌ ${errorCase.name}: ${error.message}`);
      }
    }
  }

  // 로딩 상태 측정
  async measureLoadingStates() {
    console.log('⏳ 로딩 상태 응답성 테스트...');
    
    // 긴 작업 시뮬레이션
    const longTasks = [
      { name: 'TikTok 메타데이터', url: 'https://www.tiktok.com/@test/video/123456789', platform: 'tiktok' },
      { name: 'Instagram 다운로드', url: 'https://www.instagram.com/p/test123/', endpoint: '/download' }
    ];
    
    for (const task of longTasks) {
      const startTime = performance.now();
      
      try {
        const endpoint = task.endpoint || '/metadata';
        const response = await fetch(`http://localhost:3000/api/${task.platform}${endpoint}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: task.url })
        });
        
        const endTime = performance.now();
        
        const result = {
          task: task.name,
          duration: endTime - startTime,
          success: response.ok,
          hasLoadingState: true // UI에서 로딩 상태 표시 여부는 별도 체크 필요
        };
        
        this.metrics.loadingStates.push(result);
        console.log(`  ${task.name}: ${result.duration.toFixed(2)}ms`);
        
      } catch (error) {
        const endTime = performance.now();
        console.log(`  ❌ ${task.name}: ${error.message}`);
      }
    }
  }

  // 전체 UI 응답성 테스트 실행
  async runFullTest() {
    console.log('🎯 UI 응답성 모니터링 시작!\n');
    
    // 1. 폼 자동 채우기
    await this.measureFormAutoFill('https://www.instagram.com/p/test123/', 'instagram');
    await this.measureFormAutoFill('https://www.tiktok.com/@test/video/123456789', 'tiktok');
    
    console.log();
    
    // 2. 버튼 응답성
    await this.measureButtonResponse();
    
    console.log();
    
    // 3. 에러 처리
    await this.measureErrorHandling();
    
    console.log();
    
    // 4. 로딩 상태
    await this.measureLoadingStates();
    
    // 결과 출력
    this.printResults();
  }

  printResults() {
    console.log('\n📊 UI 응답성 결과 요약:');
    console.log('================================');
    
    // 폼 자동 채우기
    if (this.metrics.formAutoFill.length > 0) {
      console.log('\n📝 폼 자동 채우기:');
      this.metrics.formAutoFill.forEach(result => {
        const status = result.success ? '✅' : '❌';
        console.log(`${status} ${result.platform}: ${result.duration.toFixed(2)}ms (${result.fieldsCount || 0}개 필드)`);
      });
    }
    
    // 버튼 응답성
    if (this.metrics.buttonResponse.length > 0) {
      console.log('\n🔘 버튼 응답성:');
      const avgResponse = this.metrics.buttonResponse.reduce((sum, r) => sum + r.duration, 0) / this.metrics.buttonResponse.length;
      console.log(`평균 응답시간: ${avgResponse.toFixed(2)}ms`);
    }
    
    // 에러 처리
    if (this.metrics.errorHandling.length > 0) {
      console.log('\n⚠️ 에러 처리:');
      const avgError = this.metrics.errorHandling.reduce((sum, r) => sum + r.duration, 0) / this.metrics.errorHandling.length;
      console.log(`평균 에러 응답: ${avgError.toFixed(2)}ms`);
    }
    
    // UX 기준 체크
    console.log('\n🎯 UX 기준 체크:');
    const formAvg = this.metrics.formAutoFill.reduce((sum, r) => sum + r.duration, 0) / this.metrics.formAutoFill.length;
    const buttonAvg = this.metrics.buttonResponse.reduce((sum, r) => sum + r.duration, 0) / this.metrics.buttonResponse.length;
    
    console.log(`폼 자동 채우기 < 2000ms: ${formAvg < 2000 ? '✅' : '❌'} (${formAvg.toFixed(2)}ms)`);
    console.log(`버튼 응답 < 500ms: ${buttonAvg < 500 ? '✅' : '❌'} (${buttonAvg.toFixed(2)}ms)`);
    console.log(`에러 처리 즉시 표시: ${this.metrics.errorHandling.every(r => r.hasErrorMessage) ? '✅' : '❌'}`);
  }
}

// 실행
if (require.main === module) {
  const monitor = new UIResponsivenessMonitor();
  monitor.runFullTest().catch(console.error);
}

module.exports = UIResponsivenessMonitor;
