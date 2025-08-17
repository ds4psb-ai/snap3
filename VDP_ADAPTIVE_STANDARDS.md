# VDP 적응형 품질 표준 — Google VDP 통합 완료

## 🎯 개요
OLD VDP의 일관된 품질 표준과 NEW VDP의 Hook Genome 지능형 분석을 통합하여, 모드별 적응형 요구사항을 적용한 Google VDP 표준 준수 시스템.

### Default Generation Controls
- maxOutputTokens: **16K**
- temperature: **0.1**
- Hook Gate: start_sec ≤ **3.0s**, strength_score ≥ **0.70**
- S-Mode(≤9s): hook ≤ **0.4×duration**

## 📊 적응형 밀도 테이블 (Enhanced DENSITY)

### S-Mode (Short ≤9s)
```javascript
S: { 
  minScenes: 1,           // 최소 씬 수
  minShots: 1,            // 전체 최소 샷 수  
  minShotsPerScene: 1,    // 씬당 최소 샷 수
  minKfPerShot: 2,        // 샷당 최소 키프레임
  hookStartMaxFactor: 0.4, // Hook 제약: ≤0.4×duration
  minCompositionNotes: 2   // 샷당 최소 composition notes
}
```
**적용 대상**: TikTok 짧은 콘텐츠, Instagram Stories, 마이크로 콘텐츠
**Hook 제약**: 7초 영상 → Hook ≤2.8초

### M-Mode (Medium 10-20s)  
```javascript
M: { 
  minScenes: 3,           // 3개 씬 (스토리 전개)
  minShots: 6,            // 3×2 = 6샷 총합
  minShotsPerScene: 2,    // 씬당 최소 2샷
  minKfPerShot: 3,        // 샷당 3키프레임 
  hookStartMaxFactor: 1.0, // Hook 제약: ≤3초 고정
  minCompositionNotes: 2   // 샷당 2+ 상세 노트
}
```
**적용 대상**: 표준 소셜미디어 콘텐츠, 제품 설명, 튜토리얼
**Hook 제약**: 15초 영상 → Hook ≤3초

### L-Mode (Long >20s)
```javascript
L: { 
  minScenes: 5,           // 5개 씬 (풍부한 스토리)
  minShots: 10,           // 5×2 = 10샷 총합  
  minShotsPerScene: 2,    // 씬당 최소 2샷
  minKfPerShot: 3,        // 샷당 3키프레임
  hookStartMaxFactor: 1.0, // Hook 제약: ≤3초 고정
  minCompositionNotes: 2   // 샷당 2+ 상세 노트
}
```
**적용 대상**: YouTube Shorts 긴 형태, 복잡한 스토리텔링
**Hook 제약**: 30초+ 영상 → Hook ≤3초

## 🎬 Google VDP 품질 표준

### 1. Camera 메타데이터 완성도
**필수 Enum 준수** ("unknown" 값 금지):
- `camera.shot` ∈ {ECU, CU, MCU, MS, MLS, WS, EWS}
- `camera.angle` ∈ {eye, high, low, overhead, dutch}  
- `camera.move` ∈ {static, pan, tilt, dolly, truck, handheld, crane, zoom}

### 2. Composition Notes 요구사항 (2+개/샷)
**필수 카테고리별 설명**:
1. **촬영 기법**: "static ECU with centered framing"
2. **조명/색감**: "natural daylight, warm tones"  
3. **프레이밍**: "rule of thirds, subject left-positioned"

### 3. Audio Events 구조화
**필수 필드**:
- `timestamp`: 정확한 초 단위 (float)
- `event`: music_starts|music_stops|narration_starts|critical_sfx
- `intensity`: High|Medium|Low
- `description`: 구체적 오디오 변화 설명

### 4. Keyframes 세밀화 
**역할별 세분화**:
- `role`: start|mid|peak|end
- `desc`: 표정/제스처/카메라움직임 변화 세밀 포착
- `t_rel_shot`: 샷 내 상대적 타이밍

## 🔧 Two-Pass 생성 시스템

### Pass-1: 초기 VDP 생성
- Gemini 2.5 Pro 기반 기본 VDP 구조 생성
- Hook Genome 통합 (start_sec, pattern_code, strength_score)
- 기본 scenes/shots/keyframes 구조

