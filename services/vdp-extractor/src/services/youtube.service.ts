import { google, youtube_v3 } from 'googleapis';
import ytdl from 'ytdl-core';
import axios from 'axios';
import { NotableComment } from '../schemas/viral-dna-profile';
import { VDPExtractionError, ContentNotAccessibleError, RateLimitExceededError } from '../types';
import winston from 'winston';

export interface YouTubeVideoInfo {
  contentId: string;
  title: string;
  description: string;
  channelTitle: string;
  channelId: string;
  publishedAt: string;
  duration: string;
  viewCount: string;
  likeCount: string;
  commentCount: string;
  tags?: string[];
  categoryId: string;
  liveBroadcastContent: string;
  defaultLanguage?: string;
  defaultAudioLanguage?: string;
  thumbnails: any;
  channelSubscriberCount?: string;
  channelVideoCount?: string;
  channelViewCount?: string;
}

export interface YouTubeCommentThread {
  id: string;
  snippet: {
    videoId: string;
    topLevelComment: {
      id: string;
      snippet: {
        authorDisplayName: string;
        authorChannelId?: {
          value: string;
        };
        videoId: string;
        textDisplay: string;
        textOriginal: string;
        likeCount: number;
        publishedAt: string;
        updatedAt: string;
      };
    };
    canReply: boolean;
    totalReplyCount: number;
    isPublic: boolean;
  };
}

export class YouTubeService {
  private youtube: youtube_v3.Youtube;
  private logger: winston.Logger;
  private maxRetries: number;

