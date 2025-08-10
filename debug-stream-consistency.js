#!/usr/bin/env node
/**
 * Stream Consistency Debug Script
 * Reproduces the digest inconsistency between streaming and non-streaming responses
 */

import { NextRequest } from 'next/server';
import { GET as getBriefExport } from './src/app/api/export/brief/[id]/route.js';

const validId = 'C0008888';
const baseUrl = 'http://localhost:3001';

async function debugStreamConsistency() {
  console.log('🔍 Stream Consistency Debug\n');

  try {
    // Test 1: Non-streaming request
    console.log('1️⃣ Non-streaming request:');
    const normalReq = new NextRequest(`${baseUrl}/api/export/brief/${validId}`);
    const normalRes = await getBriefExport(normalReq, { params: Promise.resolve({ id: validId }) });
    
    console.log('- Status:', normalRes.status);
    console.log('- Cache-Control:', normalRes.headers.get('Cache-Control'));
    console.log('- ETag:', normalRes.headers.get('ETag'));
    console.log('- X-Export-SHA256:', normalRes.headers.get('X-Export-SHA256'));
    console.log('- Transfer-Encoding:', normalRes.headers.get('Transfer-Encoding'));
    
    const normalData = await normalRes.json();
    console.log('- Response keys:', Object.keys(normalData));
    console.log('- Response size (serialized):', JSON.stringify(normalData).length);

    // Test 2: Streaming request
    console.log('\n2️⃣ Streaming request:');
    const streamReq = new NextRequest(`${baseUrl}/api/export/brief/${validId}?format=stream`);
    const streamRes = await getBriefExport(streamReq, { params: Promise.resolve({ id: validId }) });
    
    console.log('- Status:', streamRes.status);
    console.log('- Cache-Control:', streamRes.headers.get('Cache-Control'));
    console.log('- ETag:', streamRes.headers.get('ETag'));
    console.log('- X-Export-SHA256:', streamRes.headers.get('X-Export-SHA256'));
    console.log('- Transfer-Encoding:', streamRes.headers.get('Transfer-Encoding'));

    // Read stream data
    const reader = streamRes.body?.getReader();
    const chunks = [];
    let streamData = '';
    
    if (reader) {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
        streamData += new TextDecoder().decode(value);
      }
    }
    
    console.log('- Stream chunks count:', chunks.length);
    console.log('- Stream data length:', streamData.length);
    console.log('- Stream data preview:', streamData.slice(0, 100) + '...');
    
    try {
      const streamJson = JSON.parse(streamData);
      console.log('- Parsed stream keys:', Object.keys(streamJson));
      console.log('- EvidencePack keys:', Object.keys(streamJson.evidencePack || {}));
    } catch (e) {
      console.log('- Stream parsing error:', e.message);
    }

    // Test 3: Compare SHA256 digests
    console.log('\n3️⃣ Digest Comparison:');
    const normalDigest = normalRes.headers.get('X-Export-SHA256');
    const streamDigest = streamRes.headers.get('X-Export-SHA256');
    
    console.log('- Normal SHA256:', normalDigest);
    console.log('- Stream SHA256:', streamDigest);
    console.log('- Digests match:', normalDigest === streamDigest);

    // Test 4: Multiple runs to check for timing consistency
    console.log('\n4️⃣ Multiple runs consistency check:');
    const digests = [];
    
    for (let i = 0; i < 5; i++) {
      const req = new NextRequest(`${baseUrl}/api/export/brief/${validId}`);
      const res = await getBriefExport(req, { params: Promise.resolve({ id: validId }) });
      const digest = res.headers.get('X-Export-SHA256');
      digests.push(digest);
      console.log(`- Run ${i + 1}: ${digest}`);
    }
    
    const allSame = digests.every(d => d === digests[0]);
    console.log('- All digests identical:', allSame);

    if (!allSame) {
      console.log('\n⚠️  INCONSISTENCY DETECTED: Digests vary between runs!');
      console.log('Root cause: Timestamp or other time-dependent data in digest calculation');
    }

  } catch (error) {
    console.error('❌ Debug script error:', error);
    process.exit(1);
  }
}

// Run debug
debugStreamConsistency().catch(console.error);