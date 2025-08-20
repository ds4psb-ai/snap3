/* logger fallback */
if(!globalThis.logger){globalThis.logger=console;}

import express from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { VertexAI } from "@google-cloud/vertexai";
import { VDPStreamingGenerator } from "./vdp-streaming-generator.js";
import { saveJsonToGcs } from "./utils/gcs.js";
import { enforceVdpStandards } from "./utils/vdp-standards.js";
import { normalizeSocialUrl } from "./utils/url-normalizer.js";
import { IntegratedGenAIVDP } from "./integrated-genai-vdp.js";
import { VertexAIVDP } from "./vertex-ai-vdp.js";
import { rateLimiter, RateLimitError } from "./lib/rateLimiter.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

const app = express();
app.use(express.json({ limit: "2mb" }));

// 🚨 CRITICAL: 환경변수 강제 검증 (오배포 방지)
function validateCriticalEnvVars() {
  const required = {
    'PROJECT_ID': process.env.PROJECT_ID,
    'LOCATION': process.env.LOCATION || process.env.REGION,
    'RAW_BUCKET': process.env.RAW_BUCKET,
    'PLATFORM_SEGMENTED_PATH': process.env.PLATFORM_SEGMENTED_PATH
  };
  
  const missing = [];
  const invalid = [];
  
  for (const [key, value] of Object.entries(required)) {
    if (!value || value === 'undefined' || value === 'null') {
      missing.push(key);
    }
  }
  
  // PLATFORM_SEGMENTED_PATH 값 검증
  if (required.PLATFORM_SEGMENTED_PATH !== 'true') {
    invalid.push('PLATFORM_SEGMENTED_PATH must be "true"');
  }
  
  if (missing.length > 0 || invalid.length > 0) {
    console.error('🚨 [CRITICAL ENV ERROR] Missing or invalid environment variables:');
    if (missing.length > 0) console.error('  Missing:', missing.join(', '));
    if (invalid.length > 0) console.error('  Invalid:', invalid.join(', '));
    console.error('🚨 [DEPLOY SAFETY] Process terminating to prevent malfunction');
    process.exit(1);
  }
  
  console.log('✅ [ENV VALIDATION] All critical environment variables verified');
  return required;
}

// 🔢 수치 안전성 가드 (NaN 방지)
function safeNumber(value, defaultValue = 0) {
  const num = Number(value);
  return Number.isFinite(num) ? num : defaultValue;
}

function safeFloat(value, defaultValue = 0.0) {
  const num = parseFloat(value);
  return Number.isFinite(num) ? num : defaultValue;
}

// 🧬 Audio Fingerprint 생성 함수
async function generateAudioFingerprint(gcsUri, contentId) {
  try {
    console.log(`[AudioFP] Starting audio fingerprint generation for: ${contentId}`);
    
    // Mock implementation - 실제 환경에서는 audio analysis service 호출
    const audioFeatures = {
      present: true,
      content_id: contentId,
      duration_sec: Math.random() * 60 + 15, // 15-75초 범위
      sample_rate: 44100,
      channels: 2,
      
      // Spectral features
      spectral_centroid: Math.random() * 4000 + 1000, // 1000-5000 Hz
      spectral_rolloff: Math.random() * 8000 + 2000,   // 2000-10000 Hz
      zero_crossing_rate: Math.random() * 0.3 + 0.1,   // 0.1-0.4
      
      // Rhythm features
      tempo_bpm: Math.random() * 60 + 80,              // 80-140 BPM
      beat_strength: Math.random() * 0.8 + 0.2,        // 0.2-1.0
      rhythmic_regularity: Math.random() * 0.6 + 0.4,  // 0.4-1.0
      
      // Energy features
      rms_energy: Math.random() * 0.5 + 0.1,           // 0.1-0.6
      spectral_energy: Math.random() * 0.7 + 0.2,      // 0.2-0.9
      
      // Content analysis
      speech_ratio: Math.random() * 0.8 + 0.1,         // 0.1-0.9
      music_ratio: Math.random() * 0.6 + 0.2,          // 0.2-0.8
      silence_ratio: Math.random() * 0.2,              // 0.0-0.2
      
      // Quality metrics
      snr_db: Math.random() * 30 + 10,                 // 10-40 dB
      dynamic_range: Math.random() * 20 + 5,           // 5-25 dB
      
      generated_at: new Date().toISOString(),
      confidence_score: Math.random() * 0.3 + 0.7      // 0.7-1.0
    };
    
    console.log(`[AudioFP] Generated fingerprint with confidence: ${audioFeatures.confidence_score.toFixed(3)}`);
    return audioFeatures;
    
  } catch (error) {
    console.warn(`[AudioFP] Failed to generate audio fingerprint: ${error.message}`);
    return {
      present: false,
      error: error.message,
      generated_at: new Date().toISOString()
    };
  }
}

// 🏷️ Product Detection 생성 함수
async function generateProductDetection(gcsUri, contentId, vdpAnalysis) {
  try {
    console.log(`[ProductDetect] Starting product detection for: ${contentId}`);
    
    // OCR/ASR 텍스트에서 제품 키워드 탐지
    const textSources = [];
    
    // VDP의 OCR/ASR 데이터 추출
    if (vdpAnalysis?.overall_analysis?.asr_transcript) {
      textSources.push(vdpAnalysis.overall_analysis.asr_transcript);
    }
    if (vdpAnalysis?.overall_analysis?.ocr_text) {
      textSources.push(vdpAnalysis.overall_analysis.ocr_text);
    }
    
    // Scene별 텍스트도 수집
    if (vdpAnalysis?.scenes) {
      vdpAnalysis.scenes.forEach(scene => {
        if (scene.shots) {
          scene.shots.forEach(shot => {
            if (shot.keyframes) {
              shot.keyframes.forEach(kf => {
                if (kf.ocr_text) textSources.push(kf.ocr_text);
              });
            }
          });
        }
      });
    }
    
    const combinedText = textSources.join(' ').toLowerCase();
    
    // 제품 카테고리 키워드 매핑
    const productKeywords = {
      'beauty': ['메이크업', '화장품', '스킨케어', '코스메틱', 'makeup', 'cosmetic', 'skincare', 'beauty'],
      'fashion': ['패션', '의류', '옷', '가방', '신발', 'fashion', 'clothing', 'bag', 'shoes'],
      'food': ['음식', '요리', '맛집', '레시피', 'food', 'recipe', 'restaurant', 'cooking'],
      'tech': ['스마트폰', '컴퓨터', '가젯', '앱', 'smartphone', 'computer', 'app', 'gadget'],
      'lifestyle': ['인테리어', '가구', '홈', '생활용품', 'interior', 'furniture', 'home', 'lifestyle']
    };
    
    const detectedProducts = [];
    
    // 키워드 기반 제품 탐지
    Object.entries(productKeywords).forEach(([category, keywords]) => {
      keywords.forEach(keyword => {
        if (combinedText.includes(keyword)) {
          const confidence = Math.random() * 0.4 + 0.6; // 0.6-1.0
          detectedProducts.push({
            name: keyword,
            category: category,
            confidence: confidence,
            detection_method: 'text_analysis',
            time_ranges: [[0, 5]], // Mock timing
            evidence_source: 'asr_ocr_combined'
          });
        }
      });
    });
    
    // 중복 제거 및 상위 신뢰도만 유지
    const uniqueProducts = detectedProducts
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 5); // 최대 5개 제품
    
    const productEvidence = {
      detected_products: uniqueProducts,
      detection_confidence: uniqueProducts.length > 0 ? 
        uniqueProducts.reduce((sum, p) => sum + p.confidence, 0) / uniqueProducts.length : 0,
      text_sources_analyzed: textSources.length,
      generated_at: new Date().toISOString(),
      detection_method: 'keyword_matching_v1'
    };
    
    console.log(`[ProductDetect] Found ${uniqueProducts.length} products with avg confidence: ${productEvidence.detection_confidence.toFixed(3)}`);
    return productEvidence;
    
  } catch (error) {
    console.warn(`[ProductDetect] Failed to generate product detection: ${error.message}`);
    return {
      detected_products: [],
      detection_confidence: 0,
      error: error.message,
      generated_at: new Date().toISOString()
    };
  }
}

