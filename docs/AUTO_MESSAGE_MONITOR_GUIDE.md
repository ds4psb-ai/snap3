# ClaudeCode 자동 메시지 모니터링 시스템 가이드

## 🚀 개요

ClaudeCode에서 보낸 메시지를 자동으로 감지하고 알림을 제공하는 시스템입니다. 더 이상 수동으로 `git pull`과 `cat .collab-msg-*` 명령어를 실행할 필요가 없습니다!

## 📋 기능

### ✅ 자동 감지
- Git pull을 통한 자동 메시지 감지
- 10초마다 새로운 메시지 확인
- 우선순위별 메시지 분류 (Critical/High/Normal)

### ✅ 실시간 알림
- 브라우저 토스트 알림
- 우선순위별 색상 구분
- 메시지 내용 즉시 표시

### ✅ 자동 처리
- 메시지 처리 완료 표시
- 처리된 메시지 자동 정리
- Git 커밋 자동화

## 🛠️ 설치 방법

### 1. Git Hook 설치
```bash
# 터미널에서 실행
./scripts/auto-message-monitor.sh install
```

### 2. 모니터링 시작
```bash
# 백그라운드에서 모니터링 시작
nohup ./scripts/auto-message-monitor.sh monitor > logs/auto-message.log 2>&1 &

# 또는 포그라운드에서 실행
./scripts/auto-message-monitor.sh monitor
```

### 3. 웹 UI 접속
```
http://localhost:3000/ops/message-monitor
```

## 🎯 사용 방법

### 방법 1: 웹 UI 사용 (권장)
1. 브라우저에서 `http://localhost:3000/ops/message-monitor` 접속
2. **Start Monitoring** 버튼 클릭
3. 새로운 메시지가 오면 자동으로 알림 표시
4. 메시지 확인 후 ✓ 버튼으로 처리 완료 표시

### 방법 2: 터미널 모니터링
```bash
# 모니터링 시작
./scripts/auto-message-monitor.sh monitor

# 테스트 메시지 생성
./scripts/auto-message-monitor.sh test
```

### 방법 3: Git Hook 자동 감지
```bash
# Git pull 시 자동으로 메시지 감지
git pull
# → 자동으로 메시지가 있으면 알림 표시
```

## 📊 메시지 우선순위

### 🚨 Critical (빨간색)
- 즉시 확인 및 조치 필요
- 시스템 오류, 긴급 수정사항
- 자동으로 브라우저 알림 표시

### ⚠️ High (노란색)
- 빠른 확인 필요
- 중요 기능 개발, 통합 작업
- 토스트 알림으로 표시

### 📝 Normal (파란색)
- 일반적인 메시지
- 정보 공유, 상태 업데이트
- 조용한 알림

## 🔧 설정 옵션

### 모니터링 간격 변경
```bash
# scripts/auto-message-monitor.sh 파일에서 수정
sleep 10  # 10초 → 원하는 시간으로 변경
```

### 알림 방식 변경
```bash
# 브라우저 알림 활성화/비활성화
# MessageMonitor.tsx에서 toast 호출 부분 수정
```

### 로그 레벨 설정
```bash
# 로그 파일 위치
logs/auto-message.log

# 로그 레벨 변경
# scripts/auto-message-monitor.sh에서 log 함수 수정
```

## 🚨 문제 해결

### 모니터링이 작동하지 않는 경우
```bash
# 1. 스크립트 권한 확인
ls -la scripts/auto-message-monitor.sh

# 2. 권한이 없으면 추가
chmod +x scripts/auto-message-monitor.sh

# 3. 로그 확인
tail -f logs/auto-message.log

# 4. 프로세스 확인
ps aux | grep auto-message-monitor
```

### Git Hook이 작동하지 않는 경우
```bash
# 1. Git hook 파일 확인
ls -la .git/hooks/post-merge

# 2. 권한 확인
chmod +x .git/hooks/post-merge

# 3. 수동으로 hook 실행
.git/hooks/post-merge
```

### 웹 UI가 로드되지 않는 경우
```bash
# 1. Next.js 서버 실행 확인
npm run dev

# 2. API 엔드포인트 확인
curl http://localhost:3000/api/collaboration/message-monitor

# 3. 브라우저 개발자 도구에서 오류 확인
```

## 📈 성능 최적화

### 메모리 사용량 최적화
- 메시지 파일 자동 정리 (7일 후)
- 로그 파일 로테이션
- 불필요한 프로세스 종료

### 네트워크 최적화
- API 호출 간격 조정
- 캐싱 전략 적용
- 배치 처리 구현

## 🔒 보안 고려사항

### 파일 권한
```bash
# 메시지 파일 권한 설정
chmod 600 .collab-msg-*

# 로그 파일 권한 설정
chmod 644 logs/auto-message.log
```

### API 보안
- 인증된 사용자만 접근 가능
- Rate limiting 적용
- 입력 검증 강화

## 🎯 향후 개선 계획

### 기능 확장
- [ ] 이메일 알림 지원
- [ ] Slack/Discord 웹훅 연동
- [ ] 모바일 푸시 알림
- [ ] 메시지 템플릿 시스템

### 성능 개선
- [ ] Redis 캐싱 도입
- [ ] WebSocket 실시간 통신
- [ ] 메시지 압축 및 최적화
- [ ] 분산 모니터링 시스템

### 사용자 경험
- [ ] 다크 모드 지원
- [ ] 다국어 지원
- [ ] 커스텀 알림 설정
- [ ] 메시지 히스토리 검색

## 📞 지원

### 문제 발생 시
1. 로그 파일 확인: `logs/auto-message.log`
2. GitHub Issues에 버그 리포트
3. 개발팀에 직접 문의

### 피드백 제공
- 기능 요청: GitHub Issues
- 개선 제안: Pull Request
- 문서 개선: 직접 수정 후 PR

---

**버전**: v1.0.0  
**최종 업데이트**: 2025년 8월 20일  
**상태**: Production Ready
