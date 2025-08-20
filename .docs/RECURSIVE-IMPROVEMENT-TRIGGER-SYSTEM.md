# 🧠 재귀개선 시스템 트리거 장치 설계서

**Version**: 1.0.0  
**Created**: 2025-08-20  
**Purpose**: 실제 작업 중 재귀개선 시스템 자동 활성화 장치

---

## 🎯 **재귀개선 트리거 시스템 개요**

### **기본 컨셉**
- **자동 감지**: 복잡도/리스크 임계값 도달 시 자동 활성화
- **선택적 활성화**: 일반 작업은 단일 Agent, 복잡 작업만 3-Agent 합의
- **성능 우선**: 재귀개선 오버헤드 < 10% 유지
- **학습 기반**: 과거 성공/실패 패턴으로 트리거 정확도 향상

---

## 🚨 **자동 트리거 조건 (Critical Thresholds)**

### **복잡도 기반 트리거**
```yaml
complexity_triggers:
  file_count_threshold: 7
  # 7개 이상 파일 수정 → 자동 재귀개선 활성화
  
  dependency_depth_threshold: 3
  # 3단계 이상 의존성 체인 → 자동 활성화
  
  risk_score_threshold: 0.75
  # 위험도 점수 75% 이상 → 강제 3-Agent 합의
  
  api_integration_threshold: 2
  # 2개 이상 외부 API 통합 → 자동 활성화
```

### **에러 패턴 기반 트리거**
```yaml
error_triggers:
  repeated_failures: 3
  # 같은 작업 3회 연속 실패 → 재귀개선 강제 활성화
  
  critical_system_errors:
    - "서버 크래시"
    - "데이터 손실"
    - "보안 취약점"
    - "성능 저하 50% 이상"
  
  cascade_failure_detection:
    - "T1 → T2 → T3 연쇄 실패"
    - "API 의존성 체인 붕괴"
```

### **시간 기반 트리거**
```yaml
time_triggers:
  development_time_exceeded:
    simple_task: "> 15분"
    moderate_task: "> 45분"
    complex_task: "> 90분"
  
  debugging_time_exceeded: "> 30분"
  # 30분 이상 디버깅 → 자동 3-Agent 분석 요청
  
  decision_paralysis: "> 10분"
  # 10분 이상 의사결정 지연 → 강제 합의 프로세스
```

---

## ⚡ **실시간 모니터링 시스템**

### **트리거 감지 엔진**
```typescript
class RecursiveImprovementTrigger {
  private metrics = {
    complexity: 0,
    riskScore: 0,
    failureCount: 0,
    developmentTime: 0,
    debuggingTime: 0
  };
  
  private thresholds = {
    autoActivate: 0.75,    // 자동 활성화
    forceConsensus: 0.85,  // 강제 합의
    emergencyStop: 0.95    // 긴급 중단
  };
  
  checkTriggerConditions(): TriggerResult {
    const score = this.calculateOverallScore();
    
    if (score >= this.thresholds.emergencyStop) {
      return { action: 'EMERGENCY_STOP', confidence: 0.95 };
    }
    
    if (score >= this.thresholds.forceConsensus) {
      return { action: 'FORCE_CONSENSUS', confidence: 0.85 };
    }
    
    if (score >= this.thresholds.autoActivate) {
      return { action: 'AUTO_ACTIVATE', confidence: 0.75 };
    }
    
    return { action: 'CONTINUE_NORMAL', confidence: score };
  }
}
```

### **실시간 지표 수집**
```yaml
monitoring_metrics:
  file_modification_count: "현재 세션에서 수정된 파일 수"
  api_call_complexity: "호출하는 외부 API 개수 및 복잡도"
  error_frequency: "최근 1시간 내 에러 발생 횟수"
  dependency_chain_depth: "파일/모듈 간 의존성 깊이"
  user_wait_time: "사용자 응답 대기 시간"
  system_resource_usage: "CPU/메모리 사용률"
```

---

## 🔧 **구현 방법: 실제 통합 장치**

