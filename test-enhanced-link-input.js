/**
 * Test script for enhanced link input system
 * Tests URL auto-fill, platform detection, and /api/submit endpoint
 */

const { chromium } = require('playwright');

async function testEnhancedLinkInput() {
    console.log('🚀 Testing enhanced link input system...');
    
    const browser = await chromium.launch({ headless: false });
    const page = await browser.newPage();
    
    try {
        // Navigate to the UI
        await page.goto('http://localhost:9001');
        console.log('✅ Loaded UI successfully');
        
        // Test 1: YouTube URL auto-fill
        console.log('\n📝 Test 1: YouTube URL auto-fill...');
        
        // Select YouTube platform
        await page.check('#youtube');
        await page.waitForSelector('#youtube-form.platform-form--active');
        
        // Enter a YouTube Shorts URL and trigger blur
        const testUrl = 'https://www.youtube.com/shorts/6_I2FmT1mbY';
        await page.fill('#youtube-url', testUrl);
        await page.click('body'); // Trigger blur
        
        // Wait for auto-fill to complete
        await page.waitForTimeout(2000);
        
        // Check if content_id was auto-filled
        const contentId = await page.inputValue('#youtube-content-id');
        console.log('📝 Auto-filled content_id:', contentId);
        
        if (contentId === '6_I2FmT1mbY') {
            console.log('✅ YouTube auto-fill working correctly');
        } else {
            console.log('❌ YouTube auto-fill failed');
        }
        
        // Test 2: Platform detection notification
        await page.waitForSelector('.url-notification', { timeout: 5000 });
        const notification = await page.textContent('.url-notification');
        console.log('📢 Notification:', notification);
        
        // Test 3: Instagram URL with platform switching
        console.log('\n📝 Test 2: Instagram URL with platform detection...');
        
        // Select Instagram platform
        await page.check('#instagram');
        await page.waitForSelector('#instagram-form.platform-form--active');
        
        // Enter an Instagram URL
        const instagramUrl = 'https://www.instagram.com/p/CX1234567/';
        await page.fill('#instagram-source-url', instagramUrl);
        await page.click('body'); // Trigger blur
        
        // Wait for auto-fill
        await page.waitForTimeout(2000);
        
        const instagramContentId = await page.inputValue('#instagram-content-id');
        console.log('📝 Instagram content_id:', instagramContentId);
        
        // Test 4: Test the new /api/submit endpoint directly
        console.log('\n📝 Test 3: Direct /api/submit endpoint test...');
        
        const submitResponse = await page.evaluate(async () => {
            try {
                const response = await fetch('/api/submit', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        url: 'https://www.youtube.com/shorts/6_I2FmT1mbY',
                        metadata: {
                            language: 'ko',
                            video_origin: 'real_footage'
                        }
                    })
                });
                
                return {
                    ok: response.ok,
                    status: response.status,
                    data: await response.json()
                };
            } catch (error) {
                return {
                    ok: false,
                    error: error.message
                };
            }
        });
        
        console.log('📡 /api/submit response:', submitResponse);
        
        if (submitResponse.ok) {
            console.log('✅ /api/submit endpoint working correctly');
            console.log('📝 GCS URI:', submitResponse.data.gcs_uri);
            console.log('📝 Standardized URL:', submitResponse.data.standardized_url);
        } else {
            console.log('❌ /api/submit endpoint failed');
        }
        
        // Test 5: Health check
        console.log('\n📝 Test 4: Health check...');
        const healthResponse = await page.evaluate(async () => {
            const response = await fetch('/api/health');
            return await response.json();
        });
        
        console.log('🔍 Health check:', healthResponse);
        
        console.log('\n🎉 Enhanced link input system tests completed!');
        
    } catch (error) {
        console.error('❌ Test failed:', error);
    } finally {
        await browser.close();
    }
}

// Run the test
testEnhancedLinkInput().catch(console.error);