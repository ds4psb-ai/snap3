# VDP 품질 체크리스트 (GPT-5 Pro 컨설팅 기반)

## 📊 **품질 게이트 기준**

### **Hook Gate (필수)**
- **startSec**: ≤ 3.0초
- **strength**: ≥ 0.70
- **필수 필드**: startSec, endSec, strength, trigger_modalities[], microbeats_sec[]

### **Verbosity Floor (밀도 기준)**
- **일반 영상**: ≥4 scenes / ≥8 shots / ≥20 keyframes
- **Short-mode (30초 이하)**: ≥2 scenes / ≥4 shots / ≥8 keyframes
- **Mandatory Arrays**: 모든 scene에 shots[] 필수, 모든 shot에 keyframes[] 필수

---

## ✅ **품질 체크리스트**

### **1. Hook Genome 검증**
- [ ] `startSec` 필드 존재 (0-10초 범위)
- [ ] `endSec` 필드 존재 (0-10초 범위)
- [ ] `strength` 필드 존재 (0-1.0 범위)
- [ ] `trigger_modalities[]` 배열 존재
- [ ] `microbeats_sec[]` 배열 존재
- [ ] Hook Gate 통과: startSec ≤ 3.0초 & strength ≥ 0.70

### **2. 밀도 검증**
- [ ] 총 scenes 수 ≥ 기준값 (일반: 4, Short: 2)
- [ ] 총 shots 수 ≥ 기준값 (일반: 8, Short: 4)
- [ ] 총 keyframes 수 ≥ 기준값 (일반: 20, Short: 8)
- [ ] 모든 scene에 shots[] 배열 존재
- [ ] 모든 shot에 keyframes[] 배열 존재 (최소 2개)

### **3. Mandatory Arrays 검증**
- [ ] scenes[] 배열 존재
- [ ] 모든 scene.shots[] 배열 존재 (빈 배열 금지)
- [ ] 모든 shot.keyframes[] 배열 존재 (최소 2개 keyframes)
- [ ] 배열 구조 완전성 확인

### **4. 메타데이터 검증**
- [ ] ASR/OCR 텍스트 채워짐 (빈 문자열 회피)
- [ ] 장르에 맞는 감정아크 유효
- [ ] 실제 소셜 메트릭 사용 (0값 금지)

---

## 🔧 **품질 개선 가이드**

### **A. Hook 수치 필드 강제**
```javascript
// 프롬프트 강화
"이미 검출한 Hook 패턴에 대해 startSec(초), strength(0~1), microbeats_sec[]를 반드시 산출. 텍스트 라벨만 금지."

// 스키마 검증
hookGenome: {
  startSec: { type: "number", minimum: 0, maximum: 10 },
  strength: { type: "number", minimum: 0, maximum: 1 },
  trigger_modalities: { type: "array", minItems: 1 },
  microbeats_sec: { type: "array", minItems: 2 }
}
```

### **B. 2-Pass 밀도 플로어**
```javascript
// Pass 1: 밀도 검증
const densityCheck = ensureDensityFloor(vdpData);

// Pass 2: 미달 시 보강
if (densityCheck.needsPass2) {
  // 프롬프트에 밀도 보강 지시 추가
  "밀도 기준 미달. scenes/shots/keyframes 수를 보강하세요."
}
```

### **C. Mandatory 배열 준수**
```javascript
// 검증 규칙
- 모든 scene에는 shots[] 필수
- 모든 shot에는 keyframes[] 필수 (최소 2개)
- 빈 배열 생성 금지
```

---

## 📈 **품질 배지 시스템**

### **Excellent (우수)**
- Hook Gate 통과 (startSec ≤ 3.0, strength ≥ 0.70)
- 밀도 플로어 충족
- Mandatory 배열 완전

### **Good (양호)**
- Hook Gate 통과 또는 밀도 플로어 충족 중 하나
- 기본 구조 완전

### **Needs Improvement (개선 필요)**
- Hook Gate 미통과
- 밀도 플로어 미달
- Mandatory 배열 불완전

---

## 🚀 **즉시 적용 개선사항**

### **1. Universal VDP Clone 업데이트**
- [x] Hook Genome 스키마 강화 (필수 수치 필드)
- [x] 2-Pass 밀도 플로어 구현
- [x] 품질 검증 로직 통합
- [x] 품질 체크 엔드포인트 추가

### **2. 프롬프트 강화**
- [x] Hook 수치 필드 강제 지시 추가
- [x] 밀도 기준 명시
- [x] Mandatory 배열 요구사항 추가

### **3. 품질 모니터링**
- [x] 품질 배지 시스템 구현
- [x] 자동 품질 검증
- [x] 개선 권장사항 생성

---

## 📋 **운영 체크리스트**

### **일일 점검**
- [ ] VDP 생성 품질 통계 확인
- [ ] Hook Gate 통과율 모니터링
- [ ] 밀도 플로어 충족율 확인
- [ ] 에러 로그 검토

### **주간 점검**
- [ ] 품질 트렌드 분석
- [ ] 프롬프트 효과성 평가
- [ ] 개선사항 적용 검토
- [ ] 사용자 피드백 수집

### **월간 점검**
- [ ] 전체 품질 지표 리뷰
- [ ] 품질 기준 업데이트 검토
- [ ] 새로운 품질 지표 도입 검토
- [ ] 성능 최적화 검토

---

## 🎯 **목표 지표**

### **품질 목표 (2025년)**
- **Hook Gate 통과율**: ≥90%
- **밀도 플로어 충족율**: ≥85%
- **Mandatory 배열 완전율**: ≥95%
- **전체 품질 우수율**: ≥80%

### **성능 목표**
- **VDP 생성 시간**: ≤60초
- **품질 검증 시간**: ≤5초
- **에러율**: ≤5%

---

**📝 작성자**: Cursor  
**📅 작성일**: 2025-08-21  
**🎯 목적**: GPT-5 Pro 컨설팅 답변 기반 VDP 품질 표준화