### **1. 기존 CLAUDE.md 통합**
```yaml
claude_md_integration:
  trigger_section: "RECURSIVE_IMPROVEMENT_TRIGGERS"
  auto_detection: "복잡도/리스크 임계값 도달 시"
  manual_override: "--recursive-off, --recursive-force 플래그"
  performance_budget: "전체 작업 시간의 <10% 오버헤드"
```

### **2. 터미널 명령어 자동 분석**
```bash
# 명령어 복잡도 자동 분석
analyze_command_complexity() {
  local command="$1"
  
  # 복잡도 지표 계산
  file_count=$(echo "$command" | grep -o "\\.\\./\\|\\./\\|/" | wc -l)
  api_calls=$(echo "$command" | grep -o "curl\\|fetch\\|http" | wc -l)
  pipe_count=$(echo "$command" | grep -o "|" | wc -l)
  
  complexity_score=$((file_count * 2 + api_calls * 3 + pipe_count * 1))
  
  if [ $complexity_score -gt 10 ]; then
    echo "🧠 복잡도 임계값 초과 ($complexity_score) → 재귀개선 활성화 권장"
    return 1
  fi
  
  return 0
}
```

### **3. 자동 합의 요청 생성기**
```typescript
// 자동 GPT-5 Pro 컨설팅 요청 생성
function generateAutoConsultingRequest(trigger: TriggerContext) {
  const request = {
    trigger_type: trigger.type,
    complexity_score: trigger.complexityScore,
    current_context: {
      files_modified: trigger.filesModified,
      apis_involved: trigger.apisInvolved,
      error_history: trigger.recentErrors,
      time_elapsed: trigger.timeElapsed
    },
    specific_questions: [
      `Current complexity (${trigger.complexityScore}/100) - continue or get consensus?`,
      `Risk factors: ${trigger.riskFactors.join(', ')} - mitigation needed?`,
      `Performance impact: ${trigger.performanceImpact} - acceptable?`
    ],
    urgency: trigger.urgency,
    expected_response_time: trigger.urgency === 'HIGH' ? '5분' : '15분'
  };
  
  return request;
}
```

---

## 🎮 **실전 사용 시나리오**

### **시나리오 1: 일반 작업 (재귀개선 OFF)**
```yaml
typical_workflow:
  task: "단일 파일 수정, 간단한 기능 추가"
  complexity: "< 30점"
  agents: "ClaudeCode 단독"
  time_overhead: "0%"
  
example:
  - "버튼 색상 변경"
  - "단일 API 엔드포인트 추가"
  - "CSS 스타일 수정"
  - "간단한 버그 수정"
```

### **시나리오 2: 복잡 작업 (재귀개선 AUTO-ON)**
```yaml
complex_workflow:
  task: "다중 파일 수정, 시스템 통합"
  complexity: "> 75점"
  agents: "GPT-5 + ClaudeCode + Cursor 자동 합의"
  time_overhead: "5-10%"
  
example:
  - "새로운 인증 시스템 통합"
  - "데이터베이스 스키마 변경"
  - "외부 API 다중 통합"
  - "아키텍처 변경"
```

### **시나리오 3: 위험 작업 (재귀개선 FORCE-ON)**
```yaml
risky_workflow:
  task: "크리티컬 시스템 수정"
  complexity: "> 90점"
  agents: "강제 3-Agent 합의 + 추가 검증"
  time_overhead: "10-15%"
  
example:
  - "프로덕션 데이터베이스 마이그레이션"
  - "보안 핵심 모듈 수정"
  - "결제 시스템 통합"
  - "인프라 아키텍처 변경"
```

---

## 📈 **학습 및 최적화 메커니즘**

### **성공/실패 패턴 학습**
```yaml
learning_data:
  successful_patterns:
    - task_type: "API 통합"
      complexity_threshold: 65
      consensus_needed: true
      avg_success_rate: 95%
  
  failure_patterns:
    - task_type: "단순 UI 수정"
      complexity_threshold: 25
      consensus_used: true
      overhead: "불필요한 15분 지연"
      
  optimization_rules:
    - "UI 작업 < 30점 → 재귀개선 OFF"
    - "API 통합 > 60점 → 재귀개선 AUTO-ON"
    - "DB 변경 > 80점 → 재귀개선 FORCE-ON"
```

