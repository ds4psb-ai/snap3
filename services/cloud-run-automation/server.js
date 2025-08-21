const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const cron = require('node-cron');
const axios = require('axios');
const winston = require('winston');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Logger 설정
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'automation.log' })
  ]
});

// Security middleware
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100
});
app.use(limiter);

// 상태 변수
let automationStatus = {
  isRunning: false,
  currentPhase: 'idle',
  lastUpdate: new Date().toISOString(),
  progress: 0,
  errors: [],
  vdpResults: []
};

// GPT-5 Pro API 호출 함수
async function callGPT5Pro(prompt, context = '') {
  try {
    logger.info('Calling GPT-5 Pro API...');
    
    const response = await axios.post('https://api.openai.com/v1/chat/completions', {
      model: 'gpt-5',
      messages: [
        {
          role: 'system',
          content: `You are a senior CTO consultant specializing in VDP (Viral DNA Profile) systems and Cloud Run automation. Provide concise, actionable technical guidance.`
        },
        {
          role: 'user',
          content: `${context}\n\n${prompt}`
        }
      ],
      max_tokens: 2000,
      temperature: 0.3
    }, {
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      timeout: 30000
    });

    logger.info('GPT-5 Pro API call successful');
    return response.data.choices[0].message.content;
  } catch (error) {
    logger.error('GPT-5 Pro API call failed:', error.message);
    throw new Error(`GPT-5 Pro API error: ${error.message}`);
  }
}

// VDP 생성 함수
async function generateVDP(url, platform) {
  try {
    logger.info(`Generating VDP for ${platform}: ${url}`);
    
    const vdpServiceUrl = process.env.VDP_SERVICE_URL || 'http://localhost:4000';
    const response = await axios.post(`${vdpServiceUrl}/api/vdp/url`, {
      url,
      platform
    }, {
      timeout: 120000 // 2 minutes
    });

    logger.info(`VDP generated successfully for ${platform}`);
    return response.data;
  } catch (error) {
    logger.error(`VDP generation failed for ${platform}:`, error.message);
    throw new Error(`VDP generation error: ${error.message}`);
  }
}

// 자동화 워크플로우
async function runAutomationWorkflow() {
  if (automationStatus.isRunning) {
    logger.warn('Automation already running, skipping...');
    return;
  }

  automationStatus.isRunning = true;
  automationStatus.currentPhase = 'starting';
  automationStatus.progress = 0;
  automationStatus.errors = [];
  automationStatus.vdpResults = [];

  try {
    // Phase 1: GPT-5 Pro에게 현재 상황 보고 및 전략 요청
    logger.info('Phase 1: Requesting strategy from GPT-5 Pro');
    automationStatus.currentPhase = 'gpt5-consultation';
    automationStatus.progress = 10;

    const context = `
    Current Status:
    - Universal VDP Clone service implemented
    - yt-dlp download issues with format errors
    - Need to complete VDP generation for 3 platforms: YouTube, TikTok, Instagram
    - Target: 1000-line quality VDP output
    `;

    const strategyPrompt = `
    We need to complete VDP generation for these 3 URLs:
    1. YouTube: https://www.youtube.com/shorts/aX5y8wz60ws
    2. TikTok: https://www.tiktok.com/@lovedby4bxnia/video/7529657626947374349
    3. Instagram: https://www.instagram.com/reel/DLx4668NGGv/

    Current issues:
    - yt-dlp format errors
    - Need Cloud Run deployment
    - VDP quality must reach 1000-line standard

    Provide specific technical steps to resolve these issues and complete the VDP generation.
    `;

    const gpt5Response = await callGPT5Pro(strategyPrompt, context);
    logger.info('GPT-5 Pro strategy received:', gpt5Response);

    // Phase 2: 전략 실행
    logger.info('Phase 2: Executing strategy');
    automationStatus.currentPhase = 'execution';
    automationStatus.progress = 30;

    // VDP 생성 시도
    const platforms = [
      { url: 'https://www.youtube.com/shorts/aX5y8wz60ws', platform: 'youtube' },
      { url: 'https://www.tiktok.com/@lovedby4bxnia/video/7529657626947374349', platform: 'tiktok' },
      { url: 'https://www.instagram.com/reel/DLx4668NGGv/', platform: 'instagram' }
    ];

    for (let i = 0; i < platforms.length; i++) {
      const { url, platform } = platforms[i];
      try {
        logger.info(`Processing ${platform}...`);
        automationStatus.progress = 40 + (i * 20);

        const vdpResult = await generateVDP(url, platform);
        automationStatus.vdpResults.push({
          platform,
          url,
          success: true,
          data: vdpResult,
          timestamp: new Date().toISOString()
        });

        logger.info(`${platform} VDP completed successfully`);
      } catch (error) {
        logger.error(`${platform} VDP failed:`, error.message);
        automationStatus.vdpResults.push({
          platform,
          url,
          success: false,
          error: error.message,
          timestamp: new Date().toISOString()
        });
        automationStatus.errors.push(`${platform}: ${error.message}`);
      }
    }

    // Phase 3: 결과 보고 및 다음 단계 요청
    logger.info('Phase 3: Reporting results to GPT-5 Pro');
    automationStatus.currentPhase = 'reporting';
    automationStatus.progress = 90;

    const resultsSummary = automationStatus.vdpResults.map(result => 
      `${result.platform}: ${result.success ? 'SUCCESS' : 'FAILED'} - ${result.error || 'VDP generated'}`
    ).join('\n');

    const reportPrompt = `
    VDP Generation Results:
    ${resultsSummary}

    Errors encountered:
    ${automationStatus.errors.join('\n')}

    What are the next steps to resolve any remaining issues and ensure all 3 platforms have high-quality VDPs?
    `;

    const nextStepsResponse = await callGPT5Pro(reportPrompt);
    logger.info('Next steps from GPT-5 Pro:', nextStepsResponse);

    automationStatus.currentPhase = 'completed';
    automationStatus.progress = 100;

  } catch (error) {
    logger.error('Automation workflow failed:', error);
    automationStatus.currentPhase = 'failed';
    automationStatus.errors.push(`Workflow error: ${error.message}`);
  } finally {
    automationStatus.isRunning = false;
    automationStatus.lastUpdate = new Date().toISOString();
  }
}

