#!/usr/bin/env node
/**
 * TikTok Comments Microservice with Real Scraping
 * Express server with Playwright to scrape actual TikTok comments for n8n workflows
 */

const express = require('express');
const cors = require('cors');
const { chromium } = require('playwright');
const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Real TikTok Comments Scraping Function
async function scrapeTikTokComments(url, maxComments = 10) {
  let browser = null;
  try {
    console.log(`🔍 Starting to scrape comments from: ${url}`);
    
    browser = await chromium.launch({ 
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-web-security',
        '--disable-features=VizDisplayCompositor'
      ]
    });
    
    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      viewport: { width: 1280, height: 720 }
    });
    
    const page = await context.newPage();
    
    // Navigate to TikTok URL
    await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
    
    // Wait for comments section to load
    await page.waitForTimeout(3000);
    
    // Try to find and click "View more comments" if exists
    try {
      const viewMoreButton = page.locator('[data-e2e="comment-load-more"], button:has-text("View more comments")');
      if (await viewMoreButton.isVisible()) {
        await viewMoreButton.click();
        await page.waitForTimeout(2000);
      }
    } catch (e) {
      console.log('No "view more" button found or clickable');
    }
    
    // Extract comments using multiple selector strategies
    const comments = await page.evaluate((maxComments) => {
      const commentElements = [];
      
      // Try multiple selector patterns for TikTok comments
      const selectors = [
        '[data-e2e="comment-item"]',
        '[class*="comment-item"]',
        '[class*="Comment"]',
        '.comment-container',
        '[data-testid="comment"]'
      ];
      
      for (const selector of selectors) {
        const elements = document.querySelectorAll(selector);
        if (elements.length > 0) {
          console.log(`Found ${elements.length} comments with selector: ${selector}`);
          commentElements.push(...elements);
          break;
        }
      }
      
      const extractedComments = [];
      
      for (let i = 0; i < Math.min(commentElements.length, maxComments); i++) {
        const element = commentElements[i];
        
        try {
          // Try to extract comment data with various selectors
          const authorElement = element.querySelector('[data-e2e="comment-username"], [class*="username"], [class*="author"], strong, .user-name, [data-testid="author"]');
          const textElement = element.querySelector('[data-e2e="comment-text"], [class*="comment-text"], [class*="content"], p, span[class*="text"]');
          const likesElement = element.querySelector('[data-e2e="comment-like-count"], [class*="like"], [class*="heart"], [aria-label*="like"]');
          const timeElement = element.querySelector('[data-e2e="comment-time"], [class*="time"], time, [class*="date"]');
          
          const comment = {
            id: `comment_${i + 1}`,
            text: textElement?.textContent?.trim() || 'Comment text not found',
            author: authorElement?.textContent?.trim() || `user_${i + 1}`,
            likes: parseInt(likesElement?.textContent?.replace(/\D/g, '') || '0'),
            timestamp: timeElement?.textContent?.trim() || new Date().toISOString(),
            extracted_at: new Date().toISOString()
          };
          
          extractedComments.push(comment);
          
        } catch (error) {
          console.log(`Error extracting comment ${i}:`, error);
          // Add fallback comment
          extractedComments.push({
            id: `comment_${i + 1}`,
            text: 'Comment text extraction failed',
            author: `user_${i + 1}`,
            likes: 0,
            timestamp: new Date().toISOString(),
            extracted_at: new Date().toISOString(),
            error: error.message
          });
        }
      }
      
      return extractedComments;
    }, maxComments);
    
    console.log(`✅ Successfully extracted ${comments.length} comments`);
    return comments;
    
  } catch (error) {
    console.error('❌ Error scraping TikTok comments:', error.message);
    
    // Return fallback mock data on error
    return [
      {
        id: "fallback_1",
        text: "Unable to scrape real comments - fallback data",
        author: "scraper_fallback",
        likes: 0,
        timestamp: new Date().toISOString(),
        error: error.message,
        source: 'fallback_mock'
      }
    ];
    
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

// Mock comments data for fallback
const mockComments = {
  default: [
    {
      id: "mock_c1",
      text: "This is amazing! 😍",
      author: "user123",
      likes: 245,
      timestamp: new Date().toISOString()
    },
    {
      id: "mock_c2", 
      text: "Thanks for sharing this content!",
      author: "tiktoker456",
      likes: 89,
      timestamp: new Date(Date.now() - 3600000).toISOString()
    },
    {
      id: "mock_c3",
      text: "Can you make more videos like this? 🔥",
      author: "content_lover",
      likes: 156,
      timestamp: new Date(Date.now() - 7200000).toISOString()
    }
  ]
};

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy',
    service: 'TikTok Comments Microservice',
    timestamp: new Date().toISOString()
  });
});