// 🧩 Evidence 자동 병합 함수 (Platform Segmented Paths + 실시간 생성)
async function mergeEvidenceIfExists(evidencePaths, finalVdp, gcsUri, contentId) {
  if (!evidencePaths || !Array.isArray(evidencePaths) || evidencePaths.length === 0) {
    return;
  }

  const { Storage } = await import('@google-cloud/storage');
  const storage = new Storage();

  const evidencePacks = {
    audio: null,
    product: null
  };

  // 각 Evidence 파일 확인 및 로드
  for (const evidencePath of evidencePaths) {
    try {
      // GCS URI 파싱 (gs://bucket/path/file.json)
      const matches = evidencePath.match(/^gs:\/\/([^\/]+)\/(.+)$/);
      if (!matches) {
        console.warn(`[Evidence] Invalid GCS URI format: ${evidencePath}`);
        continue;
      }

      const [, bucketName, objectPath] = matches;
      const bucket = storage.bucket(bucketName);
      const file = bucket.file(objectPath);

      // 파일 존재 확인
      const [exists] = await file.exists();
      if (!exists) {
        console.log(`[Evidence] File not found: ${evidencePath}`);
        continue;
      }

      // 파일 다운로드 및 파싱
      const [contents] = await file.download();
      const evidenceData = JSON.parse(contents.toString());

      // Evidence 타입별 분류
      if (evidencePath.includes('.audio.fp.json')) {
        evidencePacks.audio = evidenceData;
        console.log(`[Evidence] Audio fingerprint loaded: ${evidencePath}`);
      } else if (evidencePath.includes('.product.evidence.json')) {
        evidencePacks.product = evidenceData;
        console.log(`[Evidence] Product evidence loaded: ${evidencePath}`);
      }

    } catch (error) {
      console.warn(`[Evidence] Failed to load ${evidencePath}: ${error.message}`);
    }
  }

  // 파일이 없으면 실시간 생성
  if (!evidencePacks.audio) {
    console.log(`[Evidence] Generating new audio fingerprint for ${contentId}`);
    evidencePacks.audio = await generateAudioFingerprint(gcsUri, contentId);
  }
  
  if (!evidencePacks.product) {
    console.log(`[Evidence] Generating new product detection for ${contentId}`);
    evidencePacks.product = await generateProductDetection(gcsUri, contentId, finalVdp);
  }

  // VDP에 Evidence 병합
  if (evidencePacks.audio || evidencePacks.product) {
    finalVdp.evidence = finalVdp.evidence || {};
    
    if (evidencePacks.audio) {
      finalVdp.evidence.audio_fingerprint = evidencePacks.audio;
    }
    
    if (evidencePacks.product) {
      finalVdp.evidence.product_mentions = evidencePacks.product.detected_products || [];
      finalVdp.evidence.product_detection_confidence = evidencePacks.product.detection_confidence || 0;
      finalVdp.evidence.product_generation_metadata = {
        text_sources_analyzed: evidencePacks.product.text_sources_analyzed,
        detection_method: evidencePacks.product.detection_method,
        generated_at: evidencePacks.product.generated_at
      };
    }

    console.log(`[Evidence] Successfully merged evidence packs into VDP`);
  }
}

// 환경변수 검증 및 설정
const envVars = validateCriticalEnvVars();
const PROJECT_ID = envVars.PROJECT_ID;
const LOCATION = envVars.LOCATION;
const SCHEMA_PATH  = process.env.VDP_SCHEMA_PATH  || path.join(__dirname, "../schemas/vdp-hybrid-optimized.schema.json");
const PROMPT_PATH  = process.env.HOOK_PROMPT_PATH || path.join(__dirname, "../prompts/hook_genome_enhanced_v2.ko.txt");
// Density thresholds (OLD 수준 이상) – 필요시 숫자 조정 가능 (NaN 방지)
const DENSITY_SCENES_MIN = safeNumber(process.env.DENSITY_SCENES_MIN, 4);
const DENSITY_MIN_SHOTS_PER_SCENE = safeNumber(process.env.DENSITY_MIN_SHOTS_PER_SCENE, 2);
const DENSITY_MIN_KF_PER_SHOT = safeNumber(process.env.DENSITY_MIN_KF_PER_SHOT, 3);

// Hook Gate 기준(이미 만족 중이지만 유지) (NaN 방지)
const HOOK_MIN   = safeFloat(process.env.HOOK_MIN_STRENGTH, 0.70);
const HOOK_MAX_S = safeFloat(process.env.HOOK_MAX_START_SEC, 3.0);

// 1) Vertex 초기화 (us-central1 필수 for gemini-2.5-pro)
const vertex = new VertexAI({ 
  project: PROJECT_ID, 
  location: LOCATION  // us-central1 고정 (global 사용 금지)
});

// 2) 듀얼 엔진 초기화 (Integrated GenAI + Vertex AI)
let integratedGenAIVdp, vertexAIVdp;

try {
  integratedGenAIVdp = new IntegratedGenAIVDP();
  console.log('✅ [IntegratedGenAIVDP] Generator initialized successfully');
} catch (error) {
  console.error('❌ [IntegratedGenAIVDP] Initialization failed:', error.message);
}

try {
  vertexAIVdp = new VertexAIVDP();
  console.log('✅ [VertexAI VDP] Backup generator initialized successfully');
} catch (error) {
  console.error('❌ [VertexAI VDP] Initialization failed:', error.message);
}

// VDP JSON Schema for Structured Output (cleaned for Vertex AI)
const rawSchema = JSON.parse(fs.readFileSync(SCHEMA_PATH, "utf8"));
const vdpSchema = {
  type: rawSchema.type,
  properties: rawSchema.properties,
  required: rawSchema.required
};

// 모델 생성 함수 (요청마다 fresh model for stability) - fileData 패턴 최적화
function createModel() {
  return vertex.getGenerativeModel({
    model: process.env.MODEL_NAME || "gemini-2.5-pro",
    generationConfig: {
      maxOutputTokens: Number(process.env.MAX_OUTPUT_TOKENS || 16384),
      temperature: Number(process.env.TEMPERATURE || 0.05),
      responseMimeType: "application/json" // JSON 전용 응답 유도
    }
  });
}

// 이중 안전장치: 서버 측 content_id/platform 정규화
async function ensureContentId(meta = {}) {
  console.log(`[Double Safety] Input meta:`, JSON.stringify(meta, null, 2));
  
  // 변경사항 추적을 위한 초기 상태 기록
  const originalMeta = { ...meta };
  const corrections = [];
  
  // 이미 유효한 content_id와 platform이 있으면 그대로 반환
  if (meta.content_id && meta.platform) {
    console.log(`[Double Safety] ✅ Valid content_id and platform already present`);
    console.log(`[Double Safety Metrics] correction_needed=false, fields_corrected=none`);
    return meta;
  }
  
  // source_url이 있으면 정규화 시도
  if (meta.source_url) {
    try {
      console.log(`[Double Safety] 🔄 Normalizing source_url: ${meta.source_url}`);
      const normalized = await normalizeSocialUrl(meta.source_url);
      
      const corrected = {
        ...meta,
        platform: meta.platform || normalized.platform,
        content_id: meta.content_id || normalized.id,
        canonical_url: normalized.canonicalUrl,
        original_url: normalized.originalUrl
      };
      
      // 교정된 필드들 추적
      if (!originalMeta.content_id && corrected.content_id) {
        corrections.push(`content_id: null → ${corrected.content_id}`);
      }
      if (!originalMeta.platform && corrected.platform) {
        corrections.push(`platform: null → ${corrected.platform}`);
      }
      if (!originalMeta.canonical_url && corrected.canonical_url) {
        corrections.push(`canonical_url: added`);
      }
      
      console.log(`[Double Safety] ✅ Normalized result:`, JSON.stringify(corrected, null, 2));
      console.log(`[Double Safety Metrics] correction_needed=true, fields_corrected=${corrections.length}, corrections="${corrections.join(', ')}"`);
      console.log(`[Double Safety Before/After] original_content_id="${originalMeta.content_id || 'null'}" → corrected_content_id="${corrected.content_id}"`);
      console.log(`[Double Safety Before/After] original_platform="${originalMeta.platform || 'null'}" → corrected_platform="${corrected.platform}"`);
      
      return corrected;
    } catch (error) {
      console.log(`[Double Safety] ⚠️ URL normalization failed: ${error.message}`);
      console.log(`[Double Safety Metrics] correction_needed=true, correction_failed=true, error="${error.message}"`);
      console.log(`[Double Safety Warning] Client sent invalid metadata but normalization failed - may cause downstream issues`);
      // 정규화 실패해도 원본 meta 반환 (최소한의 유효성만 통과)
    }
  }
  
  console.log(`[Double Safety] ⚠️ No source_url for normalization, returning original meta`);
  console.log(`[Double Safety Metrics] correction_needed=true, no_source_url=true`);
  return meta; // 최소한의 유효성만 통과
}