// API 엔드포인트들

// 헬스체크
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'cloud-run-automation',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

// 자동화 상태 확인
app.get('/api/status', (req, res) => {
  res.json(automationStatus);
});

// 자동화 시작
app.post('/api/start', async (req, res) => {
  try {
    if (automationStatus.isRunning) {
      return res.status(400).json({
        error: 'ALREADY_RUNNING',
        message: 'Automation is already running'
      });
    }

    // 비동기로 워크플로우 시작
    runAutomationWorkflow().catch(error => {
      logger.error('Background automation failed:', error);
    });

    res.json({
      status: 'started',
      message: 'Automation workflow started',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Failed to start automation:', error);
    res.status(500).json({
      error: 'START_FAILED',
      message: error.message
    });
  }
});

// GPT-5 Pro 직접 질문
app.post('/api/gpt5-ask', async (req, res) => {
  try {
    const { prompt, context } = req.body;
    
    if (!prompt) {
      return res.status(400).json({
        error: 'PROMPT_REQUIRED',
        message: 'Prompt is required'
      });
    }

    const response = await callGPT5Pro(prompt, context);
    
    res.json({
      status: 'success',
      response,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('GPT-5 Pro question failed:', error);
    res.status(500).json({
      error: 'GPT5_FAILED',
      message: error.message
    });
  }
});

// VDP 생성 직접 요청
app.post('/api/vdp-generate', async (req, res) => {
  try {
    const { url, platform } = req.body;
    
    if (!url || !platform) {
      return res.status(400).json({
        error: 'URL_AND_PLATFORM_REQUIRED',
        message: 'URL and platform are required'
      });
    }

    const result = await generateVDP(url, platform);
    
    res.json({
      status: 'success',
      result,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('VDP generation request failed:', error);
    res.status(500).json({
      error: 'VDP_GENERATION_FAILED',
      message: error.message
    });
  }
});

// 자동화 결과 조회
app.get('/api/results', (req, res) => {
  res.json({
    status: 'success',
    results: automationStatus.vdpResults,
    summary: {
      total: automationStatus.vdpResults.length,
      successful: automationStatus.vdpResults.filter(r => r.success).length,
      failed: automationStatus.vdpResults.filter(r => !r.success).length
    },
    timestamp: new Date().toISOString()
  });
});

// 자동화 재설정
app.post('/api/reset', (req, res) => {
  automationStatus = {
    isRunning: false,
    currentPhase: 'idle',
    lastUpdate: new Date().toISOString(),
    progress: 0,
    errors: [],
    vdpResults: []
  };
  
  res.json({
    status: 'success',
    message: 'Automation status reset',
    timestamp: new Date().toISOString()
  });
});

// 주기적 자동화 실행 (매 30분)
cron.schedule('*/30 * * * *', () => {
  logger.info('Scheduled automation check');
  if (!automationStatus.isRunning) {
    runAutomationWorkflow().catch(error => {
      logger.error('Scheduled automation failed:', error);
    });
  }
});

// 서버 시작
app.listen(PORT, '0.0.0.0', () => {
  logger.info(`🚀 Cloud Run Automation Service running on port ${PORT}`);
  logger.info(`📊 Health check: http://localhost:${PORT}/api/health`);
  logger.info(`🎯 Automation status: http://localhost:${PORT}/api/status`);
  logger.info(`🚀 Start automation: POST http://localhost:${PORT}/api/start`);
  logger.info(`🤖 GPT-5 Pro ask: POST http://localhost:${PORT}/api/gpt5-ask`);
  logger.info(`📊 VDP generate: POST http://localhost:${PORT}/api/vdp-generate`);
});