// Main comments endpoint with real scraping
app.post('/api/comments', async (req, res) => {
  const { url, maxComments = 10, useRealScraping = true } = req.body;
  
  if (!url) {
    return res.status(400).json({
      error: 'URL is required',
      code: 'MISSING_URL'
    });
  }

  // Validate TikTok URL format
  const tiktokUrlRegex = /(tiktok\.com|vm\.tiktok\.com|vt\.tiktok\.com)/i;
  if (!tiktokUrlRegex.test(url)) {
    return res.status(400).json({
      error: 'Invalid TikTok URL format',
      code: 'INVALID_TIKTOK_URL'
    });
  }

  // Extract video ID from URL
  let videoId = 'default';
  const videoIdMatch = url.match(/video\/(\d+)/);
  if (videoIdMatch) {
    videoId = videoIdMatch[1];
  }

  try {
    let comments;
    let source;

    if (useRealScraping) {
      console.log(`🚀 Starting real scraping for video ID: ${videoId}`);
      comments = await scrapeTikTokComments(url, maxComments);
      source = comments.some(c => c.source === 'fallback_mock') ? 'real_scraping_with_fallback' : 'real_scraping';
    } else {
      console.log(`📦 Using mock data for video ID: ${videoId}`);
      comments = mockComments[videoId] || mockComments.default;
      source = 'mock_data';
    }
    
    res.json({
      success: true,
      url,
      videoId,
      comments: comments.map((comment, index) => ({
        ...comment,
        id: comment.id || `${videoId}_comment_${index}`,
        video_id: videoId
      })),
      metadata: {
        total_comments: comments.length,
        fetched_at: new Date().toISOString(),
        source,
        scraping_method: useRealScraping ? 'playwright' : 'mock',
        max_comments_requested: maxComments
      }
    });

  } catch (error) {
    console.error('❌ Error in comments endpoint:', error);
    
    // Fallback to mock data on error
    const comments = mockComments.default;
    res.json({
      success: false,
      error: error.message,
      url,
      videoId,
      comments: comments.map((comment, index) => ({
        ...comment,
        id: `${videoId}_fallback_${comment.id}_${index}`,
        video_id: videoId
      })),
      metadata: {
        total_comments: comments.length,
        fetched_at: new Date().toISOString(),
        source: 'error_fallback_mock',
        error_details: error.message
      }
    });
  }
});

// Error handler
app.use((err, req, res, next) => {
  console.error('TikTok Comments Service Error:', err);
  res.status(500).json({
    error: 'Internal server error',
    code: 'INTERNAL_ERROR',
    message: err.message
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Endpoint not found',
    code: 'NOT_FOUND',
    available_endpoints: [
      'GET /health',
      'POST /api/comments'
    ]
  });
});

const PORT = process.env.TIKTOK_COMMENTS_PORT || 3001;

app.listen(PORT, () => {
  console.log(`🚀 TikTok Comments Microservice running on port ${PORT}`);
  console.log(`📍 Health check: http://localhost:${PORT}/health`);
  console.log(`📍 Comments API: http://localhost:${PORT}/api/comments`);
});