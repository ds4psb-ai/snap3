/**
 * UI 변경사항 검증 테스트 - 실제 YouTube Shorts URL 사용
 * 테스트할 URL: https://www.youtube.com/shorts/prJsmxT5cSY
 */

const { chromium } = require('playwright');

async function testUIChangesWithRealData() {
    console.log('🚀 UI 변경사항 검증 시작...');
    console.log('📝 테스트 URL: https://www.youtube.com/shorts/prJsmxT5cSY');
    
    const browser = await chromium.launch({ headless: false });
    const page = await browser.newPage();
    
    try {
        // Step 1: UI 로드
        console.log('\n📱 Step 1: UI 로드...');
        await page.goto('http://localhost:9001');
        await page.waitForLoadState('networkidle');
        console.log('✅ UI 로드 완료');
        
        // Step 2: YouTube 플랫폼 선택 확인
        console.log('\n🎬 Step 2: YouTube 플랫폼 기본 선택 확인...');
        const youtubeChecked = await page.isChecked('#youtube');
        console.log(`📝 YouTube 플랫폼 선택됨: ${youtubeChecked}`);
        
        if (!youtubeChecked) {
            await page.check('#youtube');
            console.log('✅ YouTube 플랫폼 수동 선택');
        }
        
        // Step 3: Author 필드 제거 확인 (Instagram/TikTok)
        console.log('\n🔍 Step 3: Author 필드 제거 확인...');
        
        // Instagram으로 전환해서 author 필드가 없는지 확인
        await page.check('#instagram');
        await page.waitForSelector('#instagram-form.platform-form--active');
        
        const instagramAuthorField = await page.locator('#instagram-creator').count();
        console.log(`📝 Instagram author 필드 존재: ${instagramAuthorField > 0 ? '❌ 있음' : '✅ 제거됨'}`);
        
        // TikTok으로 전환해서 author 필드가 없는지 확인
        await page.check('#tiktok');
        await page.waitForSelector('#tiktok-form.platform-form--active');
        
        const tiktokAuthorField = await page.locator('#tiktok-creator').count();
        console.log(`📝 TikTok author 필드 존재: ${tiktokAuthorField > 0 ? '❌ 있음' : '✅ 제거됨'}`);
        
        // Step 4: YouTube로 다시 전환 및 실제 URL 테스트
        console.log('\n🎬 Step 4: YouTube로 전환 및 실제 URL 입력...');
        await page.check('#youtube');
        await page.waitForSelector('#youtube-form.platform-form--active');
        
        const testUrl = 'https://www.youtube.com/shorts/prJsmxT5cSY';
        await page.fill('#youtube-url', testUrl);
        
        // Blur 이벤트 트리거 (URL 자동 채움)
        await page.click('body');
        console.log('📝 URL 입력 및 blur 이벤트 트리거');
        
        // Step 5: 자동 채움 확인
        console.log('\n🔄 Step 5: URL 자동 채움 확인...');
        await page.waitForTimeout(3000); // 자동 채움 대기
        
        const contentId = await page.inputValue('#youtube-content-id');
        console.log(`📝 자동 채운 Content ID: ${contentId}`);
        
        if (contentId === 'prJsmxT5cSY') {
            console.log('✅ URL 자동 채움 성공');
        } else {
            console.log('❌ URL 자동 채움 실패');
        }
        
        // Step 6: 플랫폼 감지 알림 확인
        console.log('\n🎯 Step 6: 플랫폼 감지 알림 확인...');
        try {
            await page.waitForSelector('.url-notification', { timeout: 5000 });
            const notification = await page.textContent('.url-notification');
            console.log(`📢 감지 알림: ${notification.replace(/\s+/g, ' ').trim()}`);
        } catch (error) {
            console.log('⚠️ 플랫폼 감지 알림을 찾을 수 없음');
        }
        
        // Step 7: 필수 필드 채우기
        console.log('\n📝 Step 7: 필수 필드 채우기...');
        
        // video_origin 선택
        await page.selectOption('#youtube-video-origin', 'real_footage');
        console.log('✅ Video Origin: real_footage 선택');
        
        // 언어 설정 확인
        const language = await page.inputValue('#language');
        console.log(`📝 언어 설정: ${language}`);
        
        // Step 8: 폼 제출 가능 상태 확인
        console.log('\n✅ Step 8: 폼 제출 가능 상태 확인...');
        
        const submitBtn = page.locator('#submit-btn');
        const isSubmitEnabled = await submitBtn.isEnabled();
        console.log(`📝 제출 버튼 활성화: ${isSubmitEnabled ? '✅ 가능' : '❌ 불가능'}`);
        
        if (isSubmitEnabled) {
            // Step 9: 실제 제출 테스트
            console.log('\n🚀 Step 9: 실제 폼 제출 테스트...');
            
            // 제출 버튼 클릭
            await submitBtn.click();
            console.log('📝 폼 제출 요청');
            
            // 진행 상황 섹션 표시 대기
            await page.waitForSelector('#progress-section', { state: 'visible', timeout: 10000 });
            console.log('✅ 진행 상황 섹션 표시됨');
            
            // 플랫폼 및 Job ID 확인
            const progressPlatform = await page.textContent('#progress-platform');
            const progressJobId = await page.textContent('#progress-job-id');
            console.log(`📝 처리 플랫폼: ${progressPlatform}`);
            console.log(`📝 Job ID: ${progressJobId}`);
            
            // Step 10: 처리 상태 모니터링 (최대 2분)
            console.log('\n⏳ Step 10: 처리 상태 모니터링...');
            
            let attempts = 0;
            const maxAttempts = 40; // 2분 (3초 간격)
            
            while (attempts < maxAttempts) {
                await page.waitForTimeout(3000);
                attempts++;
                
                // 현재 진행 상태 확인
                const progressPercentage = await page.textContent('#progress-percentage');
                const progressStep = await page.textContent('#progress-step');
                
                console.log(`📊 진행률: ${progressPercentage} - ${progressStep}`);
                
                // 결과 섹션이 나타났는지 확인
                const resultsVisible = await page.locator('#results-section').isVisible();
                if (resultsVisible) {
                    console.log('🎉 처리 완료 - 결과 섹션 표시됨');
                    break;
                }
                
                // 에러 체크
                const errorContainer = await page.locator('.error-container').count();
                if (errorContainer > 0) {
                    const errorMessage = await page.textContent('.error-message');
                    console.log(`❌ 처리 실패: ${errorMessage}`);
                    break;
                }
            }
            
            // Step 11: 최종 결과 확인
            console.log('\n🔍 Step 11: 최종 결과 확인...');
            
            const resultsVisible = await page.locator('#results-section').isVisible();
            if (resultsVisible) {
                // 성공 여부 확인
                const successContainer = await page.locator('.success-container').count();
                const errorContainer = await page.locator('.error-container').count();
                
                if (successContainer > 0) {
                    console.log('✅ VDP 처리 성공!');
                    
                    // Hook Gate 상태 확인
                    try {
                        const hookGateStatus = await page.textContent('.hook-gate-badge .badge-text');
                        console.log(`🎯 Hook Gate: ${hookGateStatus}`);
                    } catch (e) {
                        console.log('⚠️ Hook Gate 상태 확인 불가');
                    }
                    
                    // 품질 지표 확인
                    try {
                        const scenes = await page.textContent('#scenes-current');
                        const shots = await page.textContent('#shots-current');
                        const keyframes = await page.textContent('#keyframes-current');
                        console.log(`📊 품질 지표 - Scenes: ${scenes}, Shots: ${shots}, Keyframes: ${keyframes}`);
                    } catch (e) {
                        console.log('⚠️ 품질 지표 확인 불가');
                    }
                    
                } else if (errorContainer > 0) {
                    const errorTitle = await page.textContent('.error-title');
                    const errorMessage = await page.textContent('.error-message');
                    console.log(`❌ 처리 실패: ${errorTitle} - ${errorMessage}`);
                }
            } else {
                console.log('⚠️ 처리 시간 초과 또는 결과 미표시');
            }
        }
        
        console.log('\n🎉 UI 변경사항 검증 완료!');
        
    } catch (error) {
        console.error('❌ 테스트 실패:', error.message);
    } finally {
        console.log('\n📸 스크린샷 캡처...');
        await page.screenshot({ path: 'ui-test-result.png', fullPage: true });
        console.log('✅ 스크린샷 저장: ui-test-result.png');
        
        // 브라우저 닫기 전 잠시 대기
        await page.waitForTimeout(3000);
        await browser.close();
    }
}

// 테스트 실행
testUIChangesWithRealData().catch(console.error);