const puppeteer = require('puppeteer');

class RealWorkingInstagramExtractor {
  constructor() {
    this.browser = null;
    this.page = null;
  }

  async initialize() {
    this.browser = await puppeteer.launch({
      headless: 'new',  // 최신 헤드리스 모드 (탐지 우회)
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-blink-features=AutomationControlled',
        '--disable-features=VizDisplayCompositor',
        '--user-agent=Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'
      ],
      ignoreDefaultArgs: ['--enable-automation'],
      executablePath: process.platform === 'darwin' 
        ? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' 
        : undefined // Windows/Linux는 기본 경로 사용
    });

    this.page = await this.browser.newPage();
    
    // 모바일 뷰포트 설정 (중요!)
    await this.page.setViewport({ width: 390, height: 844 });
    
    // WebDriver 탐지 우회
    await this.page.evaluateOnNewDocument(() => {
      Object.defineProperty(navigator, 'webdriver', {
        get: () => undefined,
      });
      
      // Chrome runtime 숨기기
      delete window.chrome;
      
      // Permissions API 오버라이드
      const originalQuery = window.navigator.permissions.query;
      return originalQuery.call(window.navigator.permissions, { name: 'notifications' });
    });
  }

  async extractComments(instagramUrl, maxComments = 20) {
    if (!this.browser) await this.initialize();
    
    try {
      console.log('🔄 Instagram 페이지 접근 중...');
      
      // 먼저 Instagram 홈페이지 방문 (세션 설정)
      await this.page.goto('https://www.instagram.com/', { 
        waitUntil: 'networkidle0',
        timeout: 30000 
      });
      
      // 3초 대기 (중요!)
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // 타겟 URL로 이동
      await this.page.goto(instagramUrl, { 
        waitUntil: 'networkidle0',
        timeout: 30000 
      });
      
      console.log('📱 모바일 모드로 댓글 섹션 탐지 중...');
      
      // 로그인 팝업 처리
      try {
        await this.page.waitForSelector('[role="dialog"] button', { timeout: 3000 });
        const closeButtons = await this.page.$$('[role="dialog"] button');
        if (closeButtons.length > 0) {
          await closeButtons[0].click();
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      } catch (e) {
        console.log('로그인 팝업 없음');
      }

      // 댓글 섹션 찾기 (2025년 최신 선택자)
      const commentSelectors = [
        'div[data-testid="comments"] div',
        'section div[role="button"]',
        'article section div[role="button"]',
        'ul[role="list"] > div',
        'div[class*="comment"] span'
      ];
      
      let comments = [];
      
      // 여러 선택자로 시도
      for (const selector of commentSelectors) {
        try {
          await this.page.waitForSelector(selector, { timeout: 5000 });
          
          console.log(`✅ 선택자 발견: ${selector}`);
          
          // 스크롤하여 더 많은 댓글 로드
          for (let i = 0; i < 3; i++) {
            await this.page.evaluate(() => {
              window.scrollTo(0, document.body.scrollHeight);
            });
            await new Promise(resolve => setTimeout(resolve, 2000));
          }
          
          // 댓글 추출
          comments = await this.page.evaluate((sel, maxComments) => {
            const elements = document.querySelectorAll(sel);
            const results = [];
            
            for (let i = 0; i < elements.length && results.length < maxComments; i++) {
              const element = elements[i];
              
              // 사용자명 추출
              const usernameElement = element.querySelector('a[href^="/"]');
              const username = usernameElement ? usernameElement.textContent.trim() : null;
              
              // 댓글 텍스트 추출
              let text = '';
              const textNodes = element.querySelectorAll('span');
              for (const node of textNodes) {
                if (node.textContent && 
                    node.textContent.trim().length > 10 && 
                    !node.querySelector('a') && 
                    !node.textContent.includes('@')) {
                  text = node.textContent.trim();
                  break;
                }
              }
              
              if (username && text && username !== text) {
                results.push({
                  id: `comment_${i}`,
                  username: username.replace('@', ''),
                  text: text,
                  created_at: new Date().toISOString(),
                  like_count: 0,
                  is_verified: false
                });
              }
            }
            
            return results;
          }, selector, maxComments);
          
          if (comments.length > 0) {
            console.log(`✅ ${comments.length}개 댓글 추출 성공!`);
            break;
          }
          
        } catch (e) {
          console.log(`❌ 선택자 실패: ${selector}`);
          continue;
        }
      }
      
      // 마지막 수단: 페이지 소스에서 직접 추출
      if (comments.length === 0) {
        console.log('🔍 페이지 소스에서 댓글 추출 시도...');
        
        const pageContent = await this.page.content();
        
        // window._sharedData 파싱
        const sharedDataMatch = pageContent.match(/window\._sharedData\s*=\s*({.+?});/);
        if (sharedDataMatch) {
          try {
            const sharedData = JSON.parse(sharedDataMatch[1]);
            const media = sharedData.entry_data?.PostPage?.[0]?.graphql?.shortcode_media;
            
            if (media?.edge_media_to_parent_comment?.edges) {
              comments = media.edge_media_to_parent_comment.edges.map((edge, index) => ({
                id: edge.node.id,
                username: edge.node.owner.username,
                text: edge.node.text,
                created_at: new Date(edge.node.created_at * 1000).toISOString(),
                like_count: edge.node.edge_liked_by.count,
                is_verified: edge.node.owner.is_verified
              }));
              
              console.log(`✅ SharedData에서 ${comments.length}개 댓글 추출!`);
            }
          } catch (e) {
            console.log('SharedData 파싱 실패:', e.message);
          }
        }
      }
      
      return comments;
      
    } catch (error) {
      console.error('❌ 댓글 추출 중 오류:', error.message);
      return [];
    }
  }

  async close() {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      this.page = null;
    }
  }
}

module.exports = RealWorkingInstagramExtractor;
