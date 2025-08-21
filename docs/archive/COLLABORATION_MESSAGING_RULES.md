# 🚨 ClaudeCode 협업 메시지 전달 필수 규칙

**목적**: ClaudeCode와의 안정적인 협업을 위한 메시지 전달 표준화  
**중요도**: CRITICAL - 반드시 준수해야 함  

## ⚠️ **필수 규칙 (MUST)**

### **1. 메시지 파일 생성**
```bash
# 파일명 형식
.collab-msg-[목적]-[타임스탬프]
.collab-msg-[목적]  # 간단한 경우

# 예시
.collab-msg-integration-test-ready
.collab-msg-api-implementation-complete
.collab-msg-error-report
```

### **2. Git 전달**
```bash
git add .
git commit -m "[메시지 제목]

[상세 내용]

ClaudeCode check: [확인 명령어들]"
git push
```

### **🚨 3. 확인 명령어 필수 포함**
**모든 메시지 마지막에 반드시 포함:**

```bash
ClaudeCode 확인 방법:
git pull
cat .collab-msg-[파일명]
[추가 실행 명령어들]
```

## ❌ **절대 하지 말 것 (NEVER)**

### **1. 확인 명령어 생략**
```bash
# ❌ 잘못된 예시
"메시지를 보냈습니다. 확인해주세요."
"파일을 업데이트했습니다."
"새로운 기능을 구현했습니다."
```

### **2. 모호한 안내**
```bash
# ❌ 잘못된 예시  
"확인해보세요"
"메시지 확인 부탁드립니다"
"업데이트된 내용을 검토해주세요"
```

### **3. 파일명/경로 누락**
```bash
# ❌ 잘못된 예시
"git pull 하고 확인해주세요"
"새 파일을 확인해주세요"
"메시지 파일을 읽어보세요"
```

## ✅ **올바른 예시**

### **예시 1: API 구현 완료**
```markdown
# .collab-msg-api-complete

API 구현이 완료되었습니다!

- 엔드포인트: /api/extract-social-metadata
- 테스트 준비: 완료
- 다음 단계: 통합 테스트

ClaudeCode 확인 방법:
git pull
cat .collab-msg-api-complete
node simple-web-server.js &
curl -X POST http://localhost:8080/api/extract-social-metadata -d '{"test": true}'
```

### **예시 2: 에러 보고**
```markdown
# .collab-msg-error-report

통합 테스트 중 에러 발생!

- 에러: Connection timeout
- 파일: simple-web-server.js:245
- 해결 방안: 제안 사항 포함

ClaudeCode 확인 방법:
git pull
cat .collab-msg-error-report
tail -50 logs/error.log
```

### **예시 3: 기능 제안**
```markdown
# .collab-msg-feature-proposal

새로운 최적화 방안을 제안합니다!

- 성능 개선: 40% 향상
- 구현 시간: 30분 예상
- 상세 내용: FEATURE_PROPOSAL.md 참조

ClaudeCode 확인 방법:
git pull
cat .collab-msg-feature-proposal
cat FEATURE_PROPOSAL.md
```

## 🎯 **체크리스트**

메시지 전송 전 반드시 확인:

- [ ] 메시지 파일 생성 (.collab-msg-*)
- [ ] 명확한 내용 작성
- [ ] Git add, commit, push 완료
- [ ] **확인 명령어 포함 (필수!)**
- [ ] 파일명/경로 정확히 명시
- [ ] 추가 실행 명령어 제공 (필요시)

## 🚨 **위반 시 문제점**

### **확인 명령어 누락 시:**
- ClaudeCode가 메시지를 놓칠 수 있음
- 협업 효율성 저하
- 불필요한 재작업 발생
- 프로젝트 진행 지연

### **모호한 안내 시:**
- ClaudeCode가 어떤 파일을 확인해야 할지 모름
- 잘못된 파일을 확인할 가능성
- 시간 낭비 및 혼란 발생

## 💡 **추가 팁**

### **긴급 메시지:**
```bash
# 파일명에 priority 표시
.collab-msg-urgent-api-fix
.collab-msg-critical-error-report
```

### **단계별 작업:**
```bash
# 순서 표시
.collab-msg-step1-preparation
.collab-msg-step2-implementation
.collab-msg-step3-testing
```

### **상태 업데이트:**
```bash
# 진행 상황 표시
.collab-msg-progress-75-percent
.collab-msg-testing-complete
.collab-msg-ready-for-deployment
```

---

**🎯 핵심**: ClaudeCode에게 **정확한 확인 방법**을 제시하는 것이 성공적인 협업의 열쇠입니다!

**이 규칙을 준수하면 협업 효율성이 크게 향상됩니다.** 🚀
