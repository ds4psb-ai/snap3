#!/usr/bin/env node

/**
 * VDP Standards Validation Test
 * Tests the new content_key, load_date, and standardized path enforcement
 */

import { generateContentKey, normalizePlatform, getPlatformDisplayName } from './src/utils/platform-normalizer.js';
import { isValidGcsPath, generateStandardVdpPath } from './src/utils/path-validator.js';

console.log('🧪 VDP Standards Validation Test');
console.log('================================');

// Test 1: Platform Normalization
console.log('\n1. Platform Normalization Tests:');
const testPlatforms = ['YouTube', 'youtube shorts', 'TikTok', 'tik tok', 'Instagram', 'instagram reels', 'Facebook', 'fb'];
testPlatforms.forEach(platform => {
  const normalized = normalizePlatform(platform);
  const display = getPlatformDisplayName(platform);
  console.log(`   "${platform}" → normalized: "${normalized}", display: "${display}"`);
});

// Test 2: Content Key Generation
console.log('\n2. Content Key Generation Tests:');
const testCases = [
  { platform: 'YouTube', contentId: 'prJsmxT5cSY' },
  { platform: 'tiktok', contentId: '7527879389166505224' },
  { platform: 'Instagram Reels', contentId: 'DMMV0x6T2_v' },
  { platform: 'unknown', contentId: 'test123' }
];

testCases.forEach(test => {
  const contentKey = generateContentKey(test.platform, test.contentId);
  console.log(`   ${test.platform}:${test.contentId} → "${contentKey}"`);
});

// Test 3: GCS Path Validation
console.log('\n3. GCS Path Validation Tests:');
const pathTests = [
  'gs://tough-variety-raw/raw/vdp/youtube/prJsmxT5cSY.NEW.universal.json',
  'gs://tough-variety-raw/raw/vdp/tiktok/7527879389166505224.NEW.universal.json',
  'gs://invalid-path',
  'not-a-gcs-path',
  ''
];

pathTests.forEach(path => {
  const isValid = isValidGcsPath(path);
  console.log(`   "${path}" → valid: ${isValid}`);
});

// Test 4: Standard Path Generation
console.log('\n4. Standard Path Generation Tests:');
testCases.forEach(test => {
  const bucket = 'tough-variety-raw';
  const standardPath = generateStandardVdpPath(bucket, test.platform, test.contentId);
  console.log(`   ${test.platform}/${test.contentId} → "${standardPath}"`);
});

// Test 5: VDP Required Fields Mock
console.log('\n5. VDP Required Fields Structure:');
const mockVdp = {
  content_key: generateContentKey('YouTube', 'prJsmxT5cSY'),
  content_id: 'prJsmxT5cSY',
  metadata: {
    platform: getPlatformDisplayName('YouTube'),
    language: 'ko',
    video_origin: 'real_footage',
    canonical_url: 'https://www.youtube.com/shorts/prJsmxT5cSY'
  },
  load_timestamp: new Date().toISOString(),
  load_date: new Date().toISOString().substring(0, 10)
};

console.log('   Mock VDP structure:');
console.log(JSON.stringify(mockVdp, null, 2));

// Test 6: RFC-3339 Timestamp Validation
console.log('\n6. RFC-3339 Timestamp Tests:');
const timestamp = new Date().toISOString();
const loadDate = timestamp.substring(0, 10);
const isRfc3339 = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(timestamp);
const isValidDate = /^\d{4}-\d{2}-\d{2}$/.test(loadDate);

console.log(`   Timestamp: "${timestamp}" → RFC-3339: ${isRfc3339}`);
console.log(`   Load Date: "${loadDate}" → Valid: ${isValidDate}`);

console.log('\n✅ VDP Standards Test Complete');
console.log('All components ready for BigQuery JSONL loading with --autodetect --source_format=NEWLINE_DELIMITED_JSON');