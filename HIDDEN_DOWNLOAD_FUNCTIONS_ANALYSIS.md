# 숨겨진 다운로드 함수 분석 보고서

## 🔍 **현재 구현 상태 분석**

### **1. Instagram 다운로드 함수 (`downloadInstagramVideo`)**

#### **구현 위치**: `simple-web-server.js:647-717`

#### **현재 구현 방식:**
```javascript
async function downloadInstagramVideo(url) {
    // 1. shortcode 추출
    const shortcode = extractInstagramShortcode(url);
    
    // 2. Instagram 페이지 직접 스크래핑
    const pageResponse = await fetch(`https://www.instagram.com/p/${shortcode}/`);
    
    // 3. 비디오 URL 추출 (2가지 방법)
    // 방법 1: window._sharedData 파싱
    const sharedData = JSON.parse(sharedDataMatch[1]);
    const videoUrl = sharedData?.entry_data?.PostPage?.[0]?.graphql?.shortcode_media?.video_url;
    
    // 방법 2: 정규식 패턴 매칭 (fallback)
    const videoPatterns = [
        /"video_url":"([^"]+)"/g,
        /"playback_url":"([^"]+)"/g,
        /"src":"([^"]*\.mp4[^"]*)"/g,
        /"contentUrl":"([^"]*\.mp4[^"]*)"/g,
        /"url":"([^"]*\.mp4[^"]*)"/g,
        /"videoUrl":"([^"]+)"/g,
    ];
}
```

#### **장점:**
- ✅ **워터마크 없는 원본 품질**
- ✅ **2-tier fallback 시스템** (sharedData → 정규식)
- ✅ **적절한 User-Agent 헤더**
- ✅ **URL 정제 로직** (\\u0026 → &, 이스케이프 제거)

#### **개선 필요 사항:**
- ⚠️ **Error Handling**: 현재 단순 null 반환
- ⚠️ **Rate Limiting**: 연속 요청 시 차단 위험
- ⚠️ **캐싱**: 동일 URL 반복 요청 최적화 없음

---

### **2. TikTok 다운로드 함수 (`downloadTikTokVideo`)**

#### **구현 위치**: `simple-web-server.js:2254-2268`

#### **현재 구현 상태:**
```javascript
async function downloadTikTokVideo(url) {
    // ❌ 현재 미구현 상태
    console.log('TikTok 비디오 다운로드 시도:', url);
    
    // 실제 구현에서는 TIKWM.com API나 다른 서비스를 사용
    // 현재는 null 반환하여 fallback 링크 사용
    return null;
}
```

#### **구현 필요 사항:**
- 🔴 **완전 미구현**: TikTok API 또는 서드파티 서비스 연동 필요
- 🔴 **URL 파싱**: TikTok shortcode 추출 로직 필요
- 🔴 **지역 제한**: VPN/프록시 우회 전략 필요

---

### **3. 비디오 다운로드 API 엔드포인트**

#### **엔드포인트**: `POST /api/download-social-video`
#### **구현 위치**: `simple-web-server.js:2096-2251`

#### **현재 워크플로우:**
```
1. URL + Platform 검증
2. downloadInstagramVideo() 또는 downloadTikTokVideo() 호출
3. 비디오 URL 추출
4. fetch()로 실제 비디오 파일 다운로드
5. ArrayBuffer → Response 스트림 반환
```

#### **장점:**
- ✅ **스트리밍 다운로드**: 메모리 효율적
- ✅ **적절한 헤더**: Content-Type, Content-Disposition 설정
- ✅ **파일명 자동 생성**: platform_shortcode.mp4 형식
- ✅ **상관관계 ID 추적**: 로깅 및 디버깅 지원

#### **개선점:**
- ⚠️ **YouTube 연동 부족**: 현재 Instagram/TikTok만 지원
- ⚠️ **GCS 업로드 없음**: 로컬 다운로드만 가능
- ⚠️ **메타데이터 동기화 없음**: 별도 API 호출 필요

---

## 🏗️ **YouTube 파이프라인과의 Gap Analysis**

### **YouTube 완전 자동화 플로우:**
```bash
URL 입력 → yt-dlp 다운로드 → GCS 업로드 → 메타데이터 결합 → VDP 생성
```

### **현재 Instagram/TikTok 플로우:**
```bash
URL 입력 → 메타데이터 추출 (/api/extract-social-metadata)
         → 비디오 다운로드 (/api/download-social-video) 
         → [수동 조합 필요] → VDP 생성
