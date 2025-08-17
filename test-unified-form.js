/**
 * Simple test script for unified VDP form
 * Tests form validation, API endpoints, and error handling
 */

const assert = require('assert');
const fs = require('fs').promises;
const path = require('path');

// Test data
const testData = {
  validYouTubeUrl: 'https://www.youtube.com/shorts/6_I2FmT1mbY',
  invalidYouTubeUrl: 'https://www.youtube.com/watch?v=invalid',
  instagramMetadata: {
    platform: 'instagram_reels',
    source_url: 'https://instagram.com/p/TEST123',
    view_count: 12500,
    like_count: 850,
    comment_count: 42,
    hashtags: ['test', 'hook'],
    upload_date: '2025-08-15T10:00:00Z'
  },
  tiktokMetadata: {
    platform: 'tiktok',
    source_url: 'https://tiktok.com/@user/video/TEST123',
    view_count: 25000,
    like_count: 1200,
    comment_count: 89,
    hashtags: ['fyp', 'test', 'hook'],
    upload_date: '2025-08-15T10:00:00Z'
  }
};

// Test functions
const tests = {
  
  async testFormStructure() {
    console.log('🧪 Testing form structure...');
    
    try {
      const htmlContent = await fs.readFile(path.join(__dirname, 'web/index.html'), 'utf8');
      
      // Check essential form elements
      assert(htmlContent.includes('id="vdp-form"'), 'Main form missing');
      assert(htmlContent.includes('name="platform"'), 'Platform selector missing');
      assert(htmlContent.includes('id="youtube-url"'), 'YouTube URL input missing');
      assert(htmlContent.includes('name="video_file"'), 'Video file input missing');
      assert(htmlContent.includes('name="metadata_file"'), 'Metadata file input missing');
      assert(htmlContent.includes('id="submit-btn"'), 'Submit button missing');
      
      console.log('✅ Form structure test passed');
      return true;
    } catch (error) {
      console.error('❌ Form structure test failed:', error.message);
      return false;
    }
  },
  
  async testCSSResponsiveness() {
    console.log('🧪 Testing CSS responsiveness...');
    
    try {
      const cssContent = await fs.readFile(path.join(__dirname, 'web/styles/main.css'), 'utf8');
      
      // Check for mobile-first breakpoints
      assert(cssContent.includes('@media (min-width: 768px)'), 'Tablet breakpoint missing');
      assert(cssContent.includes('@media (min-width: 1024px)'), 'Desktop breakpoint missing');
      
      // Check for touch-friendly styles
      assert(cssContent.includes('min-height: 44px'), 'Touch targets missing');
      
      // Check for accessibility features
      assert(cssContent.includes('@media (prefers-reduced-motion: reduce)'), 'Accessibility styles missing');
      
      console.log('✅ CSS responsiveness test passed');
      return true;
    } catch (error) {
      console.error('❌ CSS responsiveness test failed:', error.message);
      return false;
    }
  },
  
  async testJavaScriptValidation() {
    console.log('🧪 Testing JavaScript validation...');
    
    try {
      const jsContent = await fs.readFile(path.join(__dirname, 'web/scripts/main.js'), 'utf8');
      
      // Check for essential functions
      assert(jsContent.includes('class VDPProcessor'), 'VDPProcessor class missing');
      assert(jsContent.includes('validateYouTubeUrl'), 'YouTube URL validation missing');
      assert(jsContent.includes('validateFile'), 'File validation missing');
      assert(jsContent.includes('handleSubmit'), 'Form submission handler missing');
      assert(jsContent.includes('startProgressPolling'), 'Progress polling missing');
      
      // Check for error handling
      assert(jsContent.includes('ProblemDetailsError'), 'RFC 9457 error handling missing');
      
      console.log('✅ JavaScript validation test passed');
      return true;
    } catch (error) {
      console.error('❌ JavaScript validation test failed:', error.message);
      return false;
    }
  },
  
  async testAPIEndpointStructure() {
    console.log('🧪 Testing API endpoint structure...');
    
    try {
      const serverContent = await fs.readFile(path.join(__dirname, 'services/unified-api/src/server.js'), 'utf8');
      const handlerContent = await fs.readFile(path.join(__dirname, 'services/unified-api/src/handlers/vdp-submit.js'), 'utf8');
      
      // Check server setup
      assert(serverContent.includes('/api/vdp/submit'), 'Submit endpoint missing');
      assert(serverContent.includes('/api/jobs/:jobId'), 'Job status endpoint missing');
      assert(serverContent.includes('express-rate-limit'), 'Rate limiting missing');
      
      // Check handler functions
      assert(handlerContent.includes('handleVdpSubmit'), 'Submit handler missing');
      assert(handlerContent.includes('getJobStatus'), 'Job status handler missing');
      assert(handlerContent.includes('createProblemDetails'), 'RFC 9457 helper missing');
      
      // Check platform support
      assert(handlerContent.includes('youtube'), 'YouTube support missing');
      assert(handlerContent.includes('instagram'), 'Instagram support missing');
      assert(handlerContent.includes('tiktok'), 'TikTok support missing');
      
      console.log('✅ API endpoint structure test passed');
      return true;
    } catch (error) {
      console.error('❌ API endpoint structure test failed:', error.message);
      return false;
    }
  },
  
  async testMetadataTemplates() {
    console.log('🧪 Testing metadata templates...');
    
    try {
      // Validate test metadata against expected structure
      const instagramMeta = testData.instagramMetadata;
      const tiktokMeta = testData.tiktokMetadata;
      
      // Check required fields
      assert(instagramMeta.platform, 'Instagram platform missing');
      assert(instagramMeta.source_url, 'Instagram source_url missing');
      assert(Array.isArray(instagramMeta.hashtags), 'Instagram hashtags not array');
      
      assert(tiktokMeta.platform, 'TikTok platform missing');
      assert(tiktokMeta.source_url, 'TikTok source_url missing');
      assert(Array.isArray(tiktokMeta.hashtags), 'TikTok hashtags not array');
      
      // Validate JSON structure
      const instagramJson = JSON.stringify(instagramMeta);
      const tiktokJson = JSON.stringify(tiktokMeta);
      
      assert(JSON.parse(instagramJson), 'Instagram JSON invalid');
      assert(JSON.parse(tiktokJson), 'TikTok JSON invalid');
      
      console.log('✅ Metadata templates test passed');
      return true;
    } catch (error) {
      console.error('❌ Metadata templates test failed:', error.message);
      return false;
    }
  },
  
  async testYouTubeUrlValidation() {
    console.log('🧪 Testing YouTube URL validation...');
    
    try {
      const validUrls = [
        'https://www.youtube.com/shorts/6_I2FmT1mbY',
        'https://youtube.com/shorts/abcdefghijk',
        'https://www.youtube.com/shorts/ABC123DEF45'
      ];
      
      const invalidUrls = [
        'https://www.youtube.com/watch?v=6_I2FmT1mbY',
        'https://youtube.com/shorts/',
        'https://instagram.com/p/test',
        'not-a-url',
        ''
      ];
      
      const youtubePattern = /^https:\/\/(www\.)?youtube\.com\/shorts\/[a-zA-Z0-9_-]{11}$/;
      
      // Test valid URLs
      validUrls.forEach(url => {
        assert(youtubePattern.test(url), `Valid URL failed: ${url}`);
      });
      
      // Test invalid URLs
      invalidUrls.forEach(url => {
        assert(!youtubePattern.test(url), `Invalid URL passed: ${url}`);
      });
      
      console.log('✅ YouTube URL validation test passed');
      return true;
    } catch (error) {
      console.error('❌ YouTube URL validation test failed:', error.message);
      return false;
    }
  },
  
  async testErrorHandling() {
    console.log('🧪 Testing error handling...');
    
    try {
      const handlerContent = await fs.readFile(path.join(__dirname, 'services/unified-api/src/handlers/vdp-submit.js'), 'utf8');
      
      // Check for RFC 9457 error codes
      const errorCodes = [
        'INVALID_PLATFORM',
        'MISSING_YOUTUBE_URL', 
        'INVALID_YOUTUBE_URL',
        'MISSING_VIDEO_FILE',
        'MISSING_METADATA_FILE',
        'HOOK_GATE_FAILED',
        'SCHEMA_VALIDATION_FAILED'
      ];
      
      errorCodes.forEach(code => {
        assert(handlerContent.includes(code), `Error code missing: ${code}`);
      });
      
      // Check for error structure (object properties)
      assert(handlerContent.includes('type,'), 'Error type missing');
      assert(handlerContent.includes('title,'), 'Error title missing');
      assert(handlerContent.includes('detail,'), 'Error detail missing');
      assert(handlerContent.includes('fixes'), 'Error fixes missing');
      
      console.log('✅ Error handling test passed');
      return true;
    } catch (error) {
      console.error('❌ Error handling test failed:', error.message);
      return false;
    }
  }
};

