import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { ApiProblems as Problems } from '@/lib/errors/problem';

const EmbedMetaSchema = z.object({
  url: z.string().url('Invalid URL format'),
});

// Official embed patterns - ONLY these domains are allowed
const ALLOWED_EMBED_PATTERNS = [
  /^https?:\/\/(?:www\.)?youtube\.com\/embed\/[A-Za-z0-9_-]+/,
  /^https?:\/\/player\.vimeo\.com\/video\/\d+/
];

function validateEmbedDomain(url: string): boolean {
  return ALLOWED_EMBED_PATTERNS.some(pattern => pattern.test(url));
}

function normalizeEmbedUrl(url: string): string {
  // Convert YouTube watch URLs to embed URLs
  if (url.includes('youtube.com/watch') || url.includes('youtu.be/')) {
    const videoId = extractYouTubeId(url);
    if (videoId) {
      return `https://www.youtube.com/embed/${videoId}`;
    }
  }
  
  // Convert Vimeo URLs to player URLs (but only main vimeo.com, not player.vimeo.com)
  if (url.match(/^https?:\/\/(?:www\.)?vimeo\.com\/\d+/) && !url.includes('player.vimeo.com')) {
    const videoId = extractVimeoId(url);
    if (videoId) {
      return `https://player.vimeo.com/video/${videoId}`;
    }
  }
  
  return url;
}

function extractYouTubeId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/)([A-Za-z0-9_-]+)/,
    /youtube\.com\/embed\/([A-Za-z0-9_-]+)/
  ];
  
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

function extractVimeoId(url: string): string | null {
  const patterns = [
    /vimeo\.com\/(\d+)/,
    /player\.vimeo\.com\/video\/(\d+)/
  ];
  
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

function getProviderInfo(url: string): { provider: 'youtube' | 'vimeo'; id: string } | null {
  if (url.includes('youtube.com')) {
    const id = extractYouTubeId(url);
    return id ? { provider: 'youtube', id } : null;
  }
  
  if (url.includes('vimeo.com')) {
    const id = extractVimeoId(url);
    return id ? { provider: 'vimeo', id } : null;
  }
  
  return null;
}

export async function POST(request: NextRequest) {
  const instance = '/api/embed-meta';
  
  try {
    const body = await request.json();
    const validatedData = EmbedMetaSchema.parse(body);
    
    // Normalize URL to official embed format
    const normalizedUrl = normalizeEmbedUrl(validatedData.url);
    
    // Validate against allowed domains
    if (!validateEmbedDomain(normalizedUrl)) {
      return Problems.embedDenied(
        normalizedUrl,
        'Only official YouTube and Vimeo embeds are allowed',
        instance
      );
    }
    
    // Get provider information
    const providerInfo = getProviderInfo(normalizedUrl);
    if (!providerInfo) {
      return Problems.embedDenied(
        normalizedUrl,
        'Unable to identify valid embed provider',
        instance
      );
    }
    
    // Generate response with normalized embed URL and metadata
    const response = {
      embedUrl: normalizedUrl,
      originalUrl: validatedData.url,
      provider: providerInfo.provider,
      videoId: providerInfo.id,
      title: generateTitle(providerInfo),
      thumbnail: generateThumbnail(providerInfo),
    };
    
    return NextResponse.json(response);
    
  } catch (error) {
    if (error instanceof z.ZodError) {
      const violations = error.errors.map(err => ({
        field: err.path.join('.'),
        message: err.message,
        code: 'VALIDATION_ERROR',
      }));
      return Problems.validation(violations, instance);
    }
    
    return Problems.validation([{
      field: 'request',
      message: 'Failed to process embed metadata request',
      code: 'INTERNAL_ERROR',
    }], instance);
  }
}

function generateTitle(providerInfo: { provider: 'youtube' | 'vimeo'; id: string }): string {
  return `${providerInfo.provider === 'youtube' ? 'YouTube' : 'Vimeo'} Video (${providerInfo.id})`;
}

function generateThumbnail(providerInfo: { provider: 'youtube' | 'vimeo'; id: string }): string {
  if (providerInfo.provider === 'youtube') {
    return `https://img.youtube.com/vi/${providerInfo.id}/maxresdefault.jpg`;
  }
  // Vimeo thumbnails require API call - return placeholder for now
  return `https://vumbnail.com/${providerInfo.id}.jpg`;
}