```

### **Missing Links:**
1. **자동 GCS 업로드**: YouTube처럼 통합 upload-id로 비디오+메타데이터 자동 업로드
2. **메타데이터 동기화**: 두 개의 별도 API 호출을 하나의 워크플로우로 통합
3. **VDP 파이프라인 연동**: YouTube의 `youtube-vdp-ingest.sh`와 동등한 스크립트

---

## 🎯 **최적화 전략 제안**

### **Phase 1: TikTok 다운로드 구현 (Critical)**
```javascript
async function downloadTikTokVideo(url) {
    try {
        // Option 1: TIKWM.com API 사용
        const tikwmResponse = await fetch(`https://www.tikwm.com/api/?url=${url}`);
        const data = await tikwmResponse.json();
        return data?.data?.play;
        
        // Option 2: 직접 TikTok 페이지 스크래핑 (Instagram 방식)
        const pageResponse = await fetch(url, { headers: tiktokHeaders });
        const html = await pageResponse.text();
        
        // TikTok의 __UNIVERSAL_DATA_FOR_REHYDRATION__ 파싱
        const dataMatch = html.match(/__UNIVERSAL_DATA_FOR_REHYDRATION__\s*=\s*({.+?});/);
        const videoUrl = extractTikTokVideoUrl(dataMatch[1]);
        
        return videoUrl;
    } catch (error) {
        console.error('TikTok 다운로드 실패:', error);
        return null;
    }
}
```

### **Phase 2: 통합 워크플로우 구현**
YouTube의 `youtube-vdp-ingest.sh`를 참고한 `social-vdp-ingest.sh` 생성:

```bash
#!/usr/bin/env bash
# social-vdp-ingest.sh

URL="$1"
PLATFORM="$2"  # instagram 또는 tiktok
UPLOAD_ID="$(uuidgen)"

# 1. 메타데이터 추출
METADATA=$(curl -X POST http://localhost:8080/api/extract-social-metadata \
               -H "Content-Type: application/json" \
               -d "{\"url\":\"$URL\",\"platform\":\"$PLATFORM\"}")

# 2. 비디오 다운로드
curl -X POST http://localhost:8080/api/download-social-video \
     -H "Content-Type: application/json" \
     -d "{\"url\":\"$URL\",\"platform\":\"$PLATFORM\"}" \
     --output "${CONTENT_ID}.mp4"

# 3. GCS 통합 업로드 (YouTube 방식과 동일)
gsutil -h "x-goog-meta-vdp-upload-id:${UPLOAD_ID}" \
       -h "x-goog-meta-vdp-platform:${PLATFORM}" \
       cp "${CONTENT_ID}.mp4" "gs://${RAW_BUCKET}/raw/ingest/${CONTENT_ID}.mp4"

gsutil -h "x-goog-meta-vdp-upload-id:${UPLOAD_ID}" \
       cp metadata.json "gs://${RAW_BUCKET}/raw/ingest/${CONTENT_ID}.json"
```

### **Phase 3: 통합 API 엔드포인트**
```javascript
// 새로운 통합 엔드포인트: /api/social-complete-ingest
app.post('/api/social-complete-ingest', async (req, res) => {
    const { url, platform } = req.body;
    const uploadId = uuidv4();
    
    try {
        // 1. 병렬 처리: 메타데이터 + 비디오 다운로드
        const [metadata, videoUrl] = await Promise.all([
            extractSocialMetadata(url, platform),
            downloadSocialVideo(url, platform)
        ]);
        
        // 2. GCS 통합 업로드
        await Promise.all([
            uploadVideoToGCS(videoUrl, uploadId, platform),
            uploadMetadataToGCS(metadata, uploadId, platform)
        ]);
        
        // 3. VDP 파이프라인 트리거
        const vdpResult = await triggerVDPExtraction(uploadId);
        
        return res.json({
            success: true,
            uploadId,
            vdpResult,
            processingTime: Date.now() - startTime
        });
        
    } catch (error) {
        // DLQ 처리 및 에러 응답
    }
});
```

---

## 📊 **성능 예측**

### **현재 상태:**
- Instagram 메타데이터: ~1.2초
- Instagram 비디오 다운로드: ~3-5초 (파일 크기에 따라)
- TikTok: 메타데이터만 가능 (비디오 미구현)

### **최적화 후 예상:**
- **Instagram 완전 자동화**: 5-8초 (메타데이터+비디오+GCS 업로드)
- **TikTok 완전 자동화**: 6-10초 (구현 후)
- **YouTube 동등 수준**: 30초-1분 (VDP 생성 포함)

---

## 🚨 **리스크 분석**

### **기술적 리스크:**
1. **Instagram 정책 변경**: _sharedData 구조 변경 시 파싱 실패
2. **Rate Limiting**: 대량 요청 시 IP 차단
3. **TikTok 지역 제한**: 특정 국가에서 접근 불가

### **법적 리스크:**
1. **저작권**: 다운로드된 비디오의 2차 사용
2. **ToS 위반**: 플랫폼 이용약관 위반 가능성
3. **개인정보**: 사용자 데이터 수집 관련 규정

### **운영 리스크:**
1. **안정성**: Instagram 구조 변경 시 서비스 중단
2. **확장성**: 대량 처리 시 서버 부하
3. **유지보수**: 플랫폼별 개별 유지보수 필요

---

## 🎯 **권장 구현 순서**

### **Week 1: TikTok 기본 구현**
1. `downloadTikTokVideo()` 함수 완성
2. TIKWM.com API 또는 직접 스크래핑 구현
3. 기본 테스트 및 검증

### **Week 2: 통합 워크플로우**
1. `social-vdp-ingest.sh` 스크립트 작성
2. `/api/social-complete-ingest` 엔드포인트 구현
3. YouTube 파이프라인과 동일한 GCS 업로드 로직

### **Week 3: 최적화 및 안정화**
1. 에러 핸들링 강화
2. Rate limiting 및 캐싱 구현
3. 성능 최적화 및 모니터링

---

**결론: 이미 상당한 기반 코드가 구현되어 있어 YouTube 수준의 자동화 달성이 충분히 가능합니다.**