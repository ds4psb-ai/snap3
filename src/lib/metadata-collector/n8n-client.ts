/**
 * n8n Workflow Client for Metadata Collection
 * Integrates with n8n workflows for platform-specific metadata extraction
 */

export interface MetadataCollectionResult {
  success: boolean;
  platform: 'youtube' | 'instagram' | 'tiktok';
  metadata: Record<string, any>;
  vdpHeaders: Record<string, string>;
  error?: string;
  limitations?: string;
}

export interface PlatformResolver {
  detectPlatform(url: string): 'youtube' | 'instagram' | 'tiktok' | null;
  validateUrl(url: string, platform: string): boolean;
}

export class N8NMetadataClient {
  private readonly baseUrl: string;
  private readonly timeout: number;
  private readonly apiKey?: string;

  constructor(
    baseUrl: string = process.env.N8N_BASE_URL || 'http://localhost:5678',
    timeout: number = 30000,
    apiKey: string = process.env.N8N_API_KEY || ''
  ) {
    this.baseUrl = baseUrl;
    this.timeout = timeout;
    this.apiKey = apiKey;
  }

  /**
   * Platform detection and URL validation
   */
  private detectPlatform(url: string): 'youtube' | 'instagram' | 'tiktok' | null {
    if (url.match(/(?:youtube\.com\/watch|youtu\.be)/)) {
      return 'youtube';
    }
    if (url.match(/instagram\.com\/(p|reel|tv)/)) {
      return 'instagram';
    }
    if (url.match(/(tiktok\.com|vm\.tiktok\.com|vt\.tiktok\.com)/)) {
      return 'tiktok';
    }
    return null;
  }

  /**
   * Collect metadata from any supported platform
   */
  async collectMetadata(url: string): Promise<MetadataCollectionResult> {
    const platform = this.detectPlatform(url);
    
    if (!platform) {
      throw new Error(`Unsupported platform for URL: ${url}`);
    }

    try {
      switch (platform) {
        case 'youtube':
          return await this.collectYouTubeMetadata(url);
        case 'instagram':
          return await this.collectInstagramMetadata(url);
        case 'tiktok':
          return await this.collectTikTokMetadata(url);
        default:
          throw new Error(`Platform ${platform} not implemented`);
      }
    } catch (error) {
      return {
        success: false,
        platform,
        metadata: {},
        vdpHeaders: {},
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * YouTube Data API via n8n workflow
   */
  private async collectYouTubeMetadata(url: string): Promise<MetadataCollectionResult> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    
    if (this.apiKey) {
      headers['Authorization'] = `Bearer ${this.apiKey}`;
    }

    const response = await fetch(`${this.baseUrl}/webhook/youtube-metadata?url=${encodeURIComponent(url)}`, {
      method: 'GET',
      headers,
      signal: AbortSignal.timeout(this.timeout)
    });

    if (!response.ok) {
      throw new Error(`YouTube metadata collection failed: ${response.statusText}`);
    }

    const result = await response.json();
    
    return {
      success: result.success,
      platform: 'youtube',
      metadata: result.metadata,
      vdpHeaders: this.extractVdpHeaders(result),
      error: result.error,
    };
  }

  /**
   * Instagram oEmbed/Graph API via n8n workflow
   */
  private async collectInstagramMetadata(url: string): Promise<MetadataCollectionResult> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    
    if (this.apiKey) {
      headers['Authorization'] = `Bearer ${this.apiKey}`;
    }

    const response = await fetch(`${this.baseUrl}/webhook/instagram-metadata?url=${encodeURIComponent(url)}`, {
      method: 'GET',
      headers,
      signal: AbortSignal.timeout(this.timeout)
    });

    if (!response.ok) {
      throw new Error(`Instagram metadata collection failed: ${response.statusText}`);
    }

    const result = await response.json();
    
    return {
      success: result.success,
      platform: 'instagram',
      metadata: result.metadata,
      vdpHeaders: this.extractVdpHeaders(result),
      error: result.error,
      limitations: result.metadata?.vdp?.limitations
    };
  }

  /**
   * TikTok oEmbed + Playwright via n8n workflow
   */
  private async collectTikTokMetadata(url: string): Promise<MetadataCollectionResult> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    
    if (this.apiKey) {
      headers['Authorization'] = `Bearer ${this.apiKey}`;
    }

    const response = await fetch(`${this.baseUrl}/webhook/tiktok-metadata?url=${encodeURIComponent(url)}`, {
      method: 'GET',
      headers,
      signal: AbortSignal.timeout(this.timeout)
    });

    if (!response.ok) {
      throw new Error(`TikTok metadata collection failed: ${response.statusText}`);
    }

    const result = await response.json();
    
    return {
      success: result.success,
      platform: 'tiktok',
      metadata: result.metadata,
      vdpHeaders: this.extractVdpHeaders(result),
      error: result.error,
      limitations: result.metadata?.vdp?.limitations
    };
  }

  /**
   * Extract VDP headers for T4 consumption
   */
  private extractVdpHeaders(result: any): Record<string, string> {
    const headers: Record<string, string> = {};
    
    // Extract all x-goog-meta-vdp-* headers
    Object.keys(result).forEach(key => {
      if (key.startsWith('x-goog-meta-vdp-')) {
        headers[key] = String(result[key]);
      }
    });

    return headers;
  }

  /**
   * Health check for n8n availability
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/rest/config.js`, {
        signal: AbortSignal.timeout(5000)
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * Normalize metadata to VDP format matching existing sample structure
   */
  static normalizeToVdp(result: MetadataCollectionResult): Record<string, any> {
    if (!result.success) {
      return {
        error: result.error,
        platform: result.platform
      };
    }

    // Generate content ID based on platform and video ID
    const contentId = result.platform === 'youtube' 
      ? result.metadata.videoId 
      : result.platform === 'instagram' 
        ? result.metadata.contentId || `ig_${Date.now()}`
        : `tt_${Date.now()}`;

    // VDP format matching C000888.json structure
    const vdpData = {
      content_id: contentId,
      metadata: {
        platform: result.platform.charAt(0).toUpperCase() + result.platform.slice(1),
        source_url: result.metadata.originalUrl || result.metadata.url,
        upload_date: result.metadata.publishedAt || new Date().toISOString(),
        video_origin: "Real-Footage", // Default assumption
        
        // Statistics (if available)
        view_count: result.metadata.statistics?.viewCount || 0,
        like_count: result.metadata.statistics?.likeCount || 0,
        comment_count: result.metadata.statistics?.commentCount || 0,
        share_count: result.metadata.statistics?.shareCount || 0,
        
        // Original sound info (mainly for TikTok)
        original_sound: {
          id: null,
          title: null
        },
        
        // Tags/hashtags
        hashtags: result.metadata.tags || [],
        cta_types: [], // Will be filled by VDP analysis
        
        // Preserve top_comments from n8n response
        top_comments: result.metadata.top_comments || []
      },
      
      // VDP summary for basic metadata
      vdp_summary: {
        title: result.metadata.title,
        description: result.metadata.description,
        author: result.metadata.authorName || result.metadata.channelTitle,
        duration_seconds: result.metadata.duration?.seconds || null,
        thumbnail_url: result.metadata.thumbnailUrl || result.metadata.thumbnails?.default?.url,
        
        // Auto-collection metadata
        auto_collected: true,
        collection_source: 'n8n_workflow',
        collection_timestamp: new Date().toISOString(),
        confidence: result.metadata.vdp?.confidence || 0.7,
        limitations: result.limitations
      },
      
      // Placeholder for detailed analysis (will be filled by VDP service)
      overall_analysis: {
        summary: "Basic metadata collected via n8n workflow. Detailed analysis pending.",
        confidence: {
          overall: result.metadata.vdp?.confidence || 0.7,
          metadata_collection: 0.95,
          detailed_analysis: 0.0 // Not yet analyzed
        },
        // Audience reaction includes comments for compatibility
        audience_reaction: {
          notable_comments: result.metadata.top_comments || [],
          sentiment_analysis: "pending",
          engagement_patterns: "pending"
        }
      },
      
      // Empty scenes array - to be filled by VDP service
      scenes: [],
      
      // Platform-specific extensions
      platform_specific: {
        ...(result.platform === 'youtube' && {
          video_id: result.metadata.videoId,
          channel_id: result.metadata.channelId,
          category_id: result.metadata.categoryId,
          default_language: result.metadata.defaultLanguage
        }),
        
        ...(result.platform === 'instagram' && {
          media_type: result.metadata.type,
          author_url: result.metadata.authorUrl,
          embed_html: result.metadata.html
        }),
        
        ...(result.platform === 'tiktok' && {
          media_type: result.metadata.type,
          author_url: result.metadata.authorUrl,
          embed_html: result.metadata.html
        })
      },

      // VDP headers for T4 consumption
      vdpHeaders: result.vdpHeaders
    };

    return vdpData;
  }
}

/**
 * Default instance for immediate use
 */
export const n8nClient = new N8NMetadataClient();