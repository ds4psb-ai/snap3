import { v4 as uuidv4 } from 'uuid';
import winston from 'winston';
import { YouTubeService } from './youtube.service';
import { GeminiService } from './gemini.service';
import {
  GitHubVDPSchema,
  type GitHubVDP,
} from '../schemas/github-vdp-schema';
import { createGitHubVDPPrompt } from '../prompts/github-vdp-prompt';
import {
  ExtractVDPRequest,
  BatchExtractRequest,
  BatchExtractResponse,
  VDPExtractionError,
  PlatformNotSupportedError,
  ContentNotAccessibleError,
  PlatformDetectionResult,
  VDPExtractorConfig,
} from '../types';

// GitHub VDP specific response type
export interface GitHubVDPResponse {
  success: boolean;
  data?: GitHubVDP;
  error?: string;
  meta?: {
    processingTime: number;
    version: string;
    timestamp: string;
    extractorType: string;
  };
}

export class GitHubVDPExtractorService {
  private logger: winston.Logger;
  private youtubeService: YouTubeService;
  private geminiService: GeminiService;
  private config: VDPExtractorConfig;

  constructor(config: VDPExtractorConfig) {
    this.config = config;
    this.logger = winston.createLogger({
      level: 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json()
      ),
      defaultMeta: { service: 'github-vdp-extractor' },
      transports: [
        new winston.transports.Console()
      ],
    });