### Pass-2: Google VDP 표준 검증 & 보강
**needsRepair() 다층 검증**:
1. **총량 검증**: 전체 scenes/shots/keyframes 수
2. **씬별 검증**: 각 씬의 샷 수 ≥ minShotsPerScene
3. **샷별 검증**: composition.notes 수 ≥ minCompositionNotes  
4. **메타데이터 검증**: camera 완성도 ("unknown" 금지)

**repairDensity() 모드별 보강**:
- 부족한 구조 요소 자동 생성
- Google VDP 표준에 맞는 상세 정보 추가
- Hook Genome 일관성 유지

## 🧪 검증 및 테스트

### 자동 품질 검증
```javascript
// 씬별 샷 요구사항 검증
for (const scene of scenes) {
  const shots = scene.shots || [];
  if (shots.length < d.minShotsPerScene) {
    return true; // 수리 필요
  }
  
  // 샷별 composition notes 검증
  for (const shot of shots) {
    const notes = shot.composition?.notes || [];
    if (notes.length < d.minCompositionNotes) {
      return true; // 수리 필요
    }
    
    // Camera 메타데이터 완성도 검증
    const camera = shot.camera || {};
    if (!camera.shot || camera.shot === "unknown") {
      return true; // 수리 필요
    }
  }
}
```

### 테스트 시나리오 결과
1. **OLD VDP 수준 (고품질)**: ✅ 수리 불필요
2. **NEW VDP 가변밀도**: 🔧 수리 필요 → 정확한 개선점 식별
3. **S-Mode 짧은 영상**: ✅ 최소 요구사항 충족

## 🎉 통합 효과

### OLD VDP 대비 개선사항
- ✅ **적응형 지능**: 영상 길이별 최적화된 요구사항
- ✅ **Hook Genome 통합**: 우수한 바이럴 패턴 분석
- ✅ **동적 제약**: 짧은 영상 0.4×duration Hook 허용

### NEW VDP 대비 개선사항  
- ✅ **일관된 품질**: 영상별 밀도 편차 문제 해결
- ✅ **Google 표준**: 완전한 Camera/Composition 메타데이터
- ✅ **구조화된 오디오**: 타임스탬프 기반 Audio Events

### 생산성 향상
- ✅ **안정적 파싱**: Text→JSON 방식으로 견고성 확보
- ✅ **하위 호환성**: 기존 환경변수/API 완전 보존
- ✅ **모드별 최적화**: 과도한 분석 방지로 성능 향상

## 📋 구현 완료 체크리스트

- [x] **Enhanced DENSITY 테이블**: 모드별 세분화된 요구사항
- [x] **needsRepair() 다층 검증**: 총량 + 씬별 + 샷별 + 메타데이터
- [x] **repairDensity() Google 표준**: 상세 품질 요구사항 통합
- [x] **Camera 메타데이터 완성**: "unknown" 값 방지, 완전한 enum 준수
- [x] **Composition Notes 2+**: 촬영기법, 조명, 프레이밍 설명
- [x] **Audio Events 구조화**: timestamp + intensity + description
- [x] **Hook Genome 보존**: 동적 제약과 함께 완전 통합
- [x] **Text→JSON 파싱**: Structured Output보다 안정적인 접근
- [x] **테스트 검증**: 3가지 시나리오 완전 검증
- [x] **문서화**: CLAUDE.md 업데이트 및 표준 통합

## 🔮 향후 확장성

- **추가 모드**: XS(≤5s), XL(>60s) 모드 확장 가능
- **플랫폼 특화**: TikTok/Instagram/YouTube 별 세부 요구사항 적용
- **품질 레벨**: Premium/Standard/Basic 품질 등급별 차등 적용
- **실시간 학습**: VDP 품질 패턴 학습으로 자동 개선

**결론**: OLD VDP의 일관된 디테일과 NEW VDP의 지능형 Hook 분석을 성공적으로 통합하여, Google VDP 품질 표준을 완전히 준수하면서도 적응형 지능을 갖춘 차세대 VDP 생성 시스템을 구축했습니다.