### **동적 임계값 조정**
```typescript
class AdaptiveThresholds {
  updateThresholds(recentOutcomes: Outcome[]) {
    // 최근 10개 작업 결과 분석
    const successRate = this.calculateSuccessRate(recentOutcomes);
    
    if (successRate < 0.8) {
      // 성공률 낮음 → 임계값 낮춰서 더 자주 재귀개선 활성화
      this.autoActivateThreshold -= 0.05;
    } else if (successRate > 0.95) {
      // 성공률 높음 → 임계값 높여서 오버헤드 감소
      this.autoActivateThreshold += 0.03;
    }
    
    // 임계값 범위 제한 (0.5 ~ 0.9)
    this.autoActivateThreshold = Math.max(0.5, Math.min(0.9, this.autoActivateThreshold));
  }
}
```

---

## 🚀 **즉시 구현 방안 (본업 복귀 준비)**

### **1. 최소 트리거 시스템 (5분 구현)**
```bash
# 간단한 복잡도 감지 함수 추가
add_complexity_detector() {
  cat >> ~/.bashrc << 'EOF'
# 재귀개선 트리거 감지기
check_recursive_trigger() {
  local files_count=$(echo "$@" | grep -o "\\S\\+\\.\\(js\\|ts\\|jsx\\|tsx\\)" | wc -l)
  local api_count=$(echo "$@" | grep -o "api\\|http\\|curl" | wc -l)
  
  local complexity=$((files_count * 2 + api_count * 3))
  
  if [ $complexity -gt 8 ]; then
    echo "🧠 복잡도 감지 ($complexity) - GPT-5 컨설팅 권장"
    echo "파일: .collab-msg-gpt5-recursive-improvement-consulting-request"
  fi
}
EOF
}
```

### **2. 작업 중 자동 체크포인트 (본업 방해 최소화)**
```yaml
checkpoint_triggers:
  every_30_minutes: "자동 복잡도 체크 + 선택적 합의 요청"
  before_critical_changes: "DB/API/인프라 변경 전 강제 합의"
  after_repeated_failures: "3회 실패 후 자동 3-Agent 분석"
  
integration_with_current_work:
  - "인제스터 UI 통합 작업 중 복잡도 모니터링"
  - "Instagram/TikTok 자동화 구현 중 리스크 감지"
  - "성능 최적화 작업 중 품질 검증"
```

### **3. 본업 우선 + 재귀개선 보조 모드**
```yaml
hybrid_mode:
  primary_focus: "인제스터 UI 통합 (Instagram/TikTok 자동화)"
  secondary_monitoring: "재귀개선 트리거 백그라운드 감시"
  
  activation_strategy:
    normal_development: "ClaudeCode 단독 실행"
    complexity_detected: "자동 GPT-5 컨설팅 요청 생성"
    consensus_needed: "3-Agent 합의 프로세스 활성화"
    
  performance_target:
    overhead: "< 5% (일반 작업)"
    benefit: "> 20% (복잡 작업에서 에러 감소)"
```

---

## 🔄 **본업 복귀 전환 계획**

### **현재 상태 정리**
```yaml
phase1_achievements:
  T1: "DLQ Publisher 준비 완료"
  T2: "벤치마크 시스템 실행 중"
  T3: "Circuit Breaker + 메트릭 수집 활성화"
  Cursor: "Summary Dock 완성"
  
recursive_improvement_infrastructure:
  consensus_system: "TriangularConsensus 클래스 구현"
  trigger_detection: "복잡도/리스크 임계값 설정"
  consultation_framework: "GPT-5 컨설팅 요청 자동 생성"
```

