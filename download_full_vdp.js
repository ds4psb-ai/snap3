const https = require('https');
const fs = require('fs');

const postData = JSON.stringify({
  "gcsUri": "gs://tough-variety-raw/raw/ingest/6_I2FmT1mbY.mp4",
  "meta": {
    "platform": "youtube",
    "language": "ko",
    "source_url": "https://www.youtube.com/shorts/6_I2FmT1mbY"
  }
});

const options = {
  hostname: 't2-vdp-355516763169.us-central1.run.app',
  port: 443,
  path: '/api/vdp/extract-vertex',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(postData)
  },
  timeout: 900000  // 15분
};

console.log('🚀 Node.js로 VDP 다운로드 시작...');
console.log('⏳ 최대 15분 대기...');

const req = https.request(options, (res) => {
  console.log(`✅ HTTP Status: ${res.statusCode}`);
  
  let data = '';
  
  res.on('data', (chunk) => {
    data += chunk;
    process.stdout.write('.');
  });
  
  res.on('end', () => {
    console.log('\n📁 응답 완료, 파일 저장 중...');
    
    try {
      const vdpData = JSON.parse(data);
      fs.writeFileSync('/Users/ted/snap3/out/vdp/NODE_FULL_VDP.json', JSON.stringify(vdpData, null, 2));
      
      console.log('🎉 VDP 파일 저장 완료!');
      console.log(`📊 파일 크기: ${Buffer.byteLength(data)} bytes`);
      
      if (vdpData.google_vdp_quality) {
        console.log('📈 품질 정보:');
        console.log(`   Scenes: ${vdpData.google_vdp_quality.scenes_count}`);
        console.log(`   Shots: ${vdpData.google_vdp_quality.shots_count}`);
        console.log(`   Keyframes: ${vdpData.google_vdp_quality.keyframes_count}`);
      }
      
      if (vdpData.hook_genome) {
        console.log('🎯 Hook:');
        console.log(`   Pattern: ${vdpData.hook_genome.pattern_code}`);
        console.log(`   Strength: ${vdpData.hook_genome.strength_score}`);
      }
      
    } catch (e) {
      console.log('❌ JSON 파싱 실패, 원본 저장');
      fs.writeFileSync('/Users/ted/snap3/out/vdp/NODE_RAW_VDP.txt', data);
    }
  });
});

req.on('error', (e) => {
  console.error(`💥 오류: ${e.message}`);
});

req.on('timeout', () => {
  console.log('⏰ 타임아웃 발생');
  req.destroy();
});

req.write(postData);
req.end();
