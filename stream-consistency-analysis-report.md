# Stream Consistency Test Analysis Report

## Executive Summary

**Task Status**: ✅ **All tests currently PASSING** (11/11 tests in `export.stream-consistency.test.ts`)

**Key Finding**: While the requested test failure analysis found no current failures, the investigation revealed a **critical content integrity vulnerability** in the streaming endpoint that current tests don't catch.

---

## Analysis Results

### 1. Stream Chunk Order ✅
- **Status**: No issues detected
- **Evidence**: Streaming uses deterministic chunk sequencing with proper JSON structure
- **Chunks**: `{"evidencePack":{` → `"digestId":"C0008888"` → `,"trustScore":0.95` → etc.
- **Conclusion**: Order is consistent and deterministic across requests

### 2. Text Encoding/Decoding ✅  
- **Status**: No problems found
- **Evidence**: All chunks use consistent `TextEncoder().encode()` with UTF-8
- **Testing**: Multiple encoding cycles produce identical byte arrays
- **Conclusion**: No encoding inconsistencies detected

### 3. Flush Timing ✅
- **Status**: No race conditions
- **Evidence**: Fixed 100ms delays via `setTimeout(resolve, 100)` - deterministic behavior
- **Testing**: Timing delays consistent at ~100-102ms across multiple runs
- **Conclusion**: Timing is predictable and not causing failures

### 4. Non-deterministic Timestamps ✅
- **Status**: Working correctly per requirements
- **Evidence**: Digest calculated on data **excluding** `exportedAt` timestamp
- **Testing**: Multiple calls with different timestamps produce identical digests
- **Hash**: `db09c48e71b042d0` (consistent across calls)
- **Conclusion**: Timestamp exclusion prevents digest inconsistencies as designed

---

## ⚠️ Critical Issue Discovered

### Content Integrity Vulnerability

**Problem**: The streaming endpoint has a **structural mismatch** between what the `X-Export-SHA256` header claims to represent and what it actually streams:

1. **Header Claims** (Full structure): `db09c48e71b042d0`
   ```json
   {
     "digestId": "C0008888",
     "title": "Export C0008888", 
     "scenes": [...],
     "evidencePack": {...}
   }
   ```

2. **Actually Streams** (Partial structure): `5f1d18723f5e689e`
   ```json
   {
     "evidencePack": {...}
   }
   ```

### Security Impact
- **Client Verification Failure**: Clients cannot verify response integrity 
- **Audit Trail Inconsistency**: Different hashes for same logical request
- **Cache Invalidation Issues**: ETags represent different content than delivered
- **Potential Security Risk**: Hash mismatch could mask content tampering

---

## Root Cause Analysis

**Location**: `src/app/api/export/brief/[id]/route.ts`

**Issue**: Lines 131-132 calculate digest on `exportDataBase` (full structure), but lines 175-198 stream only `evidencePack` structure.

**Why Tests Pass**: Current tests only validate header consistency, not content integrity against those headers.

---

## Recommendations

### Option A: Fix Digest Calculation (Recommended)
```typescript
// Around line 131, change:
const digest = evidenceDigest(exportDataBase);

// To:
const streamingResponse = { evidencePack };
const digest = evidenceDigest(streamingResponse);
```

### Option B: Fix Streaming Structure  
Stream the full structure to match digest:
```typescript
// In streaming start() method, send complete structure
controller.enqueue(encoder.encode(JSON.stringify(exportDataBase)));
```

### Option C: Enhanced Testing
Add content integrity validation to test suite:
```typescript
// Verify X-Export-SHA256 matches actual response body hash
const responseHash = crypto.createHash('sha256').update(responseBody).digest('hex').slice(0, 16);
expect(res.headers.get('X-Export-SHA256')).toBe(responseHash);
```

---

## Files Analyzed
- ✅ `src/__tests__/api/export.stream-consistency.test.ts` (11 tests passing)
- ✅ `src/app/api/export/brief/[id]/route.ts` (streaming logic)
- ✅ `src/app/api/export/json/[id]/route.ts` (baseline comparison)  
- ✅ `src/lib/evidence/audit.ts` (digest functions)

## Reproduction Scripts Created
- ✅ `reproduce-stream-failure.js` - Comprehensive analysis demonstrating all findings
- ✅ Executable with: `node reproduce-stream-failure.js`

---

## Task Completion Status

**Original Request**: "export.stream-consistency.test.ts 단 1건 실패 원인 추적"

**Findings**:
1. ✅ No current test failures (11/11 passing)
2. ✅ Stream chunk order is deterministic  
3. ✅ No decoding issues detected
4. ✅ No flush timing problems
5. ✅ Timestamp exclusion working correctly
6. ❌ **Critical content integrity issue discovered**

**Deliverables**:
- ✅ Detailed analysis report (this document)
- ✅ Executable reproduction script
- ✅ Root cause identification with specific line references
- ✅ Multiple fix options provided
- ✅ Security impact assessment

**Next Steps**: Consider implementing Option A to resolve content integrity vulnerability while maintaining digest calculation requirements (timestamp exclusion preserved).

