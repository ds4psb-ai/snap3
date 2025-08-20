# 🚨 TERMINAL COORDINATION RULES - 4-Terminal + Cursor 협업 필수 규칙

**Version**: 1.0.0  
**Created**: 2025-08-20  
**Purpose**: 4-Terminal + Cursor 협업 시 명령어 지시 표준화

---

## 🎯 **핵심 원칙**

### **1. 의존성 우선 분석 (DEPENDENCY-FIRST)**
- **모든 작업 시작 전**: 터미널 간 의존성 관계 필수 분석
- **충돌 지점 식별**: 같은 파일/포트/리소스 접근 사전 체크
- **순차/병렬 결정**: 의존성 기반 실행 순서 결정

### **2. 명령어 지시 표준 (COMMAND-STANDARD)**
- **디렉토리 확인**: 모든 명령어에 `cd /Users/ted/snap3` 포함
- **실행 방식 표기**: 🔄 순차 필수 / ⚡ 병렬 가능 명시
- **완료 신호**: 각 단계별 완료 확인 방법 제시
- **에러 복구**: 실패 시 복구 명령어 포함

### **3. Cursor 메시지 표준 (CURSOR-MESSAGING)**
- **파일 생성**: `.collab-msg-[action-id]` 표준 네이밍
- **확인 명령어**: 반드시 `cd + cat` 명령어 함께 제공
- **우선순위**: CRITICAL/HIGH/NORMAL 명시
- **타임라인**: 예상 작업 시간 명시

---

## 📋 **작업 시작 전 체크리스트**

### **Step 1: 의존성 분석 매트릭스**
```yaml
dependency_analysis:
  file_conflicts:
    - check: "동일 파일 수정 여부"
    - action: "순차 처리 필요시 명시"
  
  port_conflicts:
    - check: "포트 충돌 가능성"
    - action: "포트별 터미널 할당 확인"
  
  resource_sharing:
    - check: "공유 리소스(DB, API, 파일) 접근"
    - action: "Lock 메커니즘 또는 순차 처리"
  
  startup_dependencies:
    - check: "서버 시작 순서 의존성"
    - action: "서버 Ready 신호 대기 필요"
```

### **Step 2: 터미널 역할 확인**
```yaml
terminal_roles:
  T1_Main_8080:
    primary: "메인 서버, API 엔드포인트"
    directory: "/Users/ted/snap3"
    conflicts: "서버 재시작 시 API 호출 차단"
  
  T2_Jobs_8081:
    primary: "성능 테스트, 벤치마크"
    directory: "/Users/ted/snap3"
    conflicts: "T1 서버 Ready 상태 필요"
  
  T3_VDP_8082:
    primary: "메트릭 수집, 모니터링"
    directory: "/Users/ted/snap3"
    conflicts: "메트릭 파일 공유 충돌 가능"
  
  T4_Storage_8083:
    primary: "로깅, 스토리지"
    directory: "/Users/ted/snap3"
    conflicts: "로그 파일 동시 쓰기 충돌"
  
  Cursor_3000:
    primary: "프론트엔드 UI"
    directory: "/Users/ted/snap3"
    conflicts: "백엔드 API 준비 상태 필요"
```

---

## 🔄 **명령어 지시 템플릿**

### **순차 처리 템플릿 (🔄 SEQUENTIAL)**
```markdown
## 🔄 **순차 처리 필수 (의존성 있음)**

### **Phase 1: [터미널] - [작업명]**
```bash
cd /Users/ted/snap3

# 상태 확인
[상태 확인 명령어]

# 메인 작업
[실제 명령어들]

# 완료 신호
echo "✅ Phase 1 완료 - 다음 단계 진행 가능"
```

### **Phase 2: 대기 후 실행 (Phase 1 완료 신호 확인 후)**
[다음 단계 명령어들]
```

### **병렬 처리 템플릿 (⚡ PARALLEL)**
```markdown
## ⚡ **병렬 처리 가능 (의존성 없음)**

### **T[N] ([역할]) - 즉시 실행**
```bash
cd /Users/ted/snap3

# 충돌 방지 확인
[리소스 체크 명령어]

# 병렬 작업 실행
[메인 명령어들] &

echo "✅ T[N] 병렬 작업 시작"
```
```

