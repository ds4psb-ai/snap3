const { httpLatency, vdpProcessingLatency, registry } = require('../libs/metrics.js');

console.log('🎯 T3 VDP 메트릭 실시간 수집 시작...');
console.log('📊 메모리 베이스라인:', process.memoryUsage());

let intervalCount = 0;

const monitorInterval = setInterval(async () => {
  intervalCount++;
  console.log(`\n📊 VDP 메트릭 현황 [${intervalCount}] - ${new Date().toLocaleTimeString()}`);
  
  try {
    // 전체 메트릭 레지스트리에서 데이터 추출
    const metrics = await registry.metrics();
    
    // HTTP 지연시간 메트릭 추출
    const httpMetrics = metrics.match(/http_request_duration_seconds.*\n/g);
    if (httpMetrics && httpMetrics.length > 0) {
      console.log('📈 HTTP 지연시간 메트릭:');
      httpMetrics.slice(0, 3).forEach(metric => console.log('  ', metric.trim()));
    } else {
      console.log('📈 HTTP 지연시간: 아직 요청 없음');
    }
    
    // VDP 처리시간 메트릭 추출  
    const vdpMetrics = metrics.match(/vdp_processing_duration_seconds.*\n/g);
    if (vdpMetrics && vdpMetrics.length > 0) {
      console.log('⚡ VDP 처리시간 메트릭:');
      vdpMetrics.slice(0, 3).forEach(metric => console.log('  ', metric.trim()));
    } else {
      console.log('⚡ VDP 처리시간: 아직 처리 없음');
    }
    
    // 메모리 사용량
    const memory = process.memoryUsage();
    console.log('💾 메모리 사용량:');
    console.log(`   RSS: ${(memory.rss / 1024 / 1024).toFixed(1)}MB`);
    console.log(`   Heap Used: ${(memory.heapUsed / 1024 / 1024).toFixed(1)}MB`);
    console.log(`   External: ${(memory.external / 1024 / 1024).toFixed(1)}MB`);
    
  } catch (error) {
    console.log('❌ 메트릭 수집 오류:', error.message);
  }
}, 15000);

// 5분 후 자동 종료
setTimeout(() => {
  console.log('\n🏁 T3 VDP 메트릭 모니터링 완료');
  clearInterval(monitorInterval);
  process.exit(0);
}, 300000);

// 프로세스 종료 시 정리
process.on('SIGINT', () => {
  console.log('\n🛑 T3 VDP 메트릭 모니터링 수동 종료');
  clearInterval(monitorInterval);
  process.exit(0);
});