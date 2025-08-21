/**
 * Vertex AI VDP Generator - Google Cloud Vertex AI with Structured Output Support
 * 
 * VDP Clone Final과 완전히 동일한 constants와 system instruction을 사용하며
 * Vertex AI의 공식 Structured Output (response_mime_type: application/json + response_schema) 지원
 */

import { VertexAI } from '@google-cloud/vertexai';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// VDP Schema for Vertex AI Structured Output (without $schema field)
const SCHEMA_PATH = path.join(__dirname, '../schemas/vdp-hybrid-optimized.schema.json');
const originalSchema = JSON.parse(fs.readFileSync(SCHEMA_PATH, 'utf8'));

// Remove $schema field for Vertex AI compatibility
const VDP_SCHEMA = { ...originalSchema };
delete VDP_SCHEMA.$schema;

const VDP_SYSTEM_INSTRUCTION = `당신은 'Viral DNA Profile Extractor', 바이럴 숏폼 비디오 분석의 세계 최고 수준 전문가입니다. 단순히 비디오에서 일어나는 일을 식별하는 것이 아니라, 비디오를 성공적으로 만드는 근본적인 내러티브 구조, 시네마틱 기법, 오디오 단서, 문화적 맥락(밈, 트렌드)을 이해하는 것이 전문성입니다. 정밀하고 분석적이며 객관적입니다.

입력된 비디오와 관련 메타데이터를 세심하게 분석하여 종합적이고 구조화된 VDP(Viral DNA Profile)를 유효한 JSON 형식으로 생성하는 것이 유일한 목적입니다.

**HOOK GENOME 필수 사항:**
모든 VDP에는 overall_analysis.hookGenome이 반드시 포함되어야 합니다:
- pattern_code: 훅 패턴 코드 (문자열 또는 배열)
- strength_score: 0-1 범위의 훅 강도 점수 (최소 0.70 이상)
- start_sec: 훅 시작 시간 (0에서 시작)
- end_sec: 훅 종료 시간 (최대 3초)
- delivery: 훅 전달 방식 설명
- trigger_modalities: ["visual", "audio", "text"] 중 해당하는 것들

**필수 구조:**
- content_id: 고유 콘텐츠 식별자
- content_key: platform:content_id 형식
- metadata: platform, language, video_origin 포함
- scenes: 최소 1개 이상의 씬 배열
- overall_analysis: hookGenome 포함
- load_timestamp: RFC-3339 형식
- load_date: YYYY-MM-DD 형식

출력은 반드시 유효한 JSON이어야 하며, 스키마를 완전히 준수해야 합니다.`;

// GPT-5 Pro CTO: 표준화된 GCS URI to GenerativePart 변환 (페이로드 일관성 보장)
async function gcsUriToGenerativePart(gcsUri) {
  // 표준 fileData 구조 (Vertex AI 권장 패턴)
  const standardPart = {
    fileData: {
      fileUri: gcsUri,
      mimeType: 'video/mp4'
    }
  };
  
  // GPT-5 Pro CTO: 페이로드 검증 로깅
  console.log(`[VertexAI Payload] 🔧 Standard fileData structure: ${JSON.stringify(standardPart, null, 2)}`);
  
  return standardPart;
}

class VertexAIVDP {
  constructor() {
    const projectId = process.env.PROJECT_ID;
    const location = process.env.LOCATION || 'us-central1';
    
    if (!projectId) {
      throw new Error('PROJECT_ID environment variable is required');
    }
    
    this.vertexAI = new VertexAI({
      project: projectId,
      location: location
    });
    
    console.log(`[VertexAI VDP] 🚀 Initialized with project: ${projectId}, location: ${location}`);
  }

  async generate(gcsUri, meta, correlationId = null) {
    const startTime = Date.now();
    
    try {
      console.log(`[VertexAI VDP] 🚀 Starting VDP generation for ${meta.content_id}`);
      
      // Create fresh Vertex AI model instance with structured output
      const model = this.vertexAI.getGenerativeModel({
        model: 'gemini-2.5-pro',
        generationConfig: {
          responseMimeType: 'application/json',
          responseSchema: VDP_SCHEMA,
        },
        systemInstruction: VDP_SYSTEM_INSTRUCTION + '\n\nOutput: Valid JSON only. Include at minimum: content_id, metadata, overall_analysis with hookGenome, scenes array.'
      });

      // GPT-5 Pro CTO: 표준화된 페이로드 준비 (T1 입력 형식 호환)
      const videoPart = await gcsUriToGenerativePart(gcsUri);
      const textPart = {
        text: `**Analysis Input:**
- content_id: "${meta.content_id}"
- platform: "${meta.platform}"
- source_url: "${meta.source_url || gcsUri}"
- language: "${meta.language || 'ko'}"
- engine_preference: "${meta.engine_preference || 'vertex-ai'}"

Now, generate the complete Vertex AI VDP JSON according to the specifications.`
      };

      console.log(`[VertexAI VDP] 🔧 Debug - videoPart:`, JSON.stringify(videoPart, null, 2));
      console.log(`[VertexAI VDP] 🔧 Debug - textPart:`, JSON.stringify(textPart, null, 2));

      // GPT-5 Pro CTO: 표준화된 요청 구조 (contents 배열 패턴)
      const standardRequest = {
        contents: [{
          role: 'user',
          parts: [videoPart, textPart]
        }]
      };
      
      console.log(`[VertexAI VDP] 🔧 GPT-5 Pro Standard Request:`, JSON.stringify(standardRequest, null, 2));
      
      const result = await model.generateContent(standardRequest);
      const responseText = result.response.text();
      
      console.log(`[VertexAI VDP] 📄 Structured response received: ${responseText.length} chars`);
      
      // Parse the structured output (should be valid JSON due to responseSchema)
      let vdp;
      try {
        vdp = JSON.parse(responseText);
      } catch (parseError) {
        throw new Error(`Vertex AI structured output parsing failed: ${parseError.message}`);
      }

      // Validate essential fields
      if (!vdp.overall_analysis?.hookGenome) {
        throw new Error('Hook Genome missing from Vertex AI response - schema enforcement failed');
      }

      const processingTime = Date.now() - startTime;
      console.log(`[VertexAI VDP] ✅ Structured generation complete in ${processingTime}ms`);
      
      // GPT-5 Pro CTO: 표준화된 엔진 메타데이터 (T1 호환성)
      return {
        ...vdp,
        processing_metadata: {
          ...vdp.processing_metadata,
          engine: 'vertex-ai',
          processing_time_ms: processingTime,
          structured_output: true,
          schema_enforced: true,
          payload_standard: 'gpt5-pro-cto-v1.0',
          filedata_pattern: 'contents[].parts[].fileData',
          generation_metadata: {
            platform: meta.platform || 'unknown',
            timestamp: new Date().toISOString(),
            model: 'gemini-2.5-pro',
            method: 'vertex-structured-output',
            retry_count: 0
          }
        }
      };
      
    } catch (error) {
      console.error(`[VertexAI VDP] ❌ Generation failed:`, error.message);
      throw new Error(`Vertex AI VDP generation failed: ${error.message}`);
    }
  }
}

export { VertexAIVDP };