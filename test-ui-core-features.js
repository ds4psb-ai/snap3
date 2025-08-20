/**
 * UI 핵심 기능 테스트 - 실제 YouTube URL로 검증
 * 간소화된 테스트로 핵심 기능만 검증
 */

const { chromium } = require('playwright');

async function testCoreUIFeatures() {
    console.log('🚀 UI 핵심 기능 테스트 시작...');
    
    const browser = await chromium.launch({ headless: false });
    const page = await browser.newPage();
    
    try {
        // Step 1: UI 로드
        console.log('\n📱 UI 로드 중...');
        await page.goto('http://localhost:9001');
        await page.waitForLoadState('networkidle');
        console.log('✅ UI 로드 완료');
        
        // Step 2: YouTube 폼이 기본 활성화되어 있는지 확인
        console.log('\n🎬 YouTube 폼 상태 확인...');
        const youtubeFormVisible = await page.locator('#youtube-form.platform-form--active').isVisible();
        console.log(`📝 YouTube 폼 활성화: ${youtubeFormVisible ? '✅' : '❌'}`);
        
        // Step 3: 실제 YouTube URL 입력 및 자동 채움 테스트
        console.log('\n📝 실제 YouTube URL 테스트...');
        const testUrl = 'https://www.youtube.com/shorts/prJsmxT5cSY';
        
        await page.fill('#youtube-url', testUrl);
        console.log(`📝 URL 입력: ${testUrl}`);
        
        // Blur 이벤트로 자동 채움 트리거
        await page.click('#youtube-content-id'); // 다른 필드 클릭으로 blur 발생
        await page.waitForTimeout(3000); // 자동 채움 처리 대기
        
        // 자동 채움된 Content ID 확인
        const contentId = await page.inputValue('#youtube-content-id');
        console.log(`📝 자동 채운 Content ID: ${contentId}`);
        
        if (contentId === 'prJsmxT5cSY') {
            console.log('✅ URL 자동 채움 성공');
        } else {
            console.log('❌ URL 자동 채움 실패');
        }
        
        // Step 4: 필수 필드 설정
        console.log('\n⚙️ 필수 필드 설정...');
        
        // Video Origin 설정
        await page.selectOption('#youtube-video-origin', 'real_footage');
        console.log('✅ Video Origin: real_footage 설정');
        
        // Step 5: 폼 제출 상태 확인
        console.log('\n🔍 폼 제출 상태 확인...');
        
        await page.waitForTimeout(1000); // 폼 validation 대기
        const submitEnabled = await page.locator('#submit-btn').isEnabled();
        console.log(`📝 제출 버튼 활성화: ${submitEnabled ? '✅' : '❌'}`);
        
        if (submitEnabled) {
            console.log('\n🚀 폼 제출 실행...');
            
            // 제출 버튼 클릭
            await page.click('#submit-btn');
            console.log('📝 제출 요청 전송');
            
            // 진행 상황 섹션 나타나는지 확인
            try {
                await page.waitForSelector('#progress-section', { state: 'visible', timeout: 10000 });
                console.log('✅ 진행 상황 섹션 표시됨');
                
                // Job 정보 확인
                const platform = await page.textContent('#progress-platform');
                const jobId = await page.textContent('#progress-job-id');
                console.log(`📝 플랫폼: ${platform}`);
                console.log(`📝 ${jobId}`);
                
                // 진행률 모니터링
                console.log('\n⏳ 처리 진행률 모니터링...');
                
                for (let i = 0; i < 20; i++) { // 최대 1분 대기
                    await page.waitForTimeout(3000);
                    
                    const percentage = await page.textContent('#progress-percentage');
                    const step = await page.textContent('#progress-step');
                    console.log(`📊 ${percentage} - ${step}`);
                    
                    // 결과 섹션 확인
                    const resultsVisible = await page.locator('#results-section').isVisible();
                    if (resultsVisible) {
                        console.log('🎉 처리 완료!');
                        
                        // 성공/실패 확인
                        const isSuccess = await page.locator('.success-container').count() > 0;
                        const isError = await page.locator('.error-container').count() > 0;
                        
                        if (isSuccess) {
                            console.log('✅ VDP 처리 성공!');
                            
                            // 결과 정보 수집
                            try {
                                const hookGate = await page.textContent('.hook-gate-badge');
                                console.log(`🎯 ${hookGate.replace(/\s+/g, ' ').trim()}`);
                            } catch (e) {}
                            
                            try {
                                const downloadBtn = await page.locator('.view-results-btn').count();
                                console.log(`📥 다운로드 버튼: ${downloadBtn > 0 ? '✅ 있음' : '❌ 없음'}`);
                            } catch (e) {}
                            
                        } else if (isError) {
                            const errorTitle = await page.textContent('.error-title');
                            console.log(`❌ 처리 실패: ${errorTitle}`);
                        }
                        break;
                    }
                }
                
            } catch (error) {
                console.log('⚠️ 진행 상황 섹션 로드 실패 또는 시간 초과');
            }
        }
        
        // Step 6: /api/submit 엔드포인트 직접 테스트
        console.log('\n🔧 /api/submit 엔드포인트 직접 테스트...');
        
        const submitResult = await page.evaluate(async () => {
            try {
                const response = await fetch('/api/submit', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        url: 'https://www.youtube.com/shorts/prJsmxT5cSY',
                        metadata: {
                            language: 'ko',
                            video_origin: 'real_footage'
                        }
                    })
                });
                
                const data = await response.json();
                return { success: response.ok, data };
            } catch (error) {
                return { success: false, error: error.message };
            }
        });
        
        if (submitResult.success) {
            console.log('✅ /api/submit 엔드포인트 정상 동작');
            console.log(`📝 Content ID: ${submitResult.data.content_id}`);
            console.log(`📝 Platform: ${submitResult.data.platform}`);
            console.log(`📝 GCS URI: ${submitResult.data.gcs_uri}`);
        } else {
            console.log(`❌ /api/submit 실패: ${submitResult.error}`);
        }
        
        console.log('\n🎉 핵심 기능 테스트 완료!');
        
    } catch (error) {
        console.error('❌ 테스트 오류:', error.message);
    } finally {
        // 최종 스크린샷
        await page.screenshot({ path: 'ui-core-test-final.png', fullPage: true });
        console.log('📸 최종 스크린샷: ui-core-test-final.png');
        
        await page.waitForTimeout(3000);
        await browser.close();
    }
}

testCoreUIFeatures().catch(console.error);