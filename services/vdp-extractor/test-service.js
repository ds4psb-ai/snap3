/**
 * Simple test script for VDP Extractor Service
 * Usage: node test-service.js
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:3001';

// Test URLs
const TEST_URLS = {
  youtube: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', // Rick Roll - always available
  youtubeShorts: 'https://www.youtube.com/shorts/WrnM0FRLnqA', // Example from snap3
};

async function testEndpoint(name, url, data = null, method = 'GET') {
  console.log(`\n🧪 Testing ${name}...`);
  
  try {
    const config = {
      method,
      url: `${BASE_URL}${url}`,
      timeout: 30000,
    };

    if (data) {
      config.data = data;
      config.headers = { 'Content-Type': 'application/json' };
    }

    const response = await axios(config);
    
    console.log(`✅ ${name} - Status: ${response.status}`);
    
    if (response.data) {
      if (response.data.success !== undefined) {
        console.log(`   Success: ${response.data.success}`);
        if (response.data.meta) {
          console.log(`   Processing Time: ${response.data.meta.processingTime}ms`);
        }
        if (response.data.error) {
          console.log(`   Error: ${response.data.error.message}`);
        }
      }
      
      // Show some data structure for successful VDP extractions
      if (response.data.data && response.data.data.contentId) {
        const vdp = response.data.data;
        console.log(`   Content ID: ${vdp.contentId}`);
        console.log(`   Platform: ${vdp.platform}`);
        if (vdp.engagement) {
          console.log(`   Views: ${vdp.engagement.viewCount?.toLocaleString() || vdp.view_count?.toLocaleString()}`);
          console.log(`   Likes: ${vdp.engagement.likeCount?.toLocaleString() || vdp.like_count?.toLocaleString()}`);
        }
        if (vdp.confidence) {
          console.log(`   Confidence: ${Math.round(vdp.confidence.overall * 100)}%`);
        }
      }
    }
    
    return true;
  } catch (error) {
    console.log(`❌ ${name} - Error: ${error.response?.status || 'Network'} ${error.response?.data?.error?.message || error.message}`);
    return false;
  }
}

async function runTests() {
  console.log('🚀 VDP Extractor Service Test Suite\n');
  console.log('Testing against:', BASE_URL);
  
  const results = [];

  // Test 1: Health Check
  results.push(await testEndpoint('Health Check', '/health'));

  // Test 2: Service Info
  results.push(await testEndpoint('Service Info', '/api/v1/info'));

  // Test 3: Metrics
  results.push(await testEndpoint('Metrics', '/api/v1/metrics'));

  // Test 4: Basic VDP Extraction (GET)
  results.push(await testEndpoint(
    'Basic VDP Extraction (GET)', 
    `/api/v1/extract?url=${encodeURIComponent(TEST_URLS.youtube)}`
  ));

  // Test 5: Basic VDP Extraction (POST)
  results.push(await testEndpoint(
    'Basic VDP Extraction (POST)', 
    '/api/v1/extract',
    { url: TEST_URLS.youtube },
    'POST'
  ));

  // Test 6: VDP Extraction with Comments
  results.push(await testEndpoint(
    'VDP Extraction with Comments', 
    '/api/v1/extract',
    { 
      url: TEST_URLS.youtube,
      options: {
        maxComments: 5,
        includeContentAnalysis: false
      }
    },
    'POST'
  ));

  // Test 7: Deep Analysis (if API keys are configured)
  console.log('\n⚠️  Deep analysis test requires valid API keys...');
  results.push(await testEndpoint(
    'Deep Analysis VDP Extraction', 
    '/api/v1/extract',
    { 
      url: TEST_URLS.youtube,
      options: {
        deepAnalysis: true,
        maxComments: 3,
        includeContentAnalysis: true,
        includeViralFactors: true
      }
    },
    'POST'
  ));

  // Test 8: Batch Extraction
  results.push(await testEndpoint(
    'Batch VDP Extraction', 
    '/api/v1/extract/batch',
    { 
      urls: [TEST_URLS.youtube],
      options: {
        maxComments: 2
      }
    },
    'POST'
  ));

  // Test 9: Invalid URL
  results.push(await testEndpoint(
    'Invalid URL (Expected Failure)', 
    '/api/v1/extract',
    { url: 'https://invalid-platform.com/video/123' },
    'POST'
  ));

  // Test 10: Missing URL
  results.push(await testEndpoint(
    'Missing URL (Expected Failure)', 
    '/api/v1/extract',
    {},
    'POST'
  ));

  // Summary
  const passed = results.filter(r => r).length;
  const total = results.length;
  
  console.log('\n📊 Test Results Summary');
  console.log('=' .repeat(50));
  console.log(`Passed: ${passed}/${total} tests`);
  console.log(`Success Rate: ${Math.round((passed / total) * 100)}%`);
  
  if (passed === total) {
    console.log('🎉 All tests passed!');
  } else if (passed >= total - 2) {
    console.log('✅ Most tests passed (some expected failures)');
  } else {
    console.log('⚠️  Some tests failed - check configuration');
  }

  console.log('\n💡 Note: Some tests may fail if API keys are not configured');
  console.log('   Configure GEMINI_API_KEY and YOUTUBE_API_KEY in .env file');
}

// Check if server is running first
async function checkServerHealth() {
  try {
    await axios.get(`${BASE_URL}/health`, { timeout: 5000 });
    return true;
  } catch (error) {
    console.log('❌ Server is not running or not accessible');
    console.log('   Make sure to start the server first: npm run dev');
    return false;
  }
}

// Main execution
async function main() {
  const serverRunning = await checkServerHealth();
  
  if (serverRunning) {
    await runTests();
  } else {
    console.log('\n🚀 To start the server:');
    console.log('   cd /Users/ted/snap3/services/vdp-extractor');
    console.log('   npm install');
    console.log('   cp .env.example .env  # and configure API keys');
    console.log('   npm run dev');
  }
}

if (require.main === module) {
  main().catch(console.error);
}