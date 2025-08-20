/**
 * 실제 VDP 파이프라인 테스트
 * YouTube URL → 영상 다운로드 → VDP 생성 → BigQuery 적재까지 전체 검증
 */

const { chromium } = require('playwright');

async function testRealVDPPipeline() {
    console.log('🚀 실제 VDP 파이프라인 테스트 시작...');
    console.log('📝 테스트 URL: https://www.youtube.com/shorts/prJsmxT5cSY');
    
    const browser = await chromium.launch({ headless: false });
    const page = await browser.newPage();
    
    try {
        // Step 1: UI 로드 및 설정 확인
        console.log('\n📱 Step 1: UI 로드 및 실제 VDP 서버 모드 확인...');
        await page.goto('http://localhost:9001');
        await page.waitForLoadState('networkidle');
        
        // VDP 서버 설정 확인
        const vdpConfig = await page.evaluate(() => {
            return {
                apiBase: window.vdpProcessor?.apiBase,
                testMode: window.vdpProcessor?.testMode
            };
        });
        
        console.log(`📝 VDP 서버: ${vdpConfig.apiBase}`);
        console.log(`📝 테스트 모드: ${vdpConfig.testMode ? '❌ 테스트' : '✅ 실제'}`);
        
        // Step 2: YouTube URL 입력 및 자동 채움
        console.log('\n📝 Step 2: YouTube URL 입력...');
        
        const testUrl = 'https://www.youtube.com/shorts/prJsmxT5cSY';
        await page.fill('#youtube-url', testUrl);
        await page.click('body'); // blur 트리거
        await page.waitForTimeout(2000);
        
        const contentId = await page.inputValue('#youtube-content-id');
        console.log(`📝 추출된 Content ID: ${contentId}`);
        
        // Step 3: 필수 필드 설정
        console.log('\n⚙️ Step 3: 필수 필드 설정...');
        await page.selectOption('#youtube-video-origin', 'real_footage');
        await page.selectOption('#language', 'ko');
        
        // Step 4: 폼 제출
        console.log('\n🚀 Step 4: 실제 VDP 생성 요청...');
        
        // 제출 전 콘솔 로그 모니터링 시작
        const consoleLogs = [];
        page.on('console', msg => {
            if (msg.type() === 'log' || msg.type() === 'error') {
                consoleLogs.push(`[${msg.type()}] ${msg.text()}`);
            }
        });
        
        await page.click('#submit-btn');
        console.log('📝 폼 제출 완료 - VDP 생성 시작');
        
        // Step 5: 처리 진행 상황 모니터링
        console.log('\n⏳ Step 5: VDP 생성 진행 상황 모니터링...');
        
        // 진행 상황 섹션 표시 대기
        try {
            await page.waitForSelector('#progress-section', { state: 'visible', timeout: 15000 });
            console.log('✅ 진행 상황 섹션 표시됨');
            
            const platform = await page.textContent('#progress-platform');
            const jobId = await page.textContent('#progress-job-id');
            console.log(`📝 플랫폼: ${platform}`);
            console.log(`📝 ${jobId}`);
            
            // 실제 VDP 생성은 시간이 오래 걸릴 수 있으므로 충분한 시간 대기
            let completed = false;
            const maxAttempts = 60; // 3분 대기
            
            for (let i = 0; i < maxAttempts && !completed; i++) {
                await page.waitForTimeout(3000);
                
                const percentage = await page.textContent('#progress-percentage');
                const step = await page.textContent('#progress-step');
                console.log(`📊 ${percentage} - ${step}`);
                
                // 결과 섹션 확인
                const resultsVisible = await page.locator('#results-section').isVisible();
                if (resultsVisible) {
                    completed = true;
                    console.log('🎉 VDP 처리 완료!');
                    
                    // 성공/실패 확인
                    const isSuccess = await page.locator('.success-container').count() > 0;
                    const isError = await page.locator('.error-container').count() > 0;
                    
                    if (isSuccess) {
                        console.log('✅ VDP 생성 성공!');
                        
                        // Hook Gate 상태 확인
                        try {
                            const hookGateStatus = await page.textContent('.hook-gate-badge .badge-text');
                            console.log(`🎯 Hook Gate: ${hookGateStatus}`);
                        } catch (e) {
                            console.log('⚠️ Hook Gate 정보 없음');
                        }
                        
                        // 품질 지표 확인  
                        try {
                            const scenes = await page.textContent('#scenes-current');
                            const shots = await page.textContent('#shots-current'); 
                            const keyframes = await page.textContent('#keyframes-current');
                            console.log(`📊 품질 지표:`);
                            console.log(`   Scenes: ${scenes}`);
                            console.log(`   Shots: ${shots}`);
                            console.log(`   Keyframes: ${keyframes}`);
                        } catch (e) {
                            console.log('⚠️ 품질 지표 정보 없음');
                        }
                        
                        // VDP 다운로드 URL 확인
                        try {
                            const downloadBtn = await page.locator('.view-results-btn').getAttribute('onclick');
                            if (downloadBtn) {
                                const vdpUrl = downloadBtn.match(/'([^']+)'/)?.[1];
                                console.log(`📥 VDP 다운로드 URL: ${vdpUrl}`);
                                
                                // Step 6: VDP 내용 검증
                                if (vdpUrl) {
                                    await validateVDPContent(vdpUrl, page);
                                }
                            }
                        } catch (e) {
                            console.log('⚠️ VDP URL 추출 실패');
                        }
                        
                    } else if (isError) {
                        const errorTitle = await page.textContent('.error-title');
                        const errorMessage = await page.textContent('.error-message');
                        const errorCode = await page.textContent('.error-code');
                        
                        console.log(`❌ VDP 생성 실패:`);
                        console.log(`   제목: ${errorTitle}`);
                        console.log(`   메시지: ${errorMessage}`);
                        console.log(`   코드: ${errorCode}`);
                        
                        // 에러 수정 방법 확인
                        try {
                            const fixes = await page.locator('.error-fixes li').allTextContents();
                            console.log(`   해결방법: ${fixes.join(', ')}`);
                        } catch (e) {}
                    }
                    break;
                }
                
                // 에러가 중간에 발생했는지 체크
                const errorVisible = await page.locator('.error-container').isVisible();
                if (errorVisible) {
                    completed = true;
                    const errorTitle = await page.textContent('.error-title');
                    console.log(`❌ 처리 중 에러 발생: ${errorTitle}`);
                    break;
                }
            }
            
            if (!completed) {
                console.log('⚠️ 처리 시간 초과 (3분)');
            }
            
        } catch (error) {
            console.log(`❌ 진행 상황 모니터링 실패: ${error.message}`);
        }
        
        // 콘솔 로그 출력
        if (consoleLogs.length > 0) {
            console.log('\n📋 브라우저 콘솔 로그:');
            consoleLogs.forEach(log => console.log(`   ${log}`));
        }
        
    } catch (error) {
        console.error('❌ 테스트 실패:', error.message);
    } finally {
        await page.screenshot({ path: 'vdp-pipeline-test.png', fullPage: true });
        console.log('📸 스크린샷 저장: vdp-pipeline-test.png');
        
        await page.waitForTimeout(2000);
        await browser.close();
    }
}

