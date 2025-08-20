import { NextRequest, NextResponse } from 'next/server';

interface ValidationRequest {
  data: any;
  schema: string;
  timestamp: string;
}

interface ValidationResponse {
  valid: boolean;
  errors: Array<{
    instancePath: string;
    message: string;
    keyword: string;
  }>;
  schema: string;
  timestamp: string;
}

export async function POST(request: NextRequest) {
  try {
    const { data, schema, timestamp }: ValidationRequest = await request.json();

    if (!data || !schema) {
      return NextResponse.json(
        { error: 'Data and schema are required' },
        { status: 400 }
      );
    }

    // ClaudeCode 8080 서버의 스키마 검증 호출
    const validationResult = await validateWithClaudeCode(data, schema, timestamp);

    return NextResponse.json(validationResult);

  } catch (error) {
    console.error('Schema validation error:', error);
    return NextResponse.json(
      { error: 'Schema validation failed' },
      { status: 500 }
    );
  }
}

async function validateWithClaudeCode(data: any, schema: string, timestamp: string): Promise<ValidationResponse> {
  try {
    // ClaudeCode 8080 서버에 스키마 검증 요청
    const response = await fetch('http://localhost:8080/api/schema/validate', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({ 
        data, 
        schema,
        timestamp 
      })
    });

    if (!response.ok) {
      // ClaudeCode 서버가 응답하지 않는 경우 기본 검증 수행
      console.warn('ClaudeCode schema validation server not available, using fallback validation');
      return performFallbackValidation(data, schema, timestamp);
    }

    const result = await response.json();
    return result;

  } catch (error) {
    console.error('ClaudeCode validation request failed:', error);
    // ClaudeCode 서버 연결 실패 시 기본 검증 수행
    return performFallbackValidation(data, schema, timestamp);
  }
}

function performFallbackValidation(data: any, schema: string, timestamp: string): ValidationResponse {
  // 기본 VDP 스키마 검증 (fallback)
  const errors: Array<{ instancePath: string; message: string; keyword: string }> = [];

  // 필수 필드 검증
  const requiredFields = ['content_id', 'content_key', 'metadata', 'overall_analysis'];
  
  for (const field of requiredFields) {
    if (!data[field]) {
      errors.push({
        instancePath: `/${field}`,
        message: `필수 필드 '${field}'가 누락되었습니다.`,
        keyword: 'required'
      });
    }
  }

  // content_id 형식 검증
  if (data.content_id && !/^[A-Z]\d{6}$/.test(data.content_id)) {
    errors.push({
      instancePath: '/content_id',
      message: 'content_id는 C###### 형식이어야 합니다.',
      keyword: 'pattern'
    });
  }

  // content_key 형식 검증
  if (data.content_key && !data.content_key.includes(':')) {
    errors.push({
      instancePath: '/content_key',
      message: 'content_key는 platform:content_id 형식이어야 합니다.',
      keyword: 'format'
    });
  }

  // metadata 검증
  if (data.metadata) {
    if (!data.metadata.platform) {
      errors.push({
        instancePath: '/metadata/platform',
        message: 'metadata.platform이 필요합니다.',
        keyword: 'required'
      });
    }

    if (data.metadata.platform && !['youtube', 'instagram', 'tiktok'].includes(data.metadata.platform)) {
      errors.push({
        instancePath: '/metadata/platform',
        message: 'platform은 youtube, instagram, tiktok 중 하나여야 합니다.',
        keyword: 'enum'
      });
    }
  }

  // overall_analysis 검증
  if (data.overall_analysis) {
    if (data.overall_analysis.hookGenome) {
      const hookGenome = data.overall_analysis.hookGenome;
      
      if (hookGenome.start_sec && hookGenome.start_sec > 3.0) {
        errors.push({
          instancePath: '/overall_analysis/hookGenome/start_sec',
          message: 'Hook 시작 시간은 3.0초 이하여야 합니다.',
          keyword: 'maximum'
        });
      }

      if (hookGenome.strength_score && hookGenome.strength_score < 0.70) {
        errors.push({
          instancePath: '/overall_analysis/hookGenome/strength_score',
          message: 'Hook 강도는 0.70 이상이어야 합니다.',
          keyword: 'minimum'
        });
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    schema,
    timestamp
  };
}