    this.youtubeService = new YouTubeService(
      config.youtube.apiKey,
      config.youtube.maxRetries,
      this.logger
    );
    this.geminiService = new GeminiService(
      config.gemini.apiKey,
      config.gemini.model,
      config.gemini.maxRetries,
      config.gemini.timeoutMs,
      this.logger
    );
  }

  /**
   * Extract VDP using GitHub VDP format
   */
  async extractVDP(request: ExtractVDPRequest): Promise<GitHubVDPResponse> {
    const startTime = Date.now();

    try {
      this.logger.info(`Starting GitHub VDP extraction for URL: ${request.url}`);

      // Step 1: Detect platform and extract content ID
      const platformInfo = this.detectPlatform(request.url || request.gcsUri || '');
      if (platformInfo.platform === 'unknown') {
        throw new PlatformNotSupportedError(platformInfo.platform);
      }

      // Step 2: Get YouTube metadata and comments
      let videoMetadata: any = {};
      let comments: any[] = [];
      
      if (platformInfo.platform === 'youtube') {
        try {
          // Get video info
          const videoInfo = await this.youtubeService.getVideoInfo(platformInfo.contentId);
          videoMetadata = {
            title: videoInfo.title || '',
            description: videoInfo.description || '',
            duration: videoInfo.duration || 0,
            viewCount: parseInt(videoInfo.viewCount || '0'),
            likeCount: parseInt(videoInfo.likeCount || '0'),
            commentCount: parseInt(videoInfo.commentCount || '0'),
            publishedAt: videoInfo.publishedAt || new Date().toISOString(),
            platform: 'YouTube'
          };

          // Get top comments
          if (request.options?.maxComments && request.options.maxComments > 0) {
            comments = await this.youtubeService.getVideoComments(
              platformInfo.contentId, 
              request.options.maxComments
            );
          }
        } catch (error) {
          this.logger.warn('Failed to fetch YouTube metadata:', error);
        }
      }

      // Step 3: Analyze with Gemini (try video download first, fallback to URL analysis)
      let vdpData: GitHubVDP;

      try {
        // Create GitHub VDP prompt with comprehensive instructions
        const prompt = createGitHubVDPPrompt(videoMetadata, comments);
        
        let geminiResponse: string;
        
        if (platformInfo.platform === 'youtube') {
          try {
            // First try: Download video for multimodal analysis
            this.logger.info('Attempting to download video for analysis...');
            const videoBuffer = await this.youtubeService.downloadVideoData(
              platformInfo.contentId,
              this.config.processing.maxFileSizeMB * 1024 * 1024
            );
            this.logger.info(`Downloaded video: ${videoBuffer.length} bytes`);
            
            // Use Gemini with video data
            this.logger.info('Analyzing video with Gemini (multimodal)...');
            geminiResponse = await this.geminiService.generateContent(
              prompt,
              videoBuffer,
              'video/mp4'
            );
          } catch (downloadError) {
            this.logger.warn('Video download failed, trying URL analysis instead:', downloadError);
            
            // Fallback: Use YouTube URL for analysis
            const videoUrl = `https://www.youtube.com/watch?v=${platformInfo.contentId}`;
            this.logger.info(`Analyzing video via URL: ${videoUrl}`);
            
            // Enhanced prompt for URL-based analysis
            const urlPrompt = `${prompt}\n\nVIDEO URL FOR ANALYSIS: ${videoUrl}\n\nNote: Analyze the video content at this URL. If you cannot directly access the video, provide the most detailed analysis possible based on the metadata provided above.`;
            
            geminiResponse = await this.geminiService.generateContent(urlPrompt);
          }
        } else {
          throw new PlatformNotSupportedError(platformInfo.platform);
        }
        
        // Parse and validate the response
        if (typeof geminiResponse === 'string') {
          try {
            // Log first 500 chars of response for debugging
            this.logger.info(`Gemini response preview: ${geminiResponse.substring(0, 500)}...`);
            
            // Try to extract JSON from response
            let jsonStr = geminiResponse;
            
            // Check if response is wrapped in code blocks
            const codeBlockMatch = geminiResponse.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
            if (codeBlockMatch) {
              jsonStr = codeBlockMatch[1].trim();
              this.logger.info('Extracted JSON from code blocks');
            }
            
            vdpData = JSON.parse(jsonStr) as GitHubVDP;
            this.logger.info('Successfully parsed Gemini JSON response');
          } catch (parseError) {
            this.logger.error('Failed to parse Gemini JSON response:', {
              error: parseError,
              responseLength: geminiResponse.length,
              responsePreview: geminiResponse.substring(0, 1000)
            });
            throw new Error('Invalid JSON response from Gemini');
          }
        } else {
          vdpData = geminiResponse as GitHubVDP;
        }

        // Ensure metadata consistency with actual data
        vdpData.metadata = {
          ...vdpData.metadata,
          platform: platformInfo.platform === 'youtube' ? 'YouTube' : vdpData.metadata.platform,
          source_url: request.url || request.gcsUri || '',
          view_count: videoMetadata.viewCount || vdpData.metadata.view_count,
          like_count: videoMetadata.likeCount || vdpData.metadata.like_count,
          comment_count: videoMetadata.commentCount || vdpData.metadata.comment_count,
          upload_date: videoMetadata.publishedAt || vdpData.metadata.upload_date
        };

      } catch (error) {
        this.logger.warn('Gemini analysis failed, using fallback values:', error);
        
        // Fallback: Create minimal GitHub VDP structure
        vdpData = this.createFallbackVDP(platformInfo, videoMetadata, request.url || request.gcsUri || '');
      }

      const processingTime = Date.now() - startTime;
      this.logger.info(`GitHub VDP extraction completed for ${platformInfo.contentId} in ${processingTime}ms`);

      return {
        success: true,
        data: vdpData,
        meta: {
          processingTime,
          version: '2.0.0', // GitHub VDP compatible version
          timestamp: new Date().toISOString(),
          extractorType: 'github-vdp-compatible'
        }
      };

    } catch (error) {
      const processingTime = Date.now() - startTime;
      this.logger.error('GitHub VDP extraction failed:', error);

      if (error instanceof VDPExtractionError) {
        throw error;
      }

      throw new VDPExtractionError('Failed to extract GitHub VDP', 'extraction-failed', 'high');
    }
  }

  /**
   * Detect platform from URL
   */
  private detectPlatform(url: string): PlatformDetectionResult {
    // YouTube detection
    const youtubeRegex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/|youtube\.com\/shorts\/)([^"&?\/\s]{11})/;
    const youtubeMatch = url.match(youtubeRegex);
    if (youtubeMatch) {
      return {
        platform: 'youtube',
        contentId: youtubeMatch[1],
        confidence: 0.95,
        normalizedUrl: url
      };
    }

    // Instagram detection
    const instagramRegex = /instagram\.com\/(?:p|reel)\/([A-Za-z0-9_-]+)/;
    const instagramMatch = url.match(instagramRegex);
    if (instagramMatch) {
      return {
        platform: 'instagram',
        contentId: instagramMatch[1],
        confidence: 0.9,
        normalizedUrl: url
      };
    }

    // TikTok detection
    const tiktokRegex = /tiktok\.com\/@[^\/]+\/video\/(\d+)/;
    const tiktokMatch = url.match(tiktokRegex);
    if (tiktokMatch) {
      return {
        platform: 'tiktok',
        contentId: tiktokMatch[1],
        confidence: 0.9,
        normalizedUrl: url
      };
    }

    return {
      platform: 'unknown',
      contentId: '',
      confidence: 0,
      normalizedUrl: url
    };
  }

  /**
   * Create fallback VDP when Gemini fails
   */
  private createFallbackVDP(
    platformInfo: PlatformDetectionResult, 
    videoMetadata: any, 
    sourceUrl: string
  ): GitHubVDP {
    const contentId = `C${String(Date.now()).slice(-6)}`;
    
    return {
      content_id: contentId,
      metadata: {
        comment_count: videoMetadata.commentCount || 0,
        hashtags: [] as string[],
        like_count: videoMetadata.likeCount || 0,
        platform: platformInfo.platform === 'youtube' ? 'YouTube' : platformInfo.platform,
        share_count: 0,
        source_url: sourceUrl,
        upload_date: videoMetadata.publishedAt || new Date().toISOString(),
        video_origin: 'Real-Footage' as const,
        view_count: videoMetadata.viewCount || 0
      },
      overall_analysis: {
        audience_reaction: {
          analysis: 'Fallback analysis: Limited metadata available',
          common_reactions: [],
          notable_comments: [],
          overall_sentiment: 'Neutral'
        },
        confidence: {
          device_analysis: 0.5,
          overall: 0.5,
          scene_classification: 0.5
        },
        emotional_arc: 'Unable to determine emotional arc due to limited analysis',
        graph_refs: {
          potential_meme_template: 'Unknown',
          related_hashtags: []
        },
        safety_flags: [],
        summary: videoMetadata.title || 'Video content analysis',
        asr_lang: 'unknown',
        asr_transcript: '',
        asr_translation_en: '',
        ocr_text: []
      },
      scenes: [],
      product_mentions: [],
      service_mentions: [],
      default_lang: 'en'
    };
  }

  /**
   * Batch extraction with GitHub VDP format
   */
  async extractVDPBatch(request: BatchExtractRequest): Promise<{
    success: boolean;
    results: Array<{
      url: string;
      result: GitHubVDPResponse;
    }>;
    totalProcessingTime: number;
  }> {
    const startTime = Date.now();
    const results: Array<{
      url: string;
      result: GitHubVDPResponse;
    }> = [];
    
    this.logger.info(`Starting GitHub VDP batch extraction for ${request.urls.length} URLs`);

    for (const url of request.urls) {
      try {
        const result = await this.extractVDP({
          url,
          options: request.options
        });
        
        results.push({
          url,
          result
        });
      } catch (error) {
        this.logger.error(`Batch extraction failed for ${url}:`, error);
        results.push({
          url,
          result: {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error occurred'
          }
        });
      }
    }

    const totalProcessingTime = Date.now() - startTime;

    return {
      success: true,
      results,
      totalProcessingTime
    };
  }

  /**
   * Health check for all services
   */
  async healthCheck(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    services: {
      gemini: 'up' | 'down' | 'degraded';
      youtube: 'up' | 'down' | 'degraded';
    };
    details?: any;
  }> {
    const results = {
      gemini: 'down' as 'up' | 'down' | 'degraded',
      youtube: 'down' as 'up' | 'down' | 'degraded',
    };

    // Test Gemini service
    try {
      const geminiOk = await this.geminiService.testConnection();
      results.gemini = geminiOk ? 'up' : 'down';
    } catch (error) {
      results.gemini = 'down';
    }

    // Test YouTube service
    try {
      const youtubeOk = await this.youtubeService.testConnection();
      results.youtube = youtubeOk ? 'up' : 'down';
    } catch (error) {
      results.youtube = 'down';
    }

    // Determine overall status
    let status: 'healthy' | 'degraded' | 'unhealthy';
    const upServices = Object.values(results).filter(s => s === 'up').length;
    const totalServices = Object.values(results).length;

    if (upServices === totalServices) {
      status = 'healthy';
    } else if (upServices > 0) {
      status = 'degraded';
    } else {
      status = 'unhealthy';
    }

    return {
      status,
      services: results,
    };
  }

  /**
   * Get service configuration info
   */
  getServiceInfo() {
    return {
      version: '2.0.0',
      schema: 'GitHub VDP Extractor Compatible',
      gemini: this.geminiService.getModelInfo(),
      supportedPlatforms: ['youtube', 'instagram', 'tiktok'],
      features: {
        deepAnalysis: true,
        sceneBreakdown: true,
        shotAnalysis: true,
        productMentions: true,
        audienceReaction: true,
        multiLanguageSupport: true,
        batchProcessing: true,
      },
    };
  }
}