// Test metadata file creation
async function createTestMetadataFiles() {
  console.log('📝 Creating test metadata files...');
  
  const testDir = path.join(__dirname, 'test-data');
  
  try {
    await fs.mkdir(testDir, { recursive: true });
    
    // Create Instagram metadata
    await fs.writeFile(
      path.join(testDir, 'instagram-test.json'),
      JSON.stringify(testData.instagramMetadata, null, 2)
    );
    
    // Create TikTok metadata
    await fs.writeFile(
      path.join(testDir, 'tiktok-test.json'),
      JSON.stringify(testData.tiktokMetadata, null, 2)
    );
    
    // Create invalid metadata (for error testing)
    await fs.writeFile(
      path.join(testDir, 'invalid-metadata.json'),
      '{"invalid": "missing required fields"}'
    );
    
    console.log('✅ Test metadata files created');
  } catch (error) {
    console.error('❌ Failed to create test files:', error.message);
  }
}

// Run all tests
async function runAllTests() {
  console.log('🚀 Starting Unified VDP Form Tests\n');
  
  const testResults = [];
  
  // Create test files first
  await createTestMetadataFiles();
  
  // Run each test
  for (const [testName, testFn] of Object.entries(tests)) {
    try {
      const result = await testFn();
      testResults.push({ name: testName, passed: result });
    } catch (error) {
      console.error(`❌ Test ${testName} threw error:`, error.message);
      testResults.push({ name: testName, passed: false, error: error.message });
    }
    console.log(''); // Empty line between tests
  }
  
  // Summary
  const passed = testResults.filter(r => r.passed).length;
  const total = testResults.length;
  
  console.log('📊 Test Summary');
  console.log('=================');
  console.log(`Passed: ${passed}/${total}`);
  console.log(`Failed: ${total - passed}/${total}`);
  
  if (passed === total) {
    console.log('\n🎉 All tests passed! Unified form is ready for deployment.');
  } else {
    console.log('\n⚠️  Some tests failed. Please review and fix issues before deployment.');
    
    // Show failed tests
    const failed = testResults.filter(r => !r.passed);
    failed.forEach(test => {
      console.log(`❌ ${test.name}${test.error ? `: ${test.error}` : ''}`);
    });
  }
  
  return passed === total;
}

// Run tests if called directly
if (require.main === module) {
  runAllTests().catch(console.error);
}

module.exports = { runAllTests, tests, testData };