### **Cursor 메시지 템플릿**
```markdown
## 📨 **Cursor 지시사항**

**메시지 파일**: `.collab-msg-[action-id]`
**확인 명령어**: `cd /Users/ted/snap3 && cat .collab-msg-[action-id]`
**우선순위**: [CRITICAL/HIGH/NORMAL]
**타임라인**: [예상 시간]

### **작업 내용:**
[구체적 작업 지시사항]

### **의존성:**
- **사전 조건**: [필요한 백엔드 상태]
- **API 엔드포인트**: [사용할 API들]
- **포트 연동**: [연동할 포트 정보]
```

---

## ⚠️ **충돌 방지 체크리스트**

### **파일 충돌 체크**
```bash
# 동일 파일 수정 전 확인
ls -la [target_file] 2>/dev/null && echo "파일 존재 - 순차 처리 필요" || echo "파일 없음 - 병렬 가능"
```

### **포트 충돌 체크**
```bash
# 포트 사용 현황 확인
lsof -i :[port] && echo "포트 사용 중 - 대기 필요" || echo "포트 사용 가능"
```

### **서버 Ready 상태 확인**
```bash
# 서버 준비 상태 확인
curl -s http://localhost:[port]/health && echo "서버 Ready" || echo "서버 대기 중"
```

### **프로세스 상태 확인**
```bash
# 백그라운드 프로세스 확인
ps aux | grep "[process_name]" && echo "프로세스 실행 중" || echo "프로세스 없음"
```

---

## 🎯 **작업 지시 프로토콜**

### **작업 시작 전 필수 절차:**

#### **1. 의존성 분석 (2분)**
```yaml
analyze_dependencies:
  file_access: "동일 파일 수정하는 터미널 식별"
  port_usage: "포트 충돌 가능성 확인"
  resource_sharing: "공유 리소스 접근 패턴 분석"
  startup_order: "서버 시작 순서 의존성 확인"
```

#### **2. 실행 순서 결정 (1분)**
```yaml
execution_plan:
  sequential_phases: "의존성 있는 작업들을 Phase로 그룹핑"
  parallel_groups: "병렬 실행 가능한 작업들 그룹핑"
  wait_conditions: "대기 조건 및 Ready 신호 정의"
```

#### **3. 명령어 생성 (2분)**
```yaml
command_generation:
  directory_check: "모든 명령어에 cd 포함"
  status_verification: "실행 전 상태 확인 명령어"
  main_execution: "실제 작업 명령어"
  completion_signal: "완료 확인 방법"
  error_recovery: "실패 시 복구 명령어"
```

### **4. 메시지 전달 (1분)**
```yaml
message_delivery:
  cursor_file: ".collab-msg-[timestamp]-[action]"
  terminal_instructions: "터미널별 상세 명령어"
  timeline: "예상 완료 시간"
  dependencies: "사전 조건 및 대기 신호"
```

---

## 📚 **실행 순서 결정 알고리즘**

### **의존성 트리 분석**
```javascript
function analyzeDependencies(tasks) {
  const dependencies = {
    file_conflicts: checkFileAccess(tasks),
    port_conflicts: checkPortUsage(tasks),
    server_dependencies: checkServerStartup(tasks),
    resource_sharing: checkSharedResources(tasks)
  };
  
  return {
    sequential_required: dependencies.file_conflicts || dependencies.server_dependencies,
    parallel_possible: !dependencies.sequential_required,
    wait_conditions: dependencies.server_dependencies
  };
}
```

### **실행 계획 생성**
```javascript
function createExecutionPlan(tasks, dependencies) {
  if (dependencies.sequential_required) {
    return {
      type: 'SEQUENTIAL',
      phases: groupByDependency(tasks),
      wait_signals: defineWaitConditions(dependencies)
    };
  } else {
    return {
      type: 'PARALLEL',
      groups: groupByResource(tasks),
      sync_points: defineSyncPoints(tasks)
    };
  }
}
```

---

## 🚨 **Claude 명령어 지시 출력 필수 룰**

### **Rule 1: 의존성 분석 공개 (DEPENDENCY-DISCLOSURE)**
```markdown
## 🔍 **의존성 분석 결과**
- **파일 충돌**: [충돌 파일들 나열]
- **포트 충돌**: [충돌 포트들 나열]  
- **서버 의존성**: [Ready 상태 필요한 서버들]
- **실행 방식**: 🔄 순차 필수 / ⚡ 병렬 가능
```

### **Rule 2: 단계별 명령어 (PHASED-COMMANDS)**
```markdown
### **🔄 Phase 1: [터미널명] - [작업명] (순차 필수)**
```bash
cd /Users/ted/snap3

# 사전 상태 확인
[상태 확인 명령어]

# 메인 작업
[실제 작업 명령어]

