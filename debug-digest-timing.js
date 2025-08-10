#!/usr/bin/env node
/**
 * Digest Timing Analysis
 * Reproduces the timestamp inclusion issue in digest calculation
 */

const crypto = require('crypto');

// Simulate evidenceDigest function from audit.ts
function evidenceDigest(payload, contentType = 'application/json') {
  if (payload === null || payload === undefined) {
    throw new Error('Cannot generate digest for null or undefined payload');
  }

  // Serialize payload consistently
  const serialized = typeof payload === 'string' 
    ? payload 
    : JSON.stringify(payload, null, 0); // No whitespace for consistent hashing

  // Generate SHA256 hash
  const hash = crypto.createHash('sha256');
  hash.update(serialized, 'utf8');
  const sha256 = hash.digest('hex');

  // Calculate size in bytes (UTF-8)
  const size = Buffer.byteLength(serialized, 'utf8');
  
  // Generate ISO timestamp
  const exportedAt = new Date().toISOString();

  return {
    sha256,
    size,
    exportedAt,
    contentType,
  };
}

// Simulate the problematic code pattern from route.ts
function simulateDigestGeneration(id) {
  console.log('🧪 Simulating digest generation for ID:', id);

  // This mimics the pattern in route.ts lines 120-133
  const evidencePack = {
    digestId: id,
    trustScore: 0.85,
    evidenceChips: ['authentic', 'verified'],
    synthIdDetected: false,
  };

  // Step 1: Create base export WITHOUT timestamp (line 121-124)
  const exportDataBase = {
    digestId: id,
    title: `Export ${id}`,
    scenes: [],
    evidencePack,
  };

  console.log('📝 Export data base (for digest):', JSON.stringify(exportDataBase, null, 2));

  // Step 2: Generate digest from base data (line 127)
  const digest = evidenceDigest(exportDataBase);
  console.log('🔐 Digest SHA256:', digest.sha256);
  console.log('📏 Digest size:', digest.size);

  // Step 3: Add timestamp to final export (line 130-133)
  const exportData = {
    ...exportDataBase,
    exportedAt: new Date().toISOString(), // This creates timing dependency!
  };

  console.log('📝 Final export data (with timestamp):', JSON.stringify(exportData, null, 2));

  // Step 4: What if we recalculate digest with timestamp?
  const digestWithTimestamp = evidenceDigest(exportData);
  console.log('🔐 Digest with timestamp:', digestWithTimestamp.sha256);
  
  console.log('❓ Digests match:', digest.sha256 === digestWithTimestamp.sha256);
  
  return { digest, exportData, digestWithTimestamp };
}

// Test multiple runs with timing
async function testTimingConsistency() {
  console.log('\n🕐 Testing timing consistency (5 runs):\n');
  
  const results = [];
  
  for (let i = 0; i < 5; i++) {
    console.log(`--- Run ${i + 1} ---`);
    const result = simulateDigestGeneration('C0008888');
    results.push(result);
    
    // Add small delay to simulate real-world timing differences
    await new Promise(resolve => setTimeout(resolve, 50));
  }
  
  console.log('\n📊 Summary:');
  const baseDigests = results.map(r => r.digest.sha256);
  const timestampDigests = results.map(r => r.digestWithTimestamp.sha256);
  
  console.log('Base digests:', baseDigests);
  console.log('Timestamp digests:', timestampDigests);
  
  const baseConsistent = baseDigests.every(d => d === baseDigests[0]);
  const timestampConsistent = timestampDigests.every(d => d === timestampDigests[0]);
  
  console.log('Base digests consistent:', baseConsistent);
  console.log('Timestamp digests consistent:', timestampConsistent);
  
  return { baseConsistent, timestampConsistent };
}

// Analyze the actual streaming response structure issue
function analyzeStreamingStructure() {
  console.log('\n🌊 Analyzing streaming response structure issue:\n');
  
  const evidencePack = {
    digestId: 'C0008888',
    trustScore: 0.85,
    evidenceChips: ['authentic', 'verified'],
    synthIdDetected: false,
  };

  // What the digest is calculated on (from route.ts)
  const digestInput = {
    digestId: 'C0008888',
    title: 'Export C0008888',
    scenes: [],
    evidencePack,
  };

  // What the streaming response actually sends (from route.ts lines 175-193)
  const streamingOutput = {
    evidencePack: evidencePack  // Only the evidence pack!
  };

  console.log('🔐 Digest calculated on:', JSON.stringify(digestInput, null, 2));
  console.log('🌊 Streaming actually sends:', JSON.stringify(streamingOutput, null, 2));
  
  const digestInputHash = evidenceDigest(digestInput);
  const streamingOutputHash = evidenceDigest(streamingOutput);
  
  console.log('🔐 Digest input SHA256:', digestInputHash.sha256);
  console.log('🌊 Streaming output SHA256:', streamingOutputHash.sha256);
  console.log('❓ Hashes match:', digestInputHash.sha256 === streamingOutputHash.sha256);
  
  console.log('\n💡 ROOT CAUSE: Digest is calculated on full export data, but streaming only sends evidencePack!');
  
  return {
    digestInput,
    streamingOutput,
    digestInputHash,
    streamingOutputHash,
    match: digestInputHash.sha256 === streamingOutputHash.sha256
  };
}

// Main execution
async function main() {
  console.log('🚀 Stream Consistency Digest Analysis\n');
  
  // Test 1: Basic digest generation
  simulateDigestGeneration('C0008888');
  
  // Test 2: Timing consistency
  const timingResults = await testTimingConsistency();
  
  // Test 3: Streaming structure analysis
  const streamingResults = analyzeStreamingStructure();
  
  console.log('\n🏁 Final Analysis:');
  console.log('================');
  
  if (!timingResults.baseConsistent) {
    console.log('❌ ISSUE 1: Base digest calculation includes timestamp-dependent data');
  } else {
    console.log('✅ Base digest calculation is timing-consistent');
  }
  
  if (!streamingResults.match) {
    console.log('❌ ISSUE 2: Streaming response structure differs from digest input');
  } else {
    console.log('✅ Streaming response matches digest input structure');
  }
  
  console.log('\n🔧 Recommended Fixes:');
  if (!timingResults.baseConsistent) {
    console.log('1. Ensure digest calculation excludes ALL timestamp-dependent fields');
  }
  if (!streamingResults.match) {
    console.log('2. Either calculate digest on streaming structure OR stream full export structure');
  }
}

main().catch(console.error);