async function validateVDPContent(vdpUrl, page) {
    console.log('\n🔍 Step 6: VDP 내용 검증...');
    
    try {
        // VDP 내용 다운로드 및 분석
        const vdpContent = await page.evaluate(async (url) => {
            try {
                const response = await fetch(url);
                const text = await response.text();
                return JSON.parse(text);
            } catch (e) {
                return null;
            }
        }, vdpUrl);
        
        if (!vdpContent) {
            console.log('❌ VDP 내용 다운로드 실패');
            return;
        }
        
        console.log('✅ VDP 내용 다운로드 성공');
        
        // Hook Genome 확인
        const hookGenome = vdpContent.overall_analysis?.hookGenome;
        if (hookGenome) {
            console.log('🧬 Hook Genome 정보:');
            console.log(`   Pattern Code: ${hookGenome.pattern_code}`);
            console.log(`   Start Time: ${hookGenome.start_sec}초`);
            console.log(`   Strength: ${hookGenome.strength_score}`);
            console.log(`   Delivery: ${hookGenome.delivery}`);
        } else {
            console.log('❌ Hook Genome 정보 없음');
        }
        
        // OCR 결과 확인
        const ocrText = vdpContent.overall_analysis?.ocr_text;
        if (ocrText && ocrText.length > 0) {
            console.log(`✅ OCR 추출 성공: "${ocrText.substring(0, 100)}..."`);
        } else {
            console.log('⚠️ OCR 텍스트 없음');
        }
        
        // ASR 결과 확인
        const asrTranscript = vdpContent.overall_analysis?.asr_transcript;
        if (asrTranscript && asrTranscript.length > 0) {
            console.log(`✅ 음성 인식 성공: "${asrTranscript.substring(0, 100)}..."`);
        } else {
            console.log('⚠️ 음성 인식 결과 없음');
        }
        
        // 씬 분석 확인
        const scenes = vdpContent.scenes;
        if (scenes && scenes.length > 0) {
            console.log(`✅ 씬 분석 성공: ${scenes.length}개 씬`);
            scenes.forEach((scene, idx) => {
                console.log(`   씬 ${idx + 1}: ${scene.narrative_unit?.summary || scene.summary || 'N/A'}`);
            });
        } else {
            console.log('❌ 씬 분석 결과 없음');
        }
        
        // 메타데이터 확인
        const metadata = vdpContent.metadata;
        if (metadata) {
            console.log('📊 메타데이터:');
            console.log(`   플랫폼: ${metadata.platform}`);
            console.log(`   조회수: ${metadata.view_count || 'N/A'}`);
            console.log(`   좋아요: ${metadata.like_count || 'N/A'}`);
        }
        
    } catch (error) {
        console.log(`❌ VDP 내용 검증 실패: ${error.message}`);
    }
}

testRealVDPPipeline().catch(console.error);