# 완료 신호
echo "✅ Phase 1 완료 - T[X] 진행 가능"
```

**⏳ 대기**: 위 완료 신호 확인 후 다음 Phase 진행

### **⚡ Phase 2: 병렬 실행 (동시 진행 가능)**
[각 터미널별 명령어]
```

### **Rule 3: Cursor 메시지 표준 (CURSOR-STANDARD)**
```markdown
## 📨 **Cursor 지시사항**

**파일**: `.collab-msg-[timestamp]-[action]`
**확인**: `cd /Users/ted/snap3 && cat .collab-msg-[timestamp]-[action]`
**타이밍**: 🔄 Phase [N] 완료 후 시작 / ⚡ 즉시 시작 가능
**의존성**: [필요한 백엔드 상태]
```

### **Rule 4: 완료 검증 (COMPLETION-VERIFICATION)**
```markdown
## ✅ **완료 검증 명령어**
```bash
# 전체 시스템 상태 확인
./scripts/system-health-check.sh

# 각 터미널 상태 확인  
curl http://localhost:8080/health  # T1
curl http://localhost:8082/metrics # T3  
curl http://localhost:8083/logs    # T4
curl http://localhost:3000         # Cursor UI
```
```

---

## 📖 **템플릿 예시**

### **올바른 지시 예시:**
```markdown
## 🔍 **의존성 분석 결과**
- **파일 충돌**: simple-web-server.js (T1만 수정)
- **포트 충돌**: 없음 (각각 다른 포트)
- **서버 의존성**: T1 서버 재시작 필요 → T2 API 테스트 대기
- **실행 방식**: 🔄 순차 필수 (T1 → T2/T3/T4 병렬)

### **🔄 Phase 1: T1 - 서버 재시작 (순차 필수)**
```bash
cd /Users/ted/snap3
pkill -f "node simple-web-server.js"
node simple-web-server.js &
sleep 3
curl http://localhost:8080/health
echo "✅ T1 서버 재시작 완료 - T2/T3/T4 진행 가능"
```

**⏳ 대기**: 위 "T2/T3/T4 진행 가능" 신호 확인 후 다음 진행

### **⚡ Phase 2: T2/T3/T4 병렬 실행 (동시 진행 가능)**

#### **T2 (Jobs):**
```bash
cd /Users/ted/snap3
curl -X POST http://localhost:8080/api/vdp/extract-vertex
echo "✅ T2 성능 테스트 완료"
```

#### **T3 (VDP):**
```bash  
cd /Users/ted/snap3
node -e "console.log('T3 메트릭 수집')" &
echo "✅ T3 모니터링 시작"
```

## 📨 **Cursor 지시사항**
**파일**: `.collab-msg-20250820-ui-dashboard`
**확인**: `cd /Users/ted/snap3 && cat .collab-msg-20250820-ui-dashboard`
**타이밍**: 🔄 Phase 2 완료 후 시작
**의존성**: T3 메트릭 API, T4 로그 스트림 Ready
```

### **잘못된 지시 예시 (금지):**
```markdown
❌ **의존성 분석 없이 바로 명령어 나열**
❌ **순차/병렬 구분 없이 "동시 실행"**  
❌ **디렉토리 확인 없이 명령어만**
❌ **Cursor 메시지 파일명 + 확인 명령어 누락**
```

---

## 🛡️ **에러 방지 가이드라인**

### **필수 확인 사항:**
1. **디렉토리**: 모든 터미널이 `/Users/ted/snap3`에서 시작
2. **포트 상태**: `lsof -i :[port]`로 충돌 확인
3. **파일 Lock**: 동시 수정 방지
4. **서버 Ready**: Health check로 상태 확인

### **복구 명령어 세트:**
```bash
# 포트 정리
pkill -f "node simple-web-server.js"
pkill -f "port:808"

# 디렉토리 확인
pwd  # /Users/ted/snap3 확인

# 서버 재시작
node simple-web-server.js &
sleep 5
curl http://localhost:8080/health
```

---

## 📏 **성공 기준**

### **완료 조건:**
- ✅ 모든 터미널에서 에러 없이 완료
- ✅ Cursor UI가 백엔드 API와 정상 연동
- ✅ 전체 시스템 Health check 통과
- ✅ 성능 지표 목표 달성

### **품질 체크:**
- ✅ 의존성 분석 문서화
- ✅ 순차/병렬 구분 명시
- ✅ 완료 신호 확인
- ✅ 에러 복구 가능

---

**🚨 이 규칙을 위반하여 터미널 충돌 발생 시 작업 중단 후 재계획 필수!** ⚠️