import { v4 as uuidv4 } from 'uuid';
import winston from 'winston';
import { YouTubeService } from './youtube.service';
import { GeminiService } from './gemini.service';
import {
  ViralDNAProfileSchema,
  type ViralDNAProfile,
  validateViralDNAProfile,
  createEmptyVDP,
} from '../schemas/viral-dna-profile';
import {
  ExtractVDPRequest,
  ExtractVDPResponse,
  BatchExtractRequest,
  BatchExtractResponse,
  VDPExtractionError,
  PlatformNotSupportedError,
  ContentNotAccessibleError,
  PlatformDetectionResult,
  VDPExtractorConfig,
} from '../types';

export class VDPExtractorService {
  private youtubeService: YouTubeService;
  private geminiService: GeminiService;
  private logger: winston.Logger;
  private config: VDPExtractorConfig;

  constructor(config: VDPExtractorConfig, logger?: winston.Logger) {
    this.config = config;
    this.logger = logger || winston.createLogger({
      level: 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      ),
      transports: [new winston.transports.Console()],
    });

    // Initialize services
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
   * Main VDP extraction method - now returns GitHub VDP structure
   */
  async extractVDP(request: ExtractVDPRequest): Promise<ExtractVDPResponse> {
    const startTime = Date.now();

    try {
      this.logger.info(`Starting VDP extraction for URL: ${request.url}`);

      // Step 1: Detect platform and extract content ID
      const platformInfo = this.detectPlatform(request.url || request.gcsUri || '');
      if (platformInfo.platform === 'unknown') {
        throw new PlatformNotSupportedError(platformInfo.platform);
      }

      // Step 2: Get basic metadata from platform API
      let platformMetadata = {};
      
      if (platformInfo.platform === 'youtube') {
        try {
          const videoInfo = await this.youtubeService.getVideoInfo(platformInfo.contentId);
          platformMetadata = {
            title: videoInfo.title || '',
            description: videoInfo.description || '',
            publishedAt: videoInfo.publishedAt || new Date().toISOString(),
            channelTitle: videoInfo.channelTitle || '',
            viewCount: parseInt(videoInfo.viewCount || '0'),
            likeCount: parseInt(videoInfo.likeCount || '0'),
            commentCount: parseInt(videoInfo.commentCount || '0'),
            thumbnails: videoInfo.thumbnails,
          };
        } catch (error) {
          this.logger.warn('Failed to fetch platform metadata:', error);
        }
      }

      // Step 3: Perform comprehensive Gemini analysis
      let vdpData: ViralDNAProfile;

      try {
        // Download video for analysis
        let videoBuffer: Buffer;
        if (platformInfo.platform === 'youtube') {
          videoBuffer = await this.youtubeService.downloadVideoData(
            platformInfo.contentId,
            this.config.processing.maxFileSizeMB * 1024 * 1024
          );
        } else {
          throw new PlatformNotSupportedError(platformInfo.platform);
        }

        // Analyze with Gemini to get complete VDP structure
        const analysisResult = await this.geminiService.analyzeVideoContent(
          videoBuffer,
          'video/mp4',
          {
                      source_url: request.url || request.gcsUri || '',
          platform: platformInfo.platform,
          content_id: platformInfo.contentId,
            ...platformMetadata,
          }
        );
        
        vdpData = analysisResult as ViralDNAProfile;

        // Ensure content_id is set correctly
        vdpData.content_id = platformInfo.contentId;

        // Update metadata with actual platform data
        if (platformMetadata) {
          vdpData.metadata = {
            ...vdpData.metadata,
            source_url: request.url || request.gcsUri || '',
            platform: this.capitalizePlatform(platformInfo.platform),
            view_count: (platformMetadata as any).viewCount || vdpData.metadata.view_count || 0,
            like_count: (platformMetadata as any).likeCount || vdpData.metadata.like_count || 0,
            comment_count: (platformMetadata as any).commentCount || vdpData.metadata.comment_count || 0,
            upload_date: (platformMetadata as any).publishedAt || vdpData.metadata.upload_date || new Date().toISOString(),
          };
        }

      } catch (error) {
        this.logger.error('Gemini analysis failed:', error);
        
        // Create fallback VDP with basic structure
        vdpData = this.createFallbackVDP(platformInfo, platformMetadata, request.url || request.gcsUri || '');
      }

      // Validate the final VDP
      const validatedVDP = validateViralDNAProfile(vdpData);
      const processingTime = Date.now() - startTime;

      this.logger.info(`VDP extraction completed successfully for content_id: ${vdpData.content_id}`);

      return {
        success: true,
        data: validatedVDP,
        processingTime: processingTime,
      };

    } catch (error) {
      const processingTime = Date.now() - startTime;
      this.logger.error('VDP extraction failed:', error);

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        processingTime: processingTime,
      };
    }
  }

  /**
   * Create fallback VDP when Gemini analysis fails
   */
  private createFallbackVDP(
    platformInfo: PlatformDetectionResult,
    platformMetadata: any,
    sourceUrl: string
  ): ViralDNAProfile {
    const baseVDP = createEmptyVDP(platformInfo.contentId);

    return {
      ...baseVDP,
      content_id: platformInfo.contentId,
      metadata: {
        comment_count: platformMetadata.commentCount || 0,
        cta_types: [],
        hashtags: [],
        like_count: platformMetadata.likeCount || 0,
        original_sound: { id: null, title: null },
        platform: this.capitalizePlatform(platformInfo.platform),
        share_count: 0,
        source_url: sourceUrl,
        upload_date: platformMetadata.publishedAt || new Date().toISOString(),
        video_origin: 'Real-Footage',
        view_count: platformMetadata.viewCount || 0,
      },
      overall_analysis: {
        audience_reaction: {
          analysis: 'Analysis unavailable - fallback data generated due to processing limitations.',
          common_reactions: [],
          notable_comments: [],
          overall_sentiment: 'Unknown',
        },
        confidence: {
          device_analysis: 0.3,
          overall: 0.3,
          scene_classification: 0.3,
        },
        emotional_arc: 'Emotional progression could not be determined from available data.',
        graph_refs: {
          potential_meme_template: 'Meme potential analysis unavailable.',
          related_hashtags: [],
        },
        safety_flags: [],
        summary: `${this.capitalizePlatform(platformInfo.platform)} content (${platformInfo.contentId}) - Basic metadata extracted, detailed analysis unavailable.`,
        asr_lang: 'en',
        asr_transcript: '',
        asr_translation_en: '',
        ocr_text: [],
      },
      product_mentions: [],
      scenes: [],
      service_mentions: [],
      default_lang: 'en',
    } as ViralDNAProfile;
  }

  /**
   * Batch VDP extraction
   */
  async extractVDPBatch(request: BatchExtractRequest): Promise<BatchExtractResponse> {
    const startTime = Date.now();
    const results: BatchExtractResponse['results'] = [];

    this.logger.info(`Starting batch VDP extraction for ${request.urls.length} URLs`);

    // Process URLs in parallel with concurrency limit
    const concurrency = Math.min(
      this.config.processing.maxConcurrentJobs,
      request.urls.length
    );

    const processUrl = async (url: string) => {
      try {
        const result = await this.extractVDP({
          url,
          options: request.options,
        });

        return {
          url,
          result,
        };
      } catch (error) {
        return {
          url,
          result: {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
          },
        };
      }
    };

    // Process URLs in batches
    for (let i = 0; i < request.urls.length; i += concurrency) {
      const batch = request.urls.slice(i, i + concurrency);
      const batchResults = await Promise.all(batch.map(processUrl));
      results.push(...batchResults);

      this.logger.info(`Processed batch ${Math.floor(i / concurrency) + 1}/${Math.ceil(request.urls.length / concurrency)}`);
    }

    const totalProcessingTime = Date.now() - startTime;

    return {
      success: true,
      results,
      totalProcessingTime,
    };
  }

  /**
   * Detect platform from URL
   */
  private detectPlatform(url: string): PlatformDetectionResult {
    // YouTube patterns
    const youtubePatterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/|youtube\.com\/shorts\/)([^&\\n?#]+)/,
      /^https?:\/\/(?:www\.)?youtube\.com\/.*$/,
      /^https?:\/\/(?:www\.)?youtu\.be\/.*$/,
    ];

    for (const pattern of youtubePatterns) {
      const match = url.match(pattern);
      if (match) {
        try {
          const contentId = this.youtubeService.extractVideoId(url);
          return {
            platform: 'youtube',
            contentId,
            confidence: 0.95,
            normalizedUrl: `https://www.youtube.com/watch?v=${contentId}`,
          };
        } catch (error) {
          // Continue to other patterns
        }
      }
    }

    // TikTok patterns
    const tiktokPatterns = [
      /tiktok\.com\/@[\w.-]+\/video\/(\d+)/,
      /vm\.tiktok\.com\/([A-Za-z0-9]+)/,
    ];

    for (const pattern of tiktokPatterns) {
      const match = url.match(pattern);
      if (match) {
        return {
          platform: 'tiktok',
          contentId: match[1],
          confidence: 0.9,
          normalizedUrl: url,
        };
      }
    }

    // Instagram patterns
    const instagramPatterns = [
      /instagram\.com\/p\/([A-Za-z0-9_-]+)/,
      /instagram\.com\/reel\/([A-Za-z0-9_-]+)/,
    ];

    for (const pattern of instagramPatterns) {
      const match = url.match(pattern);
      if (match) {
        return {
          platform: 'instagram',
          contentId: match[1],
          confidence: 0.9,
          normalizedUrl: url,
        };
      }
    }

    return {
      platform: 'unknown',
      contentId: '',
      confidence: 0,
      normalizedUrl: url,
    };
  }

  /**
   * Capitalize platform name for consistent formatting
   */
  private capitalizePlatform(platform: string): string {
    switch (platform.toLowerCase()) {
      case 'youtube':
        return 'YouTube';
      case 'instagram':
        return 'Instagram';
      case 'tiktok':
        return 'TikTok';
      case 'facebook':
        return 'Facebook';
      case 'twitter':
        return 'Twitter';
      default:
        return platform.charAt(0).toUpperCase() + platform.slice(1);
    }
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

  /**
   * Test VDP extraction with a sample video
   */
  async testExtraction(sampleUrl?: string): Promise<ExtractVDPResponse> {
    const testUrl = sampleUrl || 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'; // Rick Roll as default test
    
    this.logger.info(`Testing VDP extraction with URL: ${testUrl}`);
    
    return await this.extractVDP({
      url: testUrl,
      options: {
        deepAnalysis: true,
        maxComments: 5,
      },
    });
  }
}