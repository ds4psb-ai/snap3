# Vertex AI Integration Rules

## Region Requirements
- **Required Region**: us-central1 (NOT global, NOT us-west1)
- **Model Support**: gemini-2.5-pro 모델 지원 확인된 리전만 사용
- **Socket Timeout**: us-west1 region 사용 금지 (socket timeout 빈발)

## Model Instance Management
- **Fresh Model Pattern**: 요청별 새 모델 인스턴스 생성 (`createModel()` 패턴)
- **No Reuse**: 모델 인스턴스 재사용 금지 (서버 컨텍스트에서 불안정)
- **Cleanup**: 요청 완료 후 모델 인스턴스 정리

## File Data Pattern
**Standard GCS Video Delivery**:
```javascript
{
  fileData: {
    fileUri: "gs://bucket/path/video.mp4",
    mimeType: "video/mp4"
  }
}
```

## Response Processing
- **Text Parsing**: 텍스트 응답 → JSON 파싱 (Structured Output보다 안정적)
- **Error Handling**: 파싱 실패 시 재시도 로직 구현
- **Validation**: 응답 구조 검증 후 처리

## Error Recovery Strategy
**Priority Order**:
1. **Region Verification**: us-central1 리전 설정 확인
2. **Model Configuration**: gemini-2.5-pro 모델 설정 검증
3. **Network Check**: Socket/network 연결 상태 확인
4. **Prompt Adjustment**: 프롬프트 수정 (최후 수단)

## Anti-Patterns (NEVER)
- **Global Region**: global region 사용 (gemini 모델 미지원)
- **West Region**: us-west1 region 사용 (socket timeout 빈발)
- **Model Reuse**: 모델 인스턴스 재사용 (서버 컨텍스트에서 불안정)
- **Structured Output**: Structured Output 의존 (텍스트 파싱보다 불안정)
- **Prompt First**: Socket 오류 시 모델/프롬프트 수정 우선 (region 검증 후순위)

## Implementation Guidelines

### Model Creation
```javascript
// ✅ Correct pattern
const model = await vertexAI.createModel({
  region: 'us-central1',
  model: 'gemini-2.5-pro'
});

// ❌ Anti-pattern
const model = await vertexAI.createModel({
  region: 'global', // NOT supported
  model: 'gemini-2.5-pro'
});
```

### File Processing
```javascript
// ✅ Correct fileData pattern
const request = {
  fileData: {
    fileUri: gcsUri,
    mimeType: 'video/mp4'
  },
  prompt: "Analyze this video..."
};

// ❌ Anti-pattern
const request = {
  file: gcsUri, // Wrong property name
  prompt: "Analyze this video..."
};
```

### Error Handling
```javascript
// ✅ Correct error recovery
try {
  const response = await model.generateContent(request);
  return parseTextToJson(response.text);
} catch (error) {
  if (error.code === 'SOCKET_TIMEOUT') {
    // 1. Check region configuration
    await verifyRegion('us-central1');
    // 2. Verify model settings
    await verifyModel('gemini-2.5-pro');
    // 3. Retry with fresh model instance
    return await retryWithFreshModel(request);
  }
  throw error;
}
```

## Performance Optimization
- **Connection Pooling**: 모델 인스턴스 풀링 (단일 요청 내에서만)
- **Timeout Settings**: 적절한 timeout 설정 (30-60초)
- **Retry Logic**: 지수 백오프로 재시도
- **Resource Cleanup**: 메모리 누수 방지를 위한 정리

## Monitoring & Debugging
- **Region Metrics**: us-central1 리전 사용률 모니터링
- **Error Tracking**: Socket timeout, 모델 오류 추적
- **Performance Logs**: 응답 시간, 처리량 로깅
- **Resource Usage**: 메모리, CPU 사용량 모니터링

## Error Codes
- `VERTEX_AI_REGION_ERROR` — Invalid region. Use us-central1 only
- `VERTEX_AI_MODEL_ERROR` — Model configuration error. Verify gemini-2.5-pro
- `VERTEX_AI_SOCKET_TIMEOUT` — Socket timeout. Check network and retry
- `VERTEX_AI_PARSING_ERROR` — Response parsing failed. Retry with text parsing

## Auto-attach Triggers
This rule auto-attaches when working on:
- Vertex AI integration
- Gemini model configuration
- Video analysis APIs
- AI model deployment
- Region configuration
- Model instance management
- File processing workflows
- Error recovery systems
- Performance optimization
- Monitoring and debugging

## Reference Files
- @CLAUDE.md (Vertex AI 통합 필수 규칙)
- @lib/vertex-ai/
- @scripts/vertex-retry-output.log