### **인제스터 UI 통합 작업 재개**
```yaml
primary_objectives:
  instagram_automation:
    current: "50% 수동 입력"
    target: "90%+ Cursor 자동화"
    
  tiktok_automation:
    current: "50% 수동 입력"
    target: "90%+ Cursor 자동화"
    
  user_experience:
    current: "5-8분 입력 시간"
    target: "30초-1분 (85% 단축)"

integration_plan:
  phase_a: "Cursor extractor API 연동"
  phase_b: "자동 폼 채우기 UI"
  phase_c: "에러 처리 + 품질 검증"
```

### **재귀개선 백그라운드 활성화**
```yaml
background_monitoring:
  complexity_detection: "파일 수정 수, API 호출 수 자동 계산"
  risk_assessment: "외부 의존성, 데이터 변경 위험도 평가"
  trigger_generation: "임계값 초과 시 자동 컨설팅 요청 생성"
  
silent_operation:
  - "일반 작업: 방해 없이 진행"
  - "복잡 작업: 자동 알림 + 선택적 활성화"
  - "위험 작업: 강제 합의 요구"
  
learning_collection:
  - "모든 결정과 결과 자동 기록"
  - "성공/실패 패턴 데이터베이스 구축"
  - "다음 프로젝트에서 더 정확한 트리거"
```

---

## 🎯 **즉시 실행할 최소 트리거 설정**

### **Step 1: 복잡도 감지 함수 (2분)**
```bash
# ~/.bashrc 또는 현재 세션에 추가
complexity_check() {
  local task_description="$1"
  local file_count=$(echo "$task_description" | grep -o "file\\|component\\|api\\|endpoint" | wc -l)
  
  if [ $file_count -gt 3 ]; then
    echo "🧠 [TRIGGER] 복잡도 감지 → GPT-5 컨설팅 권장"
    echo "📄 요청서: .collab-msg-gpt5-recursive-improvement-consulting-request"
    return 1
  fi
  
  return 0
}
```

### **Step 2: 작업 시작 전 자동 체크 (1분)**
```bash
# 작업 시작 전 실행
pre_work_check() {
  echo "🔍 재귀개선 트리거 체크..."
  complexity_check "$1"
  
  if [ $? -eq 1 ]; then
    echo "⚠️  복잡한 작업 감지 - 재귀개선 시스템 활성화 권장"
    echo "✅ 계속 진행하려면 Enter, 합의 요청하려면 'y'"
    read -r response
    
    if [ "$response" = "y" ]; then
      echo "📨 GPT-5 Pro 컨설팅 요청 전달..."
      return 2
    fi
  fi
  
  echo "✅ 일반 모드로 작업 진행"
  return 0
}
```

### **Step 3: 작업 완료 후 학습 데이터 수집 (1분)**
```bash
# 작업 완료 후 실행
post_work_learning() {
  local success="$1"  # true/false
  local time_taken="$2"  # minutes
  local task_complexity="$3"
  
  echo "📊 학습 데이터 수집..."
  echo "$(date): $task_complexity, $success, ${time_taken}min" >> ~/.recursive_improvement_log
  
  if [ "$success" = "false" ] && [ "$task_complexity" -gt 5 ]; then
    echo "🧠 실패 + 복잡도 → 다음에는 재귀개선 활성화 권장"
  fi
}
```

---

## 🚀 **본업 복귀 + 재귀개선 백그라운드 활성화**

### **즉시 실행 명령어:**
```bash
cd /Users/ted/snap3

# 재귀개선 트리거 시스템 활성화
source .docs/RECURSIVE-IMPROVEMENT-TRIGGER-SYSTEM.md

# 본업 (인제스터 UI 통합) 복귀
echo "🎯 본업 복귀: Instagram/TikTok 자동화 UI 통합 시작"
echo "📊 백그라운드: 재귀개선 트리거 시스템 활성화됨"

# 다음 작업 복잡도 자동 체크
pre_work_check "Instagram metadata extractor UI integration with Cursor API"
```

**🎯 준비 완료! 본업 (인제스터 UI 통합) 복귀 + 재귀개선 시스템 백그라운드 트리거 활성화**