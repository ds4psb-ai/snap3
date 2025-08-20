'use client';

import { useState } from 'react';
import SchemaValidator from '@/components/SchemaValidator';

// 샘플 VDP 데이터
const sampleVdpData = {
  content_id: "C123456",
  content_key: "youtube:C123456",
  metadata: {
    platform: "youtube",
    view_count: 1000000,
    like_count: 50000,
    comment_count: 2000,
    share_count: 1000,
    upload_date: "2025-01-15T10:30:00Z",
    source_url: "https://www.youtube.com/watch?v=example",
    video_origin: "Real-Footage",
    hashtags: ["#example", "#test"],
    cta_types: ["subscribe", "like"],
    original_sound: true
  },
  overall_analysis: {
    hookGenome: {
      start_sec: 2.5,
      strength_score: 0.85,
      pattern_code: "HOOK_001",
      delivery: "Direct",
      trigger_modalities: ["visual", "audio"]
    },
    emotional_arc: "Rising",
    asr_transcript: "This is a sample transcript...",
    ocr_text: "Sample OCR text..."
  },
  scenes: [
    {
      scene_id: "scene_001",
      start_time: 0,
      end_time: 8,
      narrative_type: "Hook",
      shot_details: {
        camera_movement: "Static",
        keyframes: ["frame_001", "frame_002"],
        composition: "Center"
      },
      style_analysis: {
        lighting: "Natural",
        mood_palette: "Bright",
        edit_grammar: "Fast"
      }
    }
  ],
  product_mentions: [],
  service_mentions: [],
  default_lang: "ko",
  load_timestamp: "2025-01-15T10:30:00Z",
  load_date: "2025-01-15"
};

// 잘못된 VDP 데이터 (테스트용)
const invalidVdpData = {
  content_id: "invalid",
  content_key: "invalid_key",
  metadata: {
    platform: "invalid_platform"
  },
  overall_analysis: {
    hookGenome: {
      start_sec: 5.0, // 3.0초 초과
      strength_score: 0.50 // 0.70 미만
    }
  }
};

export default function SchemaValidatorPage() {
  const [currentData, setCurrentData] = useState<any>(null);
  const [validationResult, setValidationResult] = useState<any>(null);

  const handleValidationChange = (result: any) => {
    setValidationResult(result);
    console.log('검증 결과:', result);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">VDP 스키마 검증</h1>
          <p className="text-gray-600">VDP 데이터의 스키마 검증을 수행합니다.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* 테스트 버튼들 */}
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-gray-800">테스트 데이터</h2>
            
            <div className="space-y-3">
              <button
                onClick={() => setCurrentData(sampleVdpData)}
                className="w-full p-3 bg-green-100 hover:bg-green-200 text-green-800 rounded-lg transition-colors"
              >
                ✅ 유효한 VDP 데이터 테스트
              </button>
              
              <button
                onClick={() => setCurrentData(invalidVdpData)}
                className="w-full p-3 bg-red-100 hover:bg-red-200 text-red-800 rounded-lg transition-colors"
              >
                ❌ 잘못된 VDP 데이터 테스트
              </button>
              
              <button
                onClick={() => setCurrentData(null)}
                className="w-full p-3 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-lg transition-colors"
              >
                🔄 데이터 초기화
              </button>
            </div>

            {/* 현재 데이터 표시 */}
            {currentData && (
              <div className="mt-6">
                <h3 className="text-lg font-medium text-gray-800 mb-2">현재 데이터:</h3>
                <div className="bg-white p-4 rounded-lg border border-gray-200">
                  <pre className="text-xs text-gray-700 overflow-auto max-h-40">
                    {JSON.stringify(currentData, null, 2)}
                  </pre>
                </div>
              </div>
            )}
          </div>

          {/* 검증 결과 */}
          <div>
            <h2 className="text-xl font-semibold text-gray-800 mb-4">검증 결과</h2>
            <SchemaValidator 
              vdpData={currentData}
              onValidationChange={handleValidationChange}
              showDetails={true}
            />
            
            {/* 검증 결과 상세 정보 */}
            {validationResult && (
              <div className="mt-6">
                <h3 className="text-lg font-medium text-gray-800 mb-2">검증 상세 정보:</h3>
                <div className="bg-white p-4 rounded-lg border border-gray-200">
                  <div className="space-y-2 text-sm">
                    <p><strong>검증 상태:</strong> {validationResult.valid ? '✅ 통과' : '❌ 실패'}</p>
                    <p><strong>스키마:</strong> {validationResult.schema}</p>
                    <p><strong>검증 시간:</strong> {new Date(validationResult.timestamp).toLocaleString()}</p>
                    <p><strong>오류 수:</strong> {validationResult.errors?.length || 0}개</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