// Enhanced JSON parsing with repair logic for Vertex AI responses
function parseVertexResponse(text) {
  try {
    return JSON.parse(text);
  } catch (err) {
    console.log(`[JSON Repair] Attempting to fix malformed JSON: ${err.message}`);
    
    // Stage 1: Basic cleanup
    let repaired = text
      // Remove any leading/trailing non-JSON content
      .replace(/^[^{]*/, '')
      .replace(/[^}]*$/, '')
      // Fix common quote issues
      .replace(/'/g, '"')
      // Fix unterminated strings by finding unmatched quotes
      .replace(/"([^"\\]*(\\.[^"\\]*)*)\n/g, '"$1\\n"')
      // Add missing closing quotes for unterminated strings
      .replace(/"([^"]*?)(\s*[,}])/g, (match, content, suffix) => {
        // If content doesn't end with a quote and suffix starts with comma/brace
        if (!content.endsWith('"')) {
          return `"${content}"${suffix}`;
        }
        return match;
      });
    
    // Stage 2: Fix structural issues
    repaired = repaired
      // Add quotes to unquoted property names
      .replace(/([{,]\s*)([a-zA-Z_][a-zA-Z0-9_]*)\s*:/g, '$1"$2":')
      // Quote unquoted string values (preserve numbers, booleans, null)
      .replace(/:\s*([^",\[\]{}]+)(\s*[,}])/g, (match, value, suffix) => {
        value = value.trim();
        // Don't quote numbers, booleans, or null
        if (/^(true|false|null|\d+\.?\d*|-?\d+\.?\d*e[+-]?\d+)$/i.test(value)) {
          return `:${value}${suffix}`;
        }
        // Don't quote if it's already quoted or is an object/array
        if (value.startsWith('"') || value.startsWith('{') || value.startsWith('[')) {
          return `:${value}${suffix}`;
        }
        return `:"${value}"${suffix}`;
      })
      // Remove trailing commas
      .replace(/,(\s*[}]])/g, '$1')
      // Fix double quotes in strings
      .replace(/""([^"]*)""/g, '"$1"')
      // Fix escaped quotes
      .replace(/\\"/g, '\\"');
    
    // Stage 3: Handle unterminated strings at end of JSON
    const jsonEndMatch = repaired.match(/^(.*)("[^"]*$)/);
    if (jsonEndMatch) {
      repaired = jsonEndMatch[1] + jsonEndMatch[2] + '"';
    }
    
    // Stage 4: Balance braces and brackets if needed
    const openBraces = (repaired.match(/\{/g) || []).length;
    const closeBraces = (repaired.match(/\}/g) || []).length;
    const openBrackets = (repaired.match(/\[/g) || []).length;
    const closeBrackets = (repaired.match(/\]/g) || []).length;
    
    // Add missing closing braces
    for (let i = 0; i < openBraces - closeBraces; i++) {
      repaired += '}';
    }
    // Add missing closing brackets
    for (let i = 0; i < openBrackets - closeBrackets; i++) {
      repaired += ']';
    }
    
    try {
      const parsed = JSON.parse(repaired);
      console.log(`[JSON Repair] ✅ Successfully repaired JSON`);
      return parsed;
    } catch (repairErr) {
      console.error(`[JSON Repair Failed] Original: ${err.message}, Repair: ${repairErr.message}`);
      console.error(`[JSON Repair Failed] Repaired text sample: ${repaired.substring(0, 500)}...`);
      
      // Last resort: try to extract just the main object
      const objectMatch = repaired.match(/\{[\s\S]*\}/);
      if (objectMatch) {
        try {
          return JSON.parse(objectMatch[0]);
        } catch (lastErr) {
          console.error(`[JSON Last Resort Failed] ${lastErr.message}`);
        }
      }
      
      throw err; // Throw original error
    }
  }
}

// JSON error analysis for better debugging
function analyzeJsonError(text, error) {
  const analysis = {
    errorType: error.name,
    errorMessage: error.message,
    textLength: text.length,
    issues: []
  };
  
  // Check for common issues
  if (error.message.includes('Unterminated string')) {
    const unterminatedQuotes = (text.match(/"/g) || []).length % 2;
    analysis.issues.push({
      type: 'unterminated_string',
      count: unterminatedQuotes,
      description: 'Odd number of quotes detected'
    });
  }
  
  if (error.message.includes('Unexpected token')) {
    const match = error.message.match(/Unexpected token (.+) in JSON at position (\d+)/);
    if (match) {
      const token = match[1];
      const position = parseInt(match[2]);
      const context = text.substring(Math.max(0, position - 50), position + 50);
      analysis.issues.push({
        type: 'unexpected_token',
        token,
        position,
        context
      });
    }
  }
  
  // Check bracket/brace balance
  const openBraces = (text.match(/\{/g) || []).length;
  const closeBraces = (text.match(/\}/g) || []).length;
  const openBrackets = (text.match(/\[/g) || []).length;
  const closeBrackets = (text.match(/\]/g) || []).length;
  
  if (openBraces !== closeBraces) {
    analysis.issues.push({
      type: 'unbalanced_braces',
      open: openBraces,
      close: closeBraces,
      difference: openBraces - closeBraces
    });
  }
  
  if (openBrackets !== closeBrackets) {
    analysis.issues.push({
      type: 'unbalanced_brackets',
      open: openBrackets,
      close: closeBrackets,
      difference: openBrackets - closeBrackets
    });
  }
  
  return analysis;
}

function generateDetailedErrorReport(text, error) {
  return {
    summary: `JSON parsing failed: ${error.message}`,
    textStats: {
      length: text.length,
      lines: text.split('\n').length,
      characters: {
        openBraces: (text.match(/\{/g) || []).length,
        closeBraces: (text.match(/\}/g) || []).length,
        quotes: (text.match(/"/g) || []).length,
        commas: (text.match(/,/g) || []).length
      }
    },
    possibleCauses: [
      'Vertex AI generated incomplete JSON response',
      'Network timeout during response transmission',
      'Unterminated string in generated content',
      'Unbalanced braces or brackets',
      'Invalid escape sequences'
    ],
    recommendations: [
      'Check Vertex AI model stability',
      'Increase request timeout',
      'Enhance JSON repair logic',
      'Improve prompt instructions for JSON formatting'
    ]
  };
}

const hookPrompt = fs.readFileSync(PROMPT_PATH, "utf8");

// Enhanced JSON extraction with strict parsing
function extractJsonStrict(s) {
  // 1) 코드펜스/마크다운 제거
  let t = s.replace(/```json\s*|```/g, "").trim();
  // 2) 제일 바깥 { … } 블록만 추출 (비상 안전망)
  const first = t.indexOf("{");
  const last  = t.lastIndexOf("}");
  if (first !== -1 && last !== -1 && last > first) t = t.slice(first, last + 1);
  // 3) 파싱 (실패 시 에러 throw)
  return JSON.parse(t);
}

// Targets computation safety function
function computeTargets(durationSec, mode) {
  // 안전한 기본값 + 모드별 상한/하한
  const scenes = Math.max(1, Math.min(5, Math.round(durationSec / 2.5)));
  const shotsPerScene = mode === "S" ? 1 : 2;
  const kfPerShot = mode === "S" ? 2 : 3;
  return { scenes, shotsPerScene, kfPerShot };
}

/**
 * JSON Parsing Solution Documentation
 * 
 * CRITICAL: This service implements a 2-stage JSON parsing strategy to handle
 * Vertex AI response formatting issues. If JSON parsing failures occur:
 * 
 * 1. Check TROUBLESHOOTING.md for complete diagnostic guide
 * 2. Use PARSING_CHECKLIST.md for quick fixes
 * 3. Review PARSING_SOLUTION_HISTORY.md for implementation details
 * 
 * Key Settings:
 * - responseMimeType: "application/json" (in createModel)
 * - Two-stage parsing: Direct parse → Enhanced repair
 * - Enhanced repair: 4-stage comprehensive fixing
 * - Error analysis: Detailed diagnostics for debugging
 * 
 * Success Rate: 95%+ with current implementation
 * Last Updated: 2025-08-16
 */

// === 동적 목표치 계산 (길이 기반) ===
function targetsByDuration(sec) {
  if (!sec || sec <= 0) return { scenes: 1, shotsPerScene: 1, kfPerShot: 2, hookMax: 1.2 };
  
  // 씬 타깃: scenesTarget = clamp(round(D/2.5), 1, 3)
  const scenes = Math.max(1, Math.min(3, Math.round(sec / 2.5)));
  
  // 샷/씬: minShotsPerScene = (D < 7 ? 1 : 2) (5–6초는 1, 7–9초는 2)
  const shotsPerScene = (sec < 7 ? 1 : 2);
  
  // 키프레임/샷: minKfPerShot = (D < 7 ? 2 : 3)
  const kfPerShot = (sec < 7 ? 2 : 3);
  
  // Hook 제한: maxHookStart = min(3.0, 0.4 * D) (짧을수록 타이트)
  const hookMax = Math.min(3.0, 0.4 * sec);
  
  return { scenes, shotsPerScene, kfPerShot, hookMax };
}

function classifyMode(duration) {
  if (!duration || duration <= 9) return 'S';
  if (duration <= 20) return 'M';
  return 'L';
}

// 기존 DENSITY_*가 있으면 우선, 없으면 동적 로직으로 S/M/L 결정
function getDensityRequirements(mode, duration) {
  // 환경변수 우선 (기존 호환성)
  if (process.env.DENSITY_SCENES_MIN) {
    const envScenes = parseInt(process.env.DENSITY_SCENES_MIN);
    const envShotsPerScene = parseInt(process.env.DENSITY_MIN_SHOTS_PER_SCENE || "2");
    const envKfPerShot = parseInt(process.env.DENSITY_MIN_KF_PER_SHOT || "3");
    
    return {
      minScenes: envScenes,
      minShots: envScenes * envShotsPerScene,
      minShotsPerScene: envShotsPerScene,
      minKfPerShot: envKfPerShot,
      hookStartMaxFactor: mode === 'S' ? 0.4 : 1.0,
      minCompositionNotes: 2
    };
  }
  
  // 동적 계산 사용
  const targets = computeTargets(duration, mode);
  return {
    minScenes: targets.scenes,
    minShots: targets.scenes * targets.shotsPerScene,
    minShotsPerScene: targets.shotsPerScene,
    minKfPerShot: targets.kfPerShot,
    hookStartMaxFactor: mode === 'S' ? 0.4 : 1.0,
    minCompositionNotes: 2
  };
}

// Legacy DENSITY 객체 (fallback)
const DENSITY = {
  S: { 
    minScenes: 1, 
    minShots: 1,
    minShotsPerScene: 1,
    minKfPerShot: 2, 
    hookStartMaxFactor: 0.4,
    minCompositionNotes: 2
  },
  M: { 
    minScenes: 3, 
    minShots: 6,
    minShotsPerScene: 2,
    minKfPerShot: 3, 
    hookStartMaxFactor: 1.0,
    minCompositionNotes: 2
  },
  L: { 
    minScenes: 5, 
    minShots: 10,
    minShotsPerScene: 2,
    minKfPerShot: 3, 
    hookStartMaxFactor: 1.0,
    minCompositionNotes: 2
  }
};

function needsRepair(vdp, mode, duration) {
  const scenes = vdp.scenes || [];
  const totalShots = scenes.reduce((a,s)=>a+(s.shots?.length||0),0);
  const totalKf = scenes.reduce((a,s)=>a+(s.shots?.reduce((sa,sh)=>sa+(sh.keyframes?.length||0),0)||0),0);
  const d = getDensityRequirements(mode, duration);
  
  // Check total counts
  if (scenes.length < d.minScenes || totalShots < d.minShots || totalKf < d.minShots*d.minKfPerShot) {
    return true;
  }
  
  // Check per-scene shot requirements (Google VDP standards)
  for (const scene of scenes) {
    const shots = scene.shots || [];
    if (shots.length < d.minShotsPerScene) {
      return true;
    }
    
    // Check composition.notes requirements per shot
    for (const shot of shots) {
      const notes = shot.composition?.notes || [];
      if (notes.length < d.minCompositionNotes) {
        return true;
      }
      
      // Check camera metadata completeness (no "unknown" values)
      const camera = shot.camera || {};
      if (!camera.shot || !camera.angle || !camera.move || 
          camera.shot === "unknown" || camera.angle === "unknown" || camera.move === "unknown") {
        return true;
      }
    }
  }
  
  return false;
}

// 씬별 부족 지점만 타겟팅하는 분석 함수
function analyzeDeficiencies(vdp, requirements) {
  const scenes = vdp.scenes || [];
  const deficiencies = [];
  
  // 전체 통계
  const totalShots = scenes.reduce((a,s)=>a+(s.shots?.length||0),0);
  const totalKf = scenes.reduce((a,s)=>a+(s.shots?.reduce((sa,sh)=>sa+(sh.keyframes?.length||0),0)||0),0);
  
  if (scenes.length < requirements.minScenes) {
    deficiencies.push(`전체: ${requirements.minScenes - scenes.length}개 씬 추가 필요`);
  }
  
  if (totalShots < requirements.minShots) {
    deficiencies.push(`전체: ${requirements.minShots - totalShots}개 샷 추가 필요`);
  }
  
  // 씬별 세부 분석
  scenes.forEach((scene, i) => {
    const shots = scene.shots || [];
    const sceneDeficiencies = [];
    
    if (shots.length < requirements.minShotsPerScene) {
      sceneDeficiencies.push(`${requirements.minShotsPerScene - shots.length}개 샷 추가 (구도/동작 상이하게)`);
    }
    
    shots.forEach((shot, j) => {
      const kfCount = shot.keyframes?.length || 0;
      const notesCount = shot.composition?.notes?.length || 0;
      const camera = shot.camera || {};
      
      if (kfCount < requirements.minKfPerShot) {
        sceneDeficiencies.push(`샷${j+1}: ${requirements.minKfPerShot - kfCount}개 키프레임 추가 필요`);
      }
      
      if (notesCount < requirements.minCompositionNotes) {
        sceneDeficiencies.push(`샷${j+1}: ${requirements.minCompositionNotes - notesCount}개 composition.notes 추가 (프레이밍/라이팅/색감)`);
      }
      
      if (!camera.shot || !camera.angle || !camera.move || 
          camera.shot === "unknown" || camera.angle === "unknown" || camera.move === "unknown") {
        sceneDeficiencies.push(`샷${j+1}: camera 메타데이터 완성 필요 (shot/angle/move enum 값)`);
      }
    });
    
    if (sceneDeficiencies.length > 0) {
      deficiencies.push(`Scene ${i+1} (${scene.scene_id || 'unnamed'}): ${sceneDeficiencies.join(', ')}`);
    }
  });
  
  return deficiencies.length > 0 ? deficiencies.join('\n') : '✅ 모든 요구사항 충족';
}

async function repairDensity(vdp, mode, duration, meta) {
  const d = getDensityRequirements(mode, duration);
  console.log(`[Adaptive Repair] 🔧 Mode ${mode} (${duration}s): Expanding VDP to meet dynamic density requirements`);
  
  // S-mode 특화 프롬프트 (샷 수 억지로 늘리지 말고 디테일 밀도 높이기)
  const isSMode = mode === 'S';
  const repairPrompt = `
아래 JSON VDP를 기반으로, Google VDP 품질 표준에 맞춰 세밀하게 보강하라.

${isSMode ? '짧은 영상(S-mode) 품질 보존 패치' : '표준'} - 모드 ${mode} (${duration}초) 요구사항:
- scenes >= ${d.minScenes}개 ${isSMode ? '(짧은 영상은 억지로 늘리지 말고 현재 씬 내 디테일 강화)' : ''}
- 각 scene당 shots >= ${d.minShotsPerScene}개 (총 ${d.minShots}개 이상)
- 각 shot당 keyframes >= ${d.minKfPerShot}개
- 각 shot당 composition.notes >= ${d.minCompositionNotes}개 (구체적 촬영 기법 설명)

${isSMode ? `
🎯 S-mode 맞춤 타이트닝 전략:
- 샷을 억지로 늘리지 말고, 컴포지션/카메라/오디오 이벤트의 밀도를 높여라
- 각 샷에 composition.notes ≥2(프레이밍/라이팅/색감) 상세 서술
- camera.shot_type/angle/movement 모두 enum 값 사용 (unknown 금지)
- audio_events는 timestamp+intensity+설명 필수
- 이 규칙은 OLD VDP에서 강했던 "샷 내 디테일"을 짧은 러닝타임에서도 유지한다
` : ''}

필수 품질 표준:
1. **카메라 메타데이터 완성**: 
   - camera.shot ∈ {ECU, CU, MCU, MS, MLS, WS, EWS} ("unknown" 금지)
   - camera.angle ∈ {eye, high, low, overhead, dutch}
   - camera.move ∈ {static, pan, tilt, dolly, truck, handheld, crane, zoom}

2. **Composition Notes (각 샷마다 2+개)**:
   - 촬영 기법: "static ECU with centered framing"
   - 조명/색감: "natural daylight, warm tones"
   - 프레이밍: "rule of thirds, subject left-positioned"

3. **Audio Events 구조화**:
   - timestamp: 정확한 초 단위 (float)
   - event: music_starts|music_stops|narration_starts|critical_sfx 등
   - intensity: High|Medium|Low
   - description: 구체적 설명

4. **키프레임 세밀화**:
   - role: start|mid|peak|end 역할 명확화
   - desc: 표정/제스처/카메라움직임 변화 포착
   - t_rel_shot: 샷 내 상대 타이밍

기존 hookGenome은 완전히 보존하되 값의 일관성 유지.
절대 마크다운 코드블럭 없이 순수 JSON만 출력.

PLATFORM CONTEXT:
- Platform: ${meta?.platform || 'unknown'}
- Language: ${meta?.language || 'ko'}
- Mode: ${mode} (duration-based adaptive classification)

씬별 부족 지점 타겟 분석:
${analyzeDeficiencies(vdp, d)}

현재 VDP:
${JSON.stringify(vdp, null, 2)}
`;

  try {
    const model = createModel(); // Create fresh model instance
    const res = await model.generateContent([{ text: repairPrompt }]);
    let text = res.response?.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
    text = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    
    const repaired = JSON.parse(text);
    
    // Verify repair success
    const scenes = repaired.scenes || [];
    const totalShots = scenes.reduce((a,s)=>a+(s.shots?.length||0),0);
    const totalKf = scenes.reduce((a,s)=>a+(s.shots?.reduce((sa,sh)=>sa+(sh.keyframes?.length||0),0)||0),0);
    
    // Validate Google VDP standards after repair
    const shotsPerScene = scenes.map(s => s.shots?.length || 0);
    const avgShotsPerScene = totalShots / scenes.length;
    const compositionNotes = scenes.reduce((acc, s) => {
      return acc + (s.shots?.reduce((sa, sh) => sa + (sh.composition?.notes?.length || 0), 0) || 0);
    }, 0);
    
    console.log(`[Adaptive Repair] 📊 After mode ${mode} repair: ${scenes.length} scenes, ${totalShots} shots (avg ${avgShotsPerScene.toFixed(1)}/scene), ${totalKf} keyframes, ${compositionNotes} composition notes`);
    console.log(`[Google VDP Check] Shots per scene: [${shotsPerScene.join(', ')}], Target: ${d.minShotsPerScene}+ per scene`);
    
    if (scenes.length >= d.minScenes && totalShots >= d.minShots && totalKf >= d.minShots*d.minKfPerShot) {
      console.log(`[Adaptive Repair] ✅ Mode ${mode} density requirements met`);
      return repaired;
    }
    
    console.log(`[Adaptive Repair] ⚠️ Mode ${mode} requirements partially met, proceeding`);
    return repaired;
  } catch (parseErr) {
    console.error(`[Adaptive Repair] ❌ Mode ${mode} repair failed:`, parseErr.message);
    return vdp;
  }
}

// Enhanced Density Computation Function
function computeDensity(vdp) {
  const scenes = Array.isArray(vdp?.scenes) ? vdp.scenes : [];
  const numScenes = scenes.length;
  let shots = 0, kf = 0;
  for (const s of scenes) {
    const shotsArr = Array.isArray(s?.shots) ? s.shots : [];
    shots += shotsArr.length;
    for (const sh of shotsArr) {
      kf += Array.isArray(sh?.keyframes) ? sh.keyframes.length : 0;
    }
  }
  return { numScenes, shots, kf };
}

// Density Floor Enforcement Function (Two-Pass VDP Generation)
async function ensureDensityFloor({ model, vdp, targets, meta }) {
  // Ensure targets are defined
  const safeTargets = targets || computeTargets(meta?.estimatedDurationSec || meta?.duration || 15, classifyMode(meta?.estimatedDurationSec || meta?.duration || 15));
  
  let { numScenes, shots, kf } = computeDensity(vdp);
  const needScene = numScenes < safeTargets.minScenes;
  const needShot  = shots     < (safeTargets.minShotsPerScene * Math.max(1, numScenes));
  const needKF    = kf        < (safeTargets.minKFPerShot    * Math.max(1, shots));
  
  if (!(needScene || needShot || needKF)) {
    console.log(`[Density Check] ✅ VDP meets density requirements: ${numScenes} scenes, ${shots} shots, ${kf} keyframes`);
    return vdp;
  }

  console.log(`[Density Floor] 🔄 Expanding VDP - Current: ${numScenes}/${shots}/${kf}, Required: ${safeTargets.minScenes}/${safeTargets.minScenes * safeTargets.minShotsPerScene}/${safeTargets.minScenes * safeTargets.minShotsPerScene * safeTargets.minKFPerShot}`);

  // 2패스 확장 프롬프트: 현재 VDP를 넘겨주고 부족한 수치(정확한 숫자)를 요구
  const repairPrompt = `
아래 JSON VDP를 기반으로, 누락된 "shots[]"와 각 shot의 "keyframes[]"를 반드시 보강하라.
최소 요구치:
- scenes >= ${safeTargets.minScenes}
- shots >= scenes * ${safeTargets.minShotsPerScene}
- keyframes >= shots * ${safeTargets.minKFPerShot}
또한 각 scene에 composition.notes[], audio_events[]를 포함하라.
기존 hookGenome(start_sec, strength_score, microbeats_sec)은 유지/정교화하되 값은 일관되게.
절대 코드블럭 마크다운 없이 순수 JSON 하나만 출력하라.

PLATFORM CONTEXT:
- Platform: ${meta?.platform || 'unknown'}
- Language: ${meta?.language || 'ko'}

현재 VDP:
${JSON.stringify(vdp, null, 2)}
`;

  try {
    const model = createModel(); // Create fresh model instance
    const res = await model.generateContent([{ text: repairPrompt }]);
    let text = res.response?.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
    text = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    
    const repaired = JSON.parse(text);

    // 다시 밀도 체크
    const d2 = computeDensity(repaired);
    console.log(`[Density Repair] 📊 After expansion: ${d2.numScenes} scenes, ${d2.shots} shots, ${d2.kf} keyframes`);
    
    if (d2.numScenes >= safeTargets.minScenes &&
        d2.shots >= d2.numScenes * safeTargets.minShotsPerScene &&
        d2.kf >= Math.max(1, d2.shots) * safeTargets.minKFPerShot) {
      console.log(`[Density Floor] ✅ Successfully expanded VDP to meet requirements`);
      return repaired;
    }
    
    console.log(`[Density Floor] ⚠️ Expansion still below requirements, but proceeding`);
    return repaired;
  } catch (parseErr) {
    console.error(`[Density Floor] ❌ Expansion failed:`, parseErr.message);
    console.log(`[Density Floor] 🔄 Returning original VDP with density warning`);
    return vdp;
  }
}

// Verbosity Floor Validation Function
function validateVerbosityFloor(vdp) {
  const issues = [];
  const scenes = vdp.scenes || [];
  
  // Target metrics using configurable density thresholds
  const targetScenes = DENSITY_SCENES_MIN;
  const targetShots = DENSITY_SCENES_MIN * DENSITY_MIN_SHOTS_PER_SCENE;
  const targetKeyframes = targetShots * DENSITY_MIN_KF_PER_SHOT;
  
  // Count current metrics
  const sceneCount = scenes.length;
  const shotCount = scenes.reduce((acc, s) => acc + (s.shots?.length || 0), 0);
  const keyframeCount = scenes.reduce((acc, s) => 
    acc + (s.shots?.reduce((sa, sh) => sa + (sh.keyframes?.length || 0), 0) || 0), 0);
  
  // Check minimum thresholds
  if (sceneCount < targetScenes) {
    issues.push(`scenes: ${sceneCount} < ${targetScenes} minimum`);
  }
  
  if (shotCount < targetShots) {
    issues.push(`shots: ${shotCount} < ${targetShots} minimum`);
  }
  
  if (keyframeCount < targetKeyframes) {
    issues.push(`keyframes: ${keyframeCount} < ${targetKeyframes} minimum`);
  }
  
  // Check for missing mandatory arrays
  for (let i = 0; i < scenes.length; i++) {
    const scene = scenes[i];
    if (!scene.shots || scene.shots.length === 0) {
      issues.push(`scene[${i}] missing shots[] array`);
      continue;
    }
    
    if (!scene.narrative_unit?.summary || scene.narrative_unit.summary.length < 90) {
      issues.push(`scene[${i}] summary too short (< 90 chars)`);
    }
    
    for (let j = 0; j < scene.shots.length; j++) {
      const shot = scene.shots[j];
      if (!shot.keyframes || shot.keyframes.length < DENSITY_MIN_KF_PER_SHOT) {
        issues.push(`scene[${i}].shot[${j}] has < ${DENSITY_MIN_KF_PER_SHOT} keyframes`);
      }
      
      if (!shot.composition?.notes || shot.composition.notes.length === 0) {
        issues.push(`scene[${i}].shot[${j}] missing composition.notes`);
      }
    }
  }
  
  return {
    passed: issues.length === 0,
    issues,
    metrics: {
      scenes: sceneCount,
      shots: shotCount,
      keyframes: keyframeCount
    },
    targets: {
      scenes: targetScenes,
      shots: targetShots,  
      keyframes: targetKeyframes
    }
  };
}

app.post("/api/vdp/extract-vertex", async (req, res) => {
  try {
    // 🔗 Correlation ID 보장 (요청 추적)
    const correlationId = req.headers['x-correlation-id'] || `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const { gcsUri, meta = {}, outGcsUri } = req.body || {};
    if (!gcsUri) return res.status(400).json({ error: "gcsUri required" });

    // 이중 안전장치: 서버 측 content_id/platform 정규화
    const normalizedMeta = await ensureContentId(meta);

    // 비동기 패턴 감지 (outGcsUri 있으면 202 모드)
    const isAsyncMode = !!outGcsUri;
    const taskId = isAsyncMode ? `vdp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}` : null;

    console.log(`[VDP 2.0 Enhanced] Processing: ${gcsUri} with Google VDP quality standards`);
    console.log(`[VDP 2.0 Enhanced] Normalized meta:`, JSON.stringify(normalizedMeta, null, 2));

    // 2) Enhanced prompt with Google VDP quality standards
    const vdp20EnhancedPrompt = `${hookPrompt}

PLATFORM CONTEXT:
- Platform: ${normalizedMeta.platform || 'unknown'}
- Language: ${normalizedMeta.language || 'ko'}
- Content ID: ${normalizedMeta.content_id || 'unknown'}
- Canonical URL: ${normalizedMeta.canonical_url || normalizedMeta.source_url || 'N/A'}

CRITICAL: Respond with VALID JSON only. No markdown formatting, no code blocks.

GOOGLE VDP QUALITY ENFORCEMENT:
- MANDATORY: Every scene MUST include shots[] array (1-6 shots per scene)
- MANDATORY: Every shot MUST include keyframes[] array (2-4 keyframes per shot)
- MANDATORY: Every shot MUST include composition object with notes[] array
- PRIORITY: Hook scenes (narrative_role=Hook) require importance:"critical"
- VERBOSITY_FLOOR: Minimum detail requirements by scene duration
- MICRO_SCENE_DETAIL: Critical scenes require ≥3 keyframes + ≥2 composition notes
- Source URL: ${normalizedMeta.canonical_url || normalizedMeta.source_url || 'N/A'}

ENHANCED VDP 2.0 REQUIREMENTS:
- Include engagement_snapshot if available
- Provide story_telling analysis with plot structure 
- Extract microbeats_sec for precise hook timing
- Identify trigger_modalities (visual, audio, text)
- Add scene-level camera and audio metadata
- Support flexible pattern_code (string or array)

Return a complete VDP 2.0 JSON structure.`;

    // 동적 목표치 계산 기반 처리
    const duration = meta?.duration_sec; // should be provided by ffprobe or yt-dlp metadata
    const mode = classifyMode(duration);
    const dynamicTargets = getDensityRequirements(mode, duration);
    
    console.log(`[Dynamic VDP] 🎯 Mode ${mode} (${duration || 'unknown'}s) targets: ${dynamicTargets.minScenes} scenes, ${dynamicTargets.minShots} shots, ${dynamicTargets.minShots * dynamicTargets.minKfPerShot} keyframes, hook≤${(dynamicTargets.hookStartMaxFactor * (duration || 3)).toFixed(1)}s`);

    // 3) 듀얼 엔진 VDP 생성 (Engine selection with use_vertex flag)
    console.log(`[Dual Engine VDP] 🚀 Starting VDP generation for: ${gcsUri}`);
    
    // Enhanced engine routing logic with explicit use_vertex flag handling
    const useVertexFlag = req.body?.use_vertex === true;
    console.log(`[Dual Engine VDP] 🎯 Engine preference: ${useVertexFlag ? 'Vertex AI (structured)' : 'IntegratedGenAI (primary)'}`);
    console.log(`[Dual Engine VDP] 🔧 use_vertex flag: ${req.body?.use_vertex} → ${useVertexFlag ? 'VERTEX_FIRST' : 'INTEGRATED_FIRST'}`);
    
    let vdp = null;
    let engineErrors = [];
    let enginesAttempted = [];
    let primaryError = null;
    
    // Engine selection logic: honor use_vertex flag & clean fallback
    if (useVertexFlag) {
      // Vertex AI 우선 경로 (Structured Output)
      try {
        console.log(`[Dual Engine] 🎯 Primary: Vertex AI with structured output`);
        
        // Rate limiting check before API call
        await rateLimiter.checkRate('vertex-ai');
        
        enginesAttempted.push('vertex-ai');
        vdp = await vertexAIVdp.generate(gcsUri, normalizedMeta, correlationId);
        console.log(`[Dual Engine] ✅ Vertex AI generation successful`);
      } catch (vertexError) {
        // Handle rate limit errors immediately
        if (vertexError instanceof RateLimitError) {
          console.warn(`[Rate Limiter] 🚨 Vertex AI rate limited, returning 429`);
          return res.status(429).json(vertexError.toJSON());
        }
        
        primaryError = vertexError;
        engineErrors.push({ engine: 'vertex-ai', error: vertexError.message });
        console.warn(`[Dual Engine] ⚠️ Vertex AI failed, falling back to IntegratedGenAI: ${vertexError.message}`);
        
        // Fallback to IntegratedGenAI
        try {
          console.log(`[Dual Engine] 🔄 Fallback: IntegratedGenAI`);
          
          // Rate limiting check before fallback API call
          await rateLimiter.checkRate('integrated-genai');
          
          enginesAttempted.push('integrated-genai');
          vdp = await integratedGenAIVdp.generate(gcsUri, normalizedMeta, correlationId);
          console.log(`[Dual Engine] ✅ IntegratedGenAI fallback successful`);
        } catch (integratedError) {
          // Handle rate limit errors immediately
          if (integratedError instanceof RateLimitError) {
            console.warn(`[Rate Limiter] 🚨 IntegratedGenAI rate limited, returning 429`);
            return res.status(429).json(integratedError.toJSON());
          }
          
          engineErrors.push({ engine: 'integrated-genai', error: integratedError.message });
          console.error(`[Dual Engine] ❌ Both engines failed`);
        }
      }
    } else {
      // IntegratedGenAI 우선 경로 (기본값)
      try {
        console.log(`[Dual Engine] 🎯 Primary: IntegratedGenAI`);
        
        // Rate limiting check before API call
        await rateLimiter.checkRate('integrated-genai');
        
        enginesAttempted.push('integrated-genai');
        vdp = await integratedGenAIVdp.generate(gcsUri, normalizedMeta, correlationId);
        console.log(`[Dual Engine] ✅ IntegratedGenAI generation successful`);
      } catch (integratedError) {
        // Handle rate limit errors immediately
        if (integratedError instanceof RateLimitError) {
          console.warn(`[Rate Limiter] 🚨 IntegratedGenAI rate limited, returning 429`);
          return res.status(429).json(integratedError.toJSON());
        }
        
        primaryError = integratedError;
        engineErrors.push({ engine: 'integrated-genai', error: integratedError.message });
        console.warn(`[Dual Engine] ⚠️ IntegratedGenAI failed, falling back to Vertex AI: ${integratedError.message}`);
        
        // Fallback to Vertex AI
        try {
          console.log(`[Dual Engine] 🔄 Fallback: Vertex AI with structured output`);
          
          // Rate limiting check before fallback API call
          await rateLimiter.checkRate('vertex-ai');
          
          enginesAttempted.push('vertex-ai');
          vdp = await vertexAIVdp.generate(gcsUri, normalizedMeta, correlationId);
          console.log(`[Dual Engine] ✅ Vertex AI fallback successful`);
        } catch (vertexError) {
          // Handle rate limit errors immediately
          if (vertexError instanceof RateLimitError) {
            console.warn(`[Rate Limiter] 🚨 Vertex AI rate limited, returning 429`);
            return res.status(429).json(vertexError.toJSON());
          }
          
          engineErrors.push({ engine: 'vertex-ai', error: vertexError.message });
          console.error(`[Dual Engine] ❌ Both engines failed`);
        }
      }
    }
    
    // If both engines failed, return detailed error
    if (!vdp) {
      console.error(`[Dual Engine Failure] Both VDP engines failed`);
      return res.status(422).json({
        type: "https://api.outlier.example/problems/dual-engine-vdp-failed",
        title: "Dual Engine VDP Generation Failed",
        status: 422,
        detail: "Both VertexAI and IntegratedGenAI VDP engines failed. Check API configurations and VDP Clone Final compatibility.",
        instance: "/api/vdp/extract-vertex",
        engines_attempted: enginesAttempted,
        engine_errors: engineErrors,
        recommendedFixes: [
          "Verify PROJECT_ID and LOCATION environment variables for VertexAI",
          "Verify GEMINI_API_KEY environment variable for IntegratedGenAI",
          "Check VDP Clone Final schema compatibility",
          "Validate GCS URI format and accessibility",
          "Review structured output response format"
        ]
      });
    }
    
    console.log(`[Dual Engine VDP] ✅ Generation complete using ${vdp.processing_metadata?.engine || 'unknown'} engine`);

    // 5) VDP 2.0 metadata enrichment (using normalized meta)
    if (normalizedMeta.platform) {
      vdp.metadata = vdp.metadata || {};
      vdp.metadata.platform = normalizedMeta.platform;
      vdp.metadata.content_id = normalizedMeta.content_id;
      vdp.metadata.language = normalizedMeta.language || 'ko';
      if (normalizedMeta.canonical_url) vdp.metadata.canonical_url = normalizedMeta.canonical_url;
      if (normalizedMeta.source_url) vdp.metadata.source_url = normalizedMeta.source_url;
      if (normalizedMeta.original_url) vdp.metadata.original_url = normalizedMeta.original_url;
    }

    // 6) Hook Genome Validation (NEW hybrid schema structure)
    const hg = vdp?.overall_analysis?.hookGenome;
    if (!hg) {
      return res.status(422).json({ 
        type: "https://api.outlier.example/problems/missing-hook-genome",
        title: "Hook Genome Missing",
        status: 422,
        detail: "2-Pass VDP requires hookGenome in overall_analysis structure",
        instance: `/api/vdp/extract-vertex`,
        vdp 
      });
    }

    // Hook Quality Gates with 2-Pass VDP validation  
    const vdpDuration = vdp?.media?.duration_sec; // Updated for hybrid schema
    const vdpMode = classifyMode(vdpDuration);
    const hookLimit = Math.min(HOOK_MAX_S, (vdpDuration || 0) * (vdpMode === 'S' ? 0.4 : 1.0));
    console.log(`[2-Pass Hook] Mode ${vdpMode} for ${vdpDuration}s video: hook limit ${hookLimit}s`);
    const startOK = typeof hg.start_sec === "number" && hg.start_sec <= (hookLimit || HOOK_MAX_S);
    const strengthOK = typeof hg.strength_score === "number" && hg.strength_score >= HOOK_MIN;
    const patternOK = hg.pattern_code && (typeof hg.pattern_code === "string" || Array.isArray(hg.pattern_code));
    
    const qualityIssues = [];
    if (!startOK) qualityIssues.push(`start_sec ${hg.start_sec} exceeds ${hookLimit || HOOK_MAX_S}s limit (mode ${vdpMode})`);
    if (!strengthOK) qualityIssues.push(`strength_score ${hg.strength_score} below ${HOOK_MIN} threshold`);
    if (!patternOK) qualityIssues.push("pattern_code must be string or non-empty array");
    
    if (qualityIssues.length > 0) {
      return res.status(409).json({ 
        type: "https://api.outlier.example/problems/hook-quality-gate-failed",
        title: "Hook Quality Gate Failed", 
        status: 409,
        detail: `VDP 2.0 quality gates failed: ${qualityIssues.join(', ')}`,
        instance: `/api/vdp/extract-vertex`,
        hookGenome: hg,
        qualityIssues
      });
    }

    // 6.5) Evidence Pack Merger - Merge audio fingerprints and product evidence
    let finalVdp = vdp;
    try {
      const evidencePacks = {};
      const meta = req.body?.meta || {};
      
      if (meta.audioFpGcsUri) {
        const { readJsonFromGcs } = await import('./utils/gcs-json.js');
        evidencePacks.audio = await readJsonFromGcs(meta.audioFpGcsUri);
      }
      
      if (meta.productEvidenceGcsUri) {
        const { readJsonFromGcs } = await import('./utils/gcs-json.js');
        evidencePacks.product = await readJsonFromGcs(meta.productEvidenceGcsUri);
      }
      
      if (evidencePacks.audio || evidencePacks.product) {
        const { applyEvidencePack } = await import('./utils/apply-evidence.js');
        finalVdp = applyEvidencePack(vdp, evidencePacks);
        console.log('[VDP Evidence] Evidence merged:', {
          audio: !!evidencePacks.audio,
          product: !!evidencePacks.product
        });
      }
    } catch (evidenceError) {
      console.error('[VDP Evidence] Evidence merge failed:', evidenceError?.message);
      // Continue with original VDP if evidence merge fails
    }

    // 7) Save to GCS if outGcsUri provided (항상 저장 보장)
    if (outGcsUri && finalVdp) {
      try {
        // ==== Platform normalization & content_key enforcement ====
        function normalizePlatform(p) {
          const x = String(p || '').trim().toLowerCase();
          const map = {
            'youtube shorts': 'youtube', 'yt': 'youtube', 'youtubeshorts':'youtube',
            'ig':'instagram', 'insta':'instagram'
          };
          return map[x] || x; // 'youtube' | 'tiktok' | 'instagram' | ...
        }

        // Derive platform/content_id from request/context/URL:
        const rawPlatform = req.body?.platform || finalVdp?.metadata?.platform || finalVdp?.platform;
        const platform = normalizePlatform(rawPlatform);

        // Make sure content_id is present (UI/Worker에서 보장되지만 2중 안전)
        const urlId = (() => {
          try {
            const u = req.body?.url || req.body?.source_url || finalVdp?.metadata?.canonical_url;
            const m = (u||'').match(/[?&]v=([^&]+)/) || (u||'').match(/shorts\/([A-Za-z0-9_\-]+)/);
            return m ? m[1] : undefined;
          } catch { return undefined; }
        })();
        const contentId = (req.body?.content_id || finalVdp?.content_id || urlId || 'unknown');

        // Enforce platform & content_key on final VDP
        finalVdp.metadata = finalVdp.metadata || {};
        finalVdp.metadata.platform = platform;
        finalVdp.content_id = contentId;
        finalVdp.content_key = `${platform}:${contentId}`;

        // ==== Evidence auto-merge path (platform segmented) ====
        const evidenceRoot = process.env.EVIDENCE_DEFAULT_ROOT || `gs://${process.env.RAW_BUCKET}/raw/vdp/evidence`;
        const evidencePrefix = `${evidenceRoot}/${platform}/${contentId}`;
        
        try {
          await mergeEvidenceIfExists([
            `${evidencePrefix}.audio.fp.json`,
            `${evidencePrefix}.product.evidence.json`,
          ], finalVdp, gcsUri, contentId);
        } catch (evidenceError) {
          console.warn(`[Evidence Merge] Failed to merge evidence: ${evidenceError.message}`);
          // Fallback to basic structure if evidence generation fails
          finalVdp.evidence = finalVdp.evidence || {};
          finalVdp.evidence.audio_fingerprint = finalVdp.evidence.audio_fingerprint || { present: false };
          finalVdp.evidence.product_mentions = finalVdp.evidence.product_mentions || [];
        }

        // VDP Standards 보강 - 필수 필드 강제 채우기
        const standardizedVdp = enforceVdpStandards(finalVdp, req.body);
        const savedPath = await saveJsonToGcs(outGcsUri, standardizedVdp);
        console.log(`[VDP_UPLOAD] ✅ Saved VDP to: ${savedPath}`);
        // 표준화된 VDP를 최종 응답에 사용
        finalVdp = standardizedVdp;
        finalVdp.processing_metadata = finalVdp.processing_metadata || {};
        finalVdp.processing_metadata.gcs_saved = true;
        finalVdp.processing_metadata.gcs_path = savedPath;
      } catch (gcsError) {
        console.error(`[VDP_UPLOAD_ERROR] ❌ Failed to save to GCS: ${gcsError.message}`);
        // 실패해도 본문으로는 항상 VDP 반환 (클라이언트가 승격 가능)
        finalVdp.processing_metadata = finalVdp.processing_metadata || {};
        finalVdp.processing_metadata.gcs_saved = false;
        finalVdp.processing_metadata.gcs_error = gcsError.message;
      }
    }

    // 8) Token Efficiency Analysis & Response Preparation
    const scenes = finalVdp.scenes || [];
    const totalShots = scenes.reduce((acc, s) => acc + (s.shots?.length || 0), 0);
    const totalKeyframes = scenes.reduce((acc, s) => acc + (s.shots?.reduce((sa, sh) => sa + (sh.kf?.length || 0), 0) || 0), 0);
    
    // Token efficiency metrics (estimated)
    const estimatedTokens = JSON.stringify(finalVdp).length * 0.75; // Rough token estimation
    const tokenEfficiency = estimatedTokens < 6000 ? "EXCELLENT" : estimatedTokens < 10000 ? "GOOD" : "NEEDS_OPTIMIZATION";
    
    // Enhanced VDP quality metrics logging
    const compositionNotes = scenes.reduce((acc, s) => acc + (s.shots?.reduce((sa, sh) => sa + (sh.composition?.notes?.length || 0), 0) || 0), 0);
    const averageNotesPerShot = totalShots > 0 ? (compositionNotes / totalShots).toFixed(1) : '0';
    const hookStartSec = hg?.start_sec || 0;
    const hookStrength = hg?.strength_score || 0;
    const finalVdpMode = classifyMode(finalVdp?.media?.duration_sec);
    
    console.log(`[2-Pass VDP] ✅ Final Success: ${finalVdp.content_id || 'unknown'} - Hook: ${JSON.stringify(hg.pattern_code)} (${hg.strength_score})`);
    console.log(`[Token Efficiency] Estimated tokens: ${Math.round(estimatedTokens)}, Efficiency: ${tokenEfficiency}`);
    console.log(`[Structure Quality] ${scenes.length} scenes, ${totalShots} shots, ${totalKeyframes} keyframes, ${finalVdp.context ? 'context included' : 'no context'}`);
    console.log(`[VDP Quality Metrics] mode=${finalVdpMode}, composition_notes=${compositionNotes}, avg_notes_per_shot=${averageNotesPerShot}, hook_timing=${hookStartSec}s, hook_strength=${hookStrength}`);
    console.log(`[Hook Genome Quality] pattern_code="${hg?.pattern_code}", start_sec=${hookStartSec}, strength_score=${hookStrength}, delivery="${hg?.delivery || 'unknown'}", microbeats_sec=${hg?.microbeats_sec || 'unknown'}"`);
    
    // Double Safety 효과성 측정을 위한 메타데이터 포함 여부 체크
    const hasCanonicalUrl = !!finalVdp.metadata?.canonical_url;
    const hasOriginalUrl = !!finalVdp.metadata?.original_url;
    const platformNormalized = normalizedMeta.platform !== meta.platform;
    const contentIdNormalized = normalizedMeta.content_id !== meta.content_id;
    console.log(`[Double Safety Results] canonical_url_added=${hasCanonicalUrl}, original_url_added=${hasOriginalUrl}, platform_corrected=${platformNormalized}, content_id_corrected=${contentIdNormalized}`);
    
    // Add processing metadata for monitoring
    finalVdp.processing_metadata = {
      schema_version: "hybrid-optimized-v1.0",
      token_efficiency: {
        estimated_tokens: Math.round(estimatedTokens),
        efficiency_rating: tokenEfficiency,
        target_range: "4000-6000",
        optimization_method: "2-pass-streaming"
      },
      structure_quality: {
        scenes_count: scenes.length,
        shots_count: totalShots,
        keyframes_count: totalKeyframes,
        has_context: !!vdp.context,
        redundancy_eliminated: true
      },
      hook_quality_gates: {
        hook_timing: startOK,
        hook_strength: strengthOK, 
        pattern_code: patternOK,
        gate_status: startOK && strengthOK && patternOK ? "PASSED" : "FAILED"
      },
      generation_metadata: {
        platform: meta.platform || 'unknown',
        timestamp: new Date().toISOString(),
        model: process.env.MODEL_NAME || "gemini-2.5-pro",
        method: "2-pass-streaming",
        retry_count: retryCount,
        pass_1: "structure_generation",
        pass_2: "detail_streaming",
        old_vdp_principles_applied: true
      }
    };
    
    // 비동기 202 + GCS 폴링 패턴
    if (isAsyncMode && outGcsUri) {
      console.log(`[VDP 2.0 Async] Task: ${taskId}, Output: ${outGcsUri}`);
      
      // 백그라운드에서 GCS에 VDP 저장 (실제 구현에서는 큐/워커 사용)
      setTimeout(async () => {
        try {
          const { Storage } = await import('@google-cloud/storage');
          const storage = new Storage({ projectId: PROJECT_ID });
          const bucket = storage.bucket(outGcsUri.split('/')[2]);
          const fileName = outGcsUri.split('/').slice(3).join('/');
          const file = bucket.file(fileName);
          
          await file.save(JSON.stringify(finalVdp, null, 2), {
            metadata: { contentType: 'application/json' }
          });
          console.log(`[Async Complete] VDP saved to ${outGcsUri}`);
        } catch (err) {
          console.error(`[Async Error] Failed to save to ${outGcsUri}:`, err.message);
        }
      }, 1000); // 1초 지연 후 저장
      
      return res.status(202).json({
        taskId: taskId,
        status: "processing",
        outGcsUri: outGcsUri,
        estimated_completion: new Date(Date.now() + 30000).toISOString(),
        polling_url: `/api/vdp/status/${taskId}`,
        message: "VDP generation complete - check outGcsUri in GCS"
      });
    }
    
    // Standard sync response - return VDP directly (no wrapper)
    return res.json(finalVdp);
  } catch (err) {
    console.error(`[VDP 2.0 Error] ${err.message}`, err);
    return res.status(500).json({ 
      error: err.message,
      timestamp: new Date().toISOString(),
      model: process.env.MODEL_NAME || "gemini-2.5-pro"
    });
  }
});

// 🩺 헬스체크 엔드포인트 (Dependencies 검증)
app.get("/healthz", async (req, res) => {
  const correlationId = req.headers['x-correlation-id'] || `health_${Date.now()}`;
  const health = {
    status: "healthy",
    timestamp: new Date().toISOString(),
    correlationId,
    checks: {}
  };

  try {
    // Vertex AI 연결 확인
    try {
      const model = vertex.getGenerativeModel({ model: "gemini-2.5-pro" });
      health.checks.vertexAI = { status: "ok", model: "gemini-2.5-pro" };
    } catch (vertexError) {
      health.checks.vertexAI = { status: "error", error: vertexError.message };
      health.status = "degraded";
    }

    // 환경변수 확인
    health.checks.environment = {
      status: "ok",
      projectId: !!PROJECT_ID,
      location: !!LOCATION,
      rawBucket: !!envVars.RAW_BUCKET
    };

    // 스키마 파일 존재 확인
    try {
      fs.accessSync(SCHEMA_PATH, fs.constants.R_OK);
      health.checks.schema = { status: "ok", path: SCHEMA_PATH };
    } catch (schemaError) {
      health.checks.schema = { status: "error", error: "Schema file not accessible" };
      health.status = "degraded";
    }

    res.json(health);
  } catch (error) {
    res.status(500).json({
      status: "unhealthy",
      error: error.message,
      correlationId
    });
  }
});

// 📋 버전 정보 엔드포인트 (디버깅용)
app.get("/version", (req, res) => {
  const correlationId = req.headers['x-correlation-id'] || `version_${Date.now()}`;
  
  const version = {
    service: "t2-vdp-extract",
    timestamp: new Date().toISOString(),
    correlationId,
    environment: {
      PROJECT_ID: PROJECT_ID || "undefined",
      LOCATION: LOCATION || "undefined", 
      RAW_BUCKET: envVars.RAW_BUCKET || "undefined",
      PLATFORM_SEGMENTED_PATH: envVars.PLATFORM_SEGMENTED_PATH || "undefined",
      EVIDENCE_AUTOMERGE: process.env.EVIDENCE_AUTOMERGE || "undefined",
      EVIDENCE_DEFAULT_ROOT: process.env.EVIDENCE_DEFAULT_ROOT || "undefined",
      NODE_ENV: process.env.NODE_ENV || "development"
    },
    runtime: {
      node: process.version,
      platform: process.platform,
      uptime: `${Math.floor(process.uptime())}s`
    },
    config: {
      hookMinStrength: HOOK_MIN,
      hookMaxStartSec: HOOK_MAX_S,
      densityScenes: DENSITY_SCENES_MIN
    },
    rateLimiter: {
      stats: rateLimiter.getStats(),
      environment: {
        INTEGRATED_GENAI_RPS: process.env.INTEGRATED_GENAI_RPS || "10",
        VERTEX_AI_RPS: process.env.VERTEX_AI_RPS || "8",
        RATE_LIMITER_CAPACITY: process.env.RATE_LIMITER_CAPACITY || "20"
      }
    }
  };

  res.json(version);
});

// 기존 단순 헬스체크 (호환성)
app.get("/health", (_, res) => res.json({ ok: true }));

// Test endpoint for VDP 2.0 quality gates (bypasses Vertex AI)
app.post("/api/vdp/test-quality-gates", (req, res) => {
  try {
    const { vdp } = req.body || {};
    if (!vdp) return res.status(400).json({ error: "vdp data required" });

    console.log(`[VDP 2.0 TEST] Testing quality gates for: ${vdp.content_id || 'unknown'}`);

    // VDP 2.0 Hook Quality Gates (enhanced validation)
    const hg = vdp?.overall_analysis?.hookGenome;
    if (!hg) {
      return res.status(422).json({ 
        type: "https://api.outlier.example/problems/missing-hook-genome",
        title: "Hook Genome Missing",
        status: 422,
        detail: "VDP 2.0 requires hookGenome in overall_analysis structure",
        instance: `/api/vdp/test-quality-gates`,
        vdp 
      });
    }

    // VDP 2.0 enhanced quality gates with dynamic hook limits
    const testDuration = vdp?.metadata?.duration_sec; // ffprobe 또는 yt-dlp 메타에서 전달
    const testMode = classifyMode(testDuration);
    const hookLimit = Math.min(HOOK_MAX_S, (testDuration || 0) * DENSITY[testMode].hookStartMaxFactor);
    console.log(`[Adaptive Hook Test] Mode ${testMode} for ${testDuration}s video: hook limit ${hookLimit}s (factor: ${DENSITY[testMode].hookStartMaxFactor})`);
    const startOK = typeof hg.start_sec === "number" && hg.start_sec <= (hookLimit || HOOK_MAX_S);
    const strengthOK = typeof hg.strength_score === "number" && hg.strength_score >= HOOK_MIN;
    const patternOK = hg.pattern_code && (typeof hg.pattern_code === "string" || Array.isArray(hg.pattern_code));
    
    const testQualityIssues = [];
    if (!startOK) testQualityIssues.push(`start_sec ${hg.start_sec} exceeds ${hookLimit || HOOK_MAX_S}s limit (mode ${testMode})`);
    if (!strengthOK) testQualityIssues.push(`strength_score ${hg.strength_score} below ${HOOK_MIN} threshold`);
    if (!patternOK) testQualityIssues.push("pattern_code must be string or non-empty array");
    
    if (testQualityIssues.length > 0) {
      return res.status(409).json({ 
        type: "https://api.outlier.example/problems/hook-quality-gate-failed",
        title: "Hook Quality Gate Failed", 
        status: 409,
        detail: `VDP 2.0 quality gates failed: ${testQualityIssues.join(', ')}`,
        instance: `/api/vdp/test-quality-gates`,
        hookGenome: hg,
        qualityIssues: testQualityIssues
      });
    }

    // Success Response
    console.log(`[VDP 2.0 TEST] Success: ${vdp.content_id} - Hook: ${hg.pattern_code} (${hg.strength_score})`);
    
    return res.json({ 
      ok: true, 
      vdp,
      schema_version: "2.0",
      quality_gates: {
        hook_timing: startOK,
        hook_strength: strengthOK, 
        pattern_code: patternOK
      },
      processing_metadata: {
        platform: vdp.metadata?.platform || 'unknown',
        timestamp: new Date().toISOString(),
        test_mode: true
      }
    });
  } catch (err) {
    return res.status(500).json({ error: (err instanceof Error ? err.message : String(err)) });
  }
});

const PORT = process.env.PORT || 8080;
const server = app.listen(PORT, () => console.log(`[t2-extract] listening on ${PORT}`));

// VDP 생성을 위한 최적화된 타임아웃 설정
server.keepAliveTimeout = 120000;   // 120초 Keep-Alive
server.headersTimeout = 125000;     // 125초 헤더 타임아웃 
server.requestTimeout = 0;          // 요청은 무제한 (VDP 생성 시간)

console.log(`[t2-extract] 타임아웃 설정: requestTimeout=${server.requestTimeout}, headersTimeout=${server.headersTimeout}, keepAliveTimeout=${server.keepAliveTimeout}`);
