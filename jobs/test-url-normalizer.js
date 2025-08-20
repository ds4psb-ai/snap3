// test-url-normalizer.js
import { normalizeSocialUrl } from './url-normalizer.js';

const testUrls = [
  // YouTube URLs
  'https://www.youtube.com/watch?v=55e6ScXfiZc',
  'https://youtu.be/55e6ScXfiZc',
  'https://www.youtube.com/shorts/55e6ScXfiZc',
  'https://www.youtube.com/embed/55e6ScXfiZc',
  
  // Instagram URLs  
  'https://www.instagram.com/reel/CX1234567/',
  'https://www.instagram.com/p/CY7890123/',
  'https://www.instagram.com/tv/CZ4567890/',
  'https://instagram.com/reel/CA_BcDeFg/',
  
  // TikTok URLs
  'https://www.tiktok.com/@user123/video/1234567890123456789',
  'https://tiktok.com/@creator/video/9876543210987654321',
  'https://www.tiktok.com/embed/1111222233334444',
  'https://www.tiktok.com/v/5555666677778888.html',
  
  // Edge cases
  'https://www.youtube.com/watch?v=InvalidID',  // Should fail
  'https://www.instagram.com/stories/user/',    // Should fail
  'https://www.tiktok.com/@user/photo/123',     // Should fail
  'https://www.facebook.com/watch?v=123',       // Should fail
];

async function runTests() {
  console.log('🔧 URL Normalizer Test Suite\n');
  
  for (const url of testUrls) {
    try {
      console.log(`Testing: ${url}`);
      const result = await normalizeSocialUrl(url);
      console.log(`✅ Platform: ${result.platform}, ID: ${result.id}`);
      console.log(`   Canonical: ${result.canonicalUrl}\n`);
    } catch (error) {
      console.log(`❌ Error: ${error.message}\n`);
    }
  }
}

// Run tests if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runTests().catch(console.error);
}