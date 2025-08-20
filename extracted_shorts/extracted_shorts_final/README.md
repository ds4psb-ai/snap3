# YouTube Shorts VDP 추출 결과

이 폴더에는 두 개의 YouTube Shorts에서 추출된 모든 파일들이 포함되어 있습니다.

## 📹 1번 영상: 김햄찌 야근 쇼츠 (6_I2FmT1mbY)
- **제목**: "직장인의 흔한 야근 시발점"
- **URL**: https://www.youtube.com/shorts/6_I2FmT1mbY
- **길이**: 52초
- **조회수**: 3,022,476회
- **좋아요**: 110,295개

### 파일들:
- `6_I2FmT1mbY_hamster_overtime.mp4` - 원본 비디오 (2.7MB)
- `6_I2FmT1mbY_hamster_overtime.vdp.json` - 기존 VDP 파일 (1.9KB)
- `6_I2FmT1mbY_hamster_overtime_NEW_HOOKGENOME.vdp.json` - Hook Genome 통합 VDP (4.9KB)
- `6_I2FmT1mbY_hamster_overtime_SHA256.mp4` - GCS 저장된 파일 (SHA256 해시명)

### Hook Genome 분석:
- **시작 시간**: 0초
- **패턴 코드**: ["joke", "problem_solution"] 
- **강도 점수**: 0.9 (0.70 이상 통과)
- **전달 방식**: "on_screen_text"
- **트리거 모달**: ["visual", "text", "audio"]

---

## 📱 2번 영상: 휴대폰 중독 쇼츠 (aPKQzMEd2pw)
- **제목**: "I miss when we left our phones at home… #shortfilm"
- **URL**: https://www.youtube.com/shorts/aPKQzMEd2pw
- **길이**: 27초
- **조회수**: 151,142회
- **좋아요**: 15,792개

### 파일들:
- `aPKQzMEd2pw_phone_addiction.mp4` - 원본 비디오 (1.9MB)
- `aPKQzMEd2pw_phone_addiction.vdp.json` - Hook Genome 통합 VDP
- `aPKQzMEd2pw_phone_addiction_SHA256.mp4` - GCS 저장된 파일 (SHA256 해시명)

### Hook Genome 분석:
- **시작 시간**: 0초
- **패턴 코드**: ["pattern_break"]
- **강도 점수**: 0.9 (0.70 이상 통과)
- **전달 방식**: "dialogue"
- **트리거 모달**: ["visual", "audio"]

---

## 🧬 VDP RAW + Hook Genome 통합 시스템

이 파일들은 새로운 VDP RAW Generation Pipeline으로 생성되었습니다:

### 파이프라인 플로우:
1. **URL 입력** → yt-dlp 다운로드
2. **SHA256 생성** → GCS 업로드 (메타데이터 포함)
3. **t2-extract API** → Vertex AI (Gemini-2.5-pro) 처리
4. **VDP RAW 생성** → 씬 분석 + Hook Genome 통합
5. **Hook Gate 검증** → start_sec ≤ 3s, strength_score ≥ 0.70

### Hook Genome 구조:
- **pattern_code**: 후크 패턴 분류
- **delivery**: 전달 방식 (dialogue, on_screen_text 등)
- **trigger_modalities**: 트리거 모달리티 (visual, audio, text)
- **microbeats_sec**: 마이크로비트 타임스탬프
- **strength_score**: 후크 강도 점수 (0-1)

---

## 📊 생성 일시
- **생성 날짜**: 2025-08-15
- **처리 시간**: 약 30-44초/영상
- **총 파일 수**: 7개 파일
- **총 크기**: ~9.5MB