  constructor(apiKey: string, maxRetries: number = 3, logger?: winston.Logger) {
    if (!apiKey) {
      throw new Error('YouTube API key is required');
    }

    this.youtube = google.youtube({
      version: 'v3',
      auth: apiKey,
    });

    this.maxRetries = maxRetries;
    this.logger = logger || winston.createLogger({
      level: 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      ),
      transports: [new winston.transports.Console()],
    });
  }

  /**
   * Extract video ID from YouTube URL
   */
  extractVideoId(url: string): string {
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/|youtube\.com\/shorts\/)([^&\\n?#]+)/,
      /^([a-zA-Z0-9_-]{11})$/ // Direct video ID
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) {
        return match[1];
      }
    }

    throw new VDPExtractionError(
      `Invalid YouTube URL or video ID: ${url}`,
      'url-parsing',
      'high'
    );
  }

  /**
   * Get video information from YouTube Data API
   */
  async getVideoInfo(videoId: string): Promise<YouTubeVideoInfo> {
    let attempt = 0;

    while (attempt < this.maxRetries) {
      try {
        this.logger.info(`Fetching YouTube video info for: ${videoId} (attempt ${attempt + 1})`);

        const response = await this.youtube.videos.list({
          part: ['snippet', 'statistics', 'contentDetails', 'status'],
          id: [videoId],
        });

        if (!response.data.items || response.data.items.length === 0) {
          throw new ContentNotAccessibleError(
            `https://youtube.com/watch?v=${videoId}`,
            'Video not found or not accessible'
          );
        }

        const video = response.data.items[0];
        const snippet = video.snippet!;
        const statistics = video.statistics!;
        const contentDetails = video.contentDetails!;

        // Get channel information
        const channelResponse = await this.youtube.channels.list({
          part: ['statistics'],
          id: [snippet.channelId!],
        });

        const channelStats = channelResponse.data.items?.[0]?.statistics;

        const videoInfo: YouTubeVideoInfo = {
          contentId: videoId,
          title: snippet.title || '',
          description: snippet.description || '',
          channelTitle: snippet.channelTitle || '',
          channelId: snippet.channelId || '',
          publishedAt: snippet.publishedAt || '',
          duration: contentDetails.duration || '',
          viewCount: statistics.viewCount || '0',
          likeCount: statistics.likeCount || '0',
          commentCount: statistics.commentCount || '0',
          tags: snippet.tags || undefined,
          categoryId: snippet.categoryId || '',
          liveBroadcastContent: snippet.liveBroadcastContent || 'none',
          defaultLanguage: snippet.defaultLanguage || undefined,
          defaultAudioLanguage: snippet.defaultAudioLanguage || undefined,
          thumbnails: snippet.thumbnails,
          channelSubscriberCount: channelStats?.subscriberCount || undefined,
          channelVideoCount: channelStats?.videoCount || undefined,
          channelViewCount: channelStats?.viewCount || undefined,
        };

        this.logger.info(`Successfully fetched video info for: ${videoId}`);
        return videoInfo;

      } catch (error: any) {
        attempt++;
        this.logger.error(`YouTube API attempt ${attempt} failed:`, error);

        // Handle specific YouTube API errors
        if (error.code === 403) {
          if (error.message?.includes('quota')) {
            throw new RateLimitExceededError('YouTube Data API', 3600);
          }
          throw new ContentNotAccessibleError(
            `https://youtube.com/watch?v=${videoId}`,
            'Access forbidden (private video, geo-blocked, or API permissions)'
          );
        }

        if (error.code === 404) {
          throw new ContentNotAccessibleError(
            `https://youtube.com/watch?v=${videoId}`,
            'Video not found'
          );
        }

        if (attempt >= this.maxRetries) {
          throw new VDPExtractionError(
            `Failed to fetch YouTube video info after ${this.maxRetries} attempts: ${error.message}`,
            'youtube-api',
            'high',
            error
          );
        }

        // Exponential backoff
        const delay = Math.pow(2, attempt) * 1000;
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }

    throw new VDPExtractionError(
      'YouTube API failed: Maximum retries exceeded',
      'youtube-api',
      'critical'
    );
  }

  /**
   * Get video comments from YouTube Data API
   */
  async getVideoComments(videoId: string, maxResults: number = 10): Promise<NotableComment[]> {
    try {
      this.logger.info(`Fetching YouTube comments for: ${videoId}`);

      const response = await this.youtube.commentThreads.list({
        part: ['snippet'],
        videoId: videoId,
        order: 'relevance',
        maxResults: maxResults,
        textFormat: 'plainText',
      });

      if (!response.data.items) {
        this.logger.warn(`No comments found for video: ${videoId}`);
        return [];
      }

      const comments: NotableComment[] = response.data.items.map((thread: any) => {
        const comment = thread.snippet?.topLevelComment?.snippet;
        if (!comment) return null;
        
        // Detect if Korean text is present (basic detection)
        const text = comment.textDisplay || comment.textOriginal || '';
        const hasKorean = /[ㄱ-ㅎ|ㅏ-ㅣ|가-힣]/.test(text);
        
        return {
          lang: hasKorean ? 'ko' : 'en',
          text: text,
          translation_en: text, // Will be translated by Gemini if Korean
          author: comment.authorDisplayName || 'Unknown',
          likeCount: comment.likeCount || 0,
          textDisplay: text // Add this for compatibility
        };
      }).filter(Boolean) as NotableComment[];

      this.logger.info(`Successfully fetched ${comments.length} comments for: ${videoId}`);
      return comments;

    } catch (error: any) {
      if (error.code === 403) {
        if (error.message?.includes('disabled')) {
          this.logger.warn(`Comments are disabled for video: ${videoId}`);
          return [];
        }
        if (error.message?.includes('quota')) {
          throw new RateLimitExceededError('YouTube Data API', 3600);
        }
      }

      this.logger.error(`Failed to fetch comments for ${videoId}:`, error);
      // Don't throw error for comments failure - return empty array
      return [];
    }
  }

  /**
   * Helper method to get category name from category ID
   */
  private getCategoryName(categoryId: string): string {
    const categories: { [key: string]: string } = {
      '1': 'Film & Animation',
      '2': 'Autos & Vehicles', 
      '10': 'Music',
      '15': 'Pets & Animals',
      '17': 'Sports',
      '19': 'Travel & Events',
      '20': 'Gaming',
      '22': 'People & Blogs',
      '23': 'Comedy',
      '24': 'Entertainment',
      '25': 'News & Politics',
      '26': 'Howto & Style',
      '27': 'Education',
      '28': 'Science & Technology',
    };
    
    return categories[categoryId] || 'Unknown';
  }

  /**
   * Get video stream info using ytdl-core
   */
  async getVideoStreamInfo(videoId: string): Promise<{
    videoUrl: string;
    audioUrl?: string;
    quality: string;
    format: string;
  }> {
    try {
      const url = `https://www.youtube.com/watch?v=${videoId}`;
      
      // Check if video is available
      const isValid = ytdl.validateURL(url);
      if (!isValid) {
        throw new ContentNotAccessibleError(url, 'Invalid YouTube URL');
      }

      const info = await ytdl.getInfo(url);
      
      // Get best quality video stream
      const videoFormats = ytdl.filterFormats(info.formats, 'video');
      const audioFormats = ytdl.filterFormats(info.formats, 'audio');

      if (videoFormats.length === 0) {
        throw new ContentNotAccessibleError(url, 'No video streams available');
      }

      // Select best quality video format
      const bestVideo = videoFormats.reduce((prev, current) => {
        const prevQuality = parseInt(prev.qualityLabel?.replace('p', '') || '0');
        const currentQuality = parseInt(current.qualityLabel?.replace('p', '') || '0');
        return currentQuality > prevQuality ? current : prev;
      });

      // Select best quality audio format
      const bestAudio = audioFormats.length > 0 ? audioFormats.reduce((prev, current) => {
        const prevBitrate = parseInt(prev.audioBitrate?.toString() || '0');
        const currentBitrate = parseInt(current.audioBitrate?.toString() || '0');
        return currentBitrate > prevBitrate ? current : prev;
      }) : undefined;

      return {
        videoUrl: bestVideo.url,
        audioUrl: bestAudio?.url,
        quality: bestVideo.qualityLabel || 'unknown',
        format: bestVideo.container || 'unknown',
      };

    } catch (error: any) {
      if (error.statusCode === 410) {
        throw new ContentNotAccessibleError(
          `https://www.youtube.com/watch?v=${videoId}`,
          'Video is no longer available'
        );
      }

      throw new VDPExtractionError(
        `Failed to get video stream info: ${error.message}`,
        'video-stream',
        'medium',
        error
      );
    }
  }

  /**
   * Download video data for analysis
   */
  async downloadVideoData(videoId: string, maxSizeBytes: number = 50 * 1024 * 1024): Promise<Buffer> {
    try {
      const streamInfo = await this.getVideoStreamInfo(videoId);
      
      this.logger.info(`Downloading video data for analysis: ${videoId}`);

      const response = await axios({
        method: 'GET',
        url: streamInfo.videoUrl,
        responseType: 'arraybuffer',
        maxContentLength: maxSizeBytes,
        timeout: 60000, // 60 seconds timeout
        headers: {
          'Range': `bytes=0-${Math.min(maxSizeBytes, 10 * 1024 * 1024)}`, // Limit to first 10MB for analysis
        },
      });

      const buffer = Buffer.from(response.data);
      this.logger.info(`Downloaded ${buffer.length} bytes for video: ${videoId}`);

      return buffer;

    } catch (error: any) {
      throw new VDPExtractionError(
        `Failed to download video data: ${error.message}`,
        'video-download',
        'medium',
        error
      );
    }
  }


  /**
   * Test YouTube API connection
   */
  async testConnection(): Promise<boolean> {
    try {
      const response = await this.youtube.videos.list({
        part: ['id'],
        id: ['dQw4w9WgXcQ'], // Rick Roll video ID - always available
      });

      return response.data.items !== undefined;
    } catch (error) {
      this.logger.error('YouTube API connection test failed:', error);
      return false;
    }
  }
}