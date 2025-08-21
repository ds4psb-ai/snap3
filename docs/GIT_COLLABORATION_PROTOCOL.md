# 🤖 Git 기반 AI 협업 프로토콜

## 📊 **협업 시스템 개요**

### **참여자**
- **Cursor**: UI/UX 구현, 프론트엔드 개발
- **ClaudeCode**: 백엔드/API 개발, 시스템 아키텍처
- **GPT-5 Pro**: 전략적 컨설팅, 아키텍처 검토
- **사용자**: 중재자, 메시지 전달, 최종 승인

### **소통 방식**
- **주요 소통**: Git 메시지 파일 (`.collab-msg-*`)
- **알림**: 사용자가 "새 메시지 확인해" 안내
- **비용**: 0원 (완전 무료)
- **복잡도**: 최소 (단순하고 효과적)

---

## 🔄 **메시지 전송 프로토콜**

### **1. Cursor → ClaudeCode 메시지 전송**

```bash
# 1. 메시지 파일 생성
echo "메시지 내용" > .collab-msg-cursor-[작업명]-[타임스탬프]

# 2. Git 커밋 및 푸시
git add .collab-msg-cursor-[작업명]-[타임스탬프]
git commit -m "Cursor: [작업명] - [간단한 설명]"
git push
```

**예시:**
```bash
# 기술 지원 요청
echo "Gemini JSON 응답 문제 해결 필요" > .collab-msg-cursor-gemini-json-issue-20250821-2200
git add .collab-msg-cursor-gemini-json-issue-20250821-2200
git commit -m "Cursor: Gemini JSON response issue - technical support needed"
git push
```

### **2. ClaudeCode 메시지 확인**

```bash
# 1. 최신 변경사항 가져오기
git pull

# 2. 최신 메시지 파일 확인
ls -la .collab-msg-cursor-* | tail -5

# 3. 메시지 내용 읽기
cat .collab-msg-cursor-[최신파일명]
```

**예시:**
```bash
git pull
cat .collab-msg-cursor-gemini-json-issue-20250821-2200
```

### **3. ClaudeCode → Cursor 응답**

```bash
# 1. 응답 파일 생성
echo "응답 내용" > .collab-msg-claudecode-[응답명]-[타임스탬프]

# 2. Git 커밋 및 푸시
git add .collab-msg-claudecode-[응답명]-[타임스탬프]
git commit -m "ClaudeCode: [응답명] - [간단한 설명]"
git push
```

**예시:**
```bash
# 기술 지원 응답
echo "Gemini JSON 문제 해결 방안 제시" > .collab-msg-claudecode-gemini-solution-20250821-2215
git add .collab-msg-claudecode-gemini-solution-20250821-2215
git commit -m "ClaudeCode: Gemini JSON solution - debugging approach"
git push
```

### **4. Cursor 응답 확인**

```bash
# 1. 최신 변경사항 가져오기
git pull

# 2. 최신 응답 확인
cat .collab-msg-claudecode-[최신파일명]
```

---

## 📋 **메시지 파일 명명 규칙**

### **파일명 형식**
```
.collab-msg-[발신자]-[작업명]-[타임스탬프]
```

### **발신자 구분**
- `cursor`: Cursor에서 전송
- `claudecode`: ClaudeCode에서 전송
- `gpt5`: GPT-5 Pro 컨설팅 (사용자 중재)

### **작업명 예시**
- `vdp-completion-start`: VDP 완성 작업 시작
- `gemini-json-issue`: Gemini JSON 응답 문제
- `technical-support-request`: 기술 지원 요청
- `solution-proposal`: 해결 방안 제안
- `status-update`: 진행 상황 업데이트

### **타임스탬프 형식**
- `YYYYMMDD-HHMM` (예: 20250821-2200)

---

## 🎯 **메시지 내용 구조**

### **기본 구조**
```markdown
# 🚀 [작업명] - [상태]

## 📊 **작업 상태**
- **작업명**: [구체적 작업명]
- **상태**: STARTING/PROCESSING/COMPLETED/ERROR
- **예상 완성 시간**: [시간]
- **우선순위**: LOW/MEDIUM/HIGH/CRITICAL

## 🎯 **실행 계획**
[단계별 실행 계획]

## 🔧 **기술적 세부사항**
[기술적 내용]

## 📋 **성공 기준**
[성공 판단 기준]

## 🚨 **문제 발생 시**
[문제 해결 방안]

## 📊 **진행 상황 추적**
[진행 상황]

---

**🎯 [수신자]: [요청사항]**

*🤖 [발신자] → [수신자] [작업명] ([타임스탬프])*
```

---

## 🚨 **긴급 상황 프로토콜**

### **긴급 메시지 표시**
- 파일명에 `urgent` 포함
- 우선순위: CRITICAL
- 즉시 확인 필요

### **예시**
```bash
# 긴급 기술 지원 요청
echo "긴급: 시스템 중단 발생" > .collab-msg-cursor-urgent-system-down-20250821-2200
git add . && git commit -m "URGENT: System down - immediate attention needed" && git push
```

---

## 📊 **메시지 히스토리 관리**

### **메시지 아카이브**
```bash
# 1주일 이상 된 메시지 아카이브
mkdir -p docs/collab-archive/$(date +%Y-%m)
mv .collab-msg-* docs/collab-archive/$(date +%Y-%m)/

# 아카이브 커밋
git add docs/collab-archive/
git commit -m "Archive: Collaboration messages from $(date +%Y-%m)"
git push
```

### **메시지 검색**
```bash
# 특정 작업 관련 메시지 검색
grep -r "VDP" .collab-msg-*

# 최근 메시지 확인
ls -la .collab-msg-* | tail -10
```

---

## ✅ **협업 시스템 장점**

### **기술적 장점**
- ✅ **완전 무료**: Git 호스팅 무료
- ✅ **히스토리 보존**: 모든 대화 기록 저장
- ✅ **버전 관리**: 변경사항 추적
- ✅ **API 키 불필요**: 인증 없이 사용
- ✅ **오프라인 작업**: 로컬에서 작업 가능
- ✅ **백업 자동화**: Git 자동 백업

### **협업 장점**
- ✅ **단순함**: 복잡한 설정 불필요
- ✅ **안정성**: Git의 검증된 시스템
- ✅ **투명성**: 모든 대화 공개
- ✅ **확장성**: 필요시 브랜치 활용
- ✅ **복구 가능**: 언제든 이전 상태로 복구

---

## 🚀 **실제 사용 예시**

### **시나리오 1: VDP 완성 작업**
```bash
# Cursor: 작업 시작 알림
echo "VDP 완성 작업 시작" > .collab-msg-cursor-vdp-completion-start-20250821-2145
git add . && git commit -m "Cursor: VDP completion work started" && git push

# ClaudeCode: 확인 및 응답
git pull
cat .collab-msg-cursor-vdp-completion-start-20250821-2145
echo "작업 확인, 병렬 진행 시작" > .collab-msg-claudecode-vdp-parallel-start-20250821-2150
git add . && git commit -m "ClaudeCode: VDP parallel work started" && git push
```

### **시나리오 2: 기술 문제 해결**
```bash
# Cursor: 문제 보고
echo "Gemini JSON 응답 오류 발생" > .collab-msg-cursor-gemini-error-20250821-2200
git add . && git commit -m "Cursor: Gemini JSON error - help needed" && git push

# ClaudeCode: 해결 방안 제시
git pull
cat .collab-msg-cursor-gemini-error-20250821-2200
echo "JSON 파싱 로직 개선 방안" > .collab-msg-claudecode-gemini-solution-20250821-2215
git add . && git commit -m "ClaudeCode: Gemini JSON solution provided" && git push
```

---

## 📝 **결론**

**Git 기반 협업 시스템이 최적의 솔루션입니다!**

- **비용**: 0원
- **복잡도**: 최소
- **효과성**: 최대
- **안정성**: 검증됨

**이 시스템으로 Cursor와 ClaudeCode가 효율적으로 협업하여 VDP 완성 작업을 성공적으로 완료할 수 있습니다!** 🚀

---

*📝 Git 기반 AI 협업 프로토콜 문서 (2025-08-21 22:00)*

