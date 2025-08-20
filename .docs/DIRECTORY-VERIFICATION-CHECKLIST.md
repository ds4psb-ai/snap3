# 🚨 DIRECTORY VERIFICATION CHECKLIST - 터미널 디렉토리 실수 방지

**Version**: 1.0.0  
**Created**: 2025-08-20  
**Purpose**: 터미널별 올바른 디렉토리 확인 및 실수 방지

---

## 🎯 **CRITICAL: 터미널별 정확한 디렉토리**

### **✅ 검증된 디렉토리 매핑 (2025-08-20)**

```yaml
verified_directories:
  T1_Main_8080:
    directory: "/Users/ted/snap3"
    verified: "✅ 2025-08-20"
    contains: "simple-web-server.js, package.json, ai-collab/"
    purpose: "메인 서버, API 엔드포인트, 재귀개선 프레임워크"
  
  T2_Jobs_8081:
    directory: "/Users/ted/snap3-jobs"
    verified: "✅ 2025-08-20"
    contains: "worker-ingest-v2.sh, ingest/, work/"
    purpose: "Worker 성능 테스트, 인제스트 작업, 벤치마크"
  
  T3_VDP_8082:
    directory: "/Users/ted/snap3/services/t2-extract"
    verified: "✅ 2025-08-20"
    contains: "src/, package.json, Dockerfile"
    purpose: "VDP 추출 서비스, 메트릭 수집, Vertex AI 호출"
  
  T4_Storage_8083:
    directory: "/Users/ted/snap3-storage"
    verified: "✅ 2025-08-20"
    contains: "스토리지 관련 파일들"
    purpose: "스토리지 시스템, 로깅, 데이터 관리"
  
  Cursor_3000:
    directory: "/Users/ted/snap3"
    verified: "✅ 2025-08-20"
    contains: "src/, next.config.js, tailwind.config.ts"
    purpose: "Next.js 프론트엔드 UI, React 컴포넌트"
```

---

## 🔍 **디렉토리 검증 명령어**

### **명령어 지시 전 필수 실행:**
```bash
# 모든 터미널 디렉토리 존재 확인
echo "🔍 터미널 디렉토리 검증..."
ls -d /Users/ted/snap3 && echo "✅ T1 디렉토리 존재"
ls -d /Users/ted/snap3-jobs && echo "✅ T2 디렉토리 존재"
ls -d /Users/ted/snap3/services/t2-extract && echo "✅ T3 디렉토리 존재"
ls -d /Users/ted/snap3-storage && echo "✅ T4 디렉토리 존재"

# 핵심 파일 존재 확인
ls /Users/ted/snap3/simple-web-server.js && echo "✅ T1 메인 서버 파일 존재"
ls /Users/ted/snap3-jobs/worker-ingest-v2.sh && echo "✅ T2 Worker 파일 존재"
ls /Users/ted/snap3/services/t2-extract/package.json && echo "✅ T3 VDP 서비스 존재"
ls /Users/ted/snap3/src/app/layout.tsx && echo "✅ Cursor Next.js 파일 존재"
```

---

## 🚨 **실수 방지 규칙**

### **Rule 1: 명령어 지시 전 디렉토리 검증 필수**
```bash
# 터미널별 디렉토리 확인 스크립트
./scripts/verify-terminal-directories.sh || echo "❌ 디렉토리 검증 실패 - 명령어 지시 중단"
```

### **Rule 2: 잘못된 디렉토리 패턴 금지**
```yaml
forbidden_patterns:
  - "모든 터미널에 동일 디렉토리 지정"
  - "디렉토리 확인 없이 명령어 작성"
  - "추측 기반 디렉토리 할당"
  - "터미널 역할과 디렉토리 불일치"
```

### **Rule 3: 필수 검증 체크리스트**
```yaml
mandatory_checks:
  before_command_generation:
    - "ls -d [각 터미널 디렉토리] 실행"
    - "핵심 파일 존재 확인"
    - "터미널 역할과 디렉토리 일치성 확인"
  
  during_command_writing:
    - "각 터미널별 올바른 cd 명령어 사용"
    - "디렉토리별 특화 명령어 작성"
    - "상대경로 대신 절대경로 사용"
```

---

## 📋 **올바른 명령어 템플릿 (수정됨)**

### **T1 (Main) 명령어 템플릿:**
```bash
cd /Users/ted/snap3
# T1 메인 서버 관련 작업
```

### **T2 (Jobs) 명령어 템플릿:**
```bash
cd /Users/ted/snap3-jobs
# T2 Worker 관련 작업
```

### **T3 (VDP) 명령어 템플릿:**
```bash
cd /Users/ted/snap3/services/t2-extract
# T3 VDP 추출 서비스 관련 작업
```

### **T4 (Storage) 명령어 템플릿:**
```bash
cd /Users/ted/snap3-storage
# T4 스토리지 시스템 관련 작업
```

### **Cursor 지시 템플릿:**
```markdown
**디렉토리**: `/Users/ted/snap3` (Next.js 프론트엔드)
**확인**: `cd /Users/ted/snap3 && cat .collab-msg-[action]`
```

---

## ⚠️ **에러 복구 프로토콜**

### **디렉토리 실수 발생 시:**
1. **즉시 중단**: 잘못된 명령어 실행 중단
2. **검증 재실행**: 터미널 디렉토리 재확인
3. **명령어 수정**: 올바른 디렉토리로 재작성
4. **재지시**: 수정된 명령어로 재지시

### **복구 스크립트:**
```bash
# 터미널 상태 초기화
./scripts/reset-terminal-states.sh

# 디렉토리 검증 재실행
./scripts/verify-terminal-directories.sh

# 올바른 명령어 재생성
echo "🔄 올바른 디렉토리로 명령어 재작성 중..."
```

---

**🚨 이 체크리스트를 위반하면 터미널 충돌 및 작업 실패 확률 90%+!** ⚠️

**✅ 디렉토리 검증 후에만 명령어 지시 허용!** 🎯