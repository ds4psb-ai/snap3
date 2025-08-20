/**
 * Platform Normalization Utility
 * Standardizes platform names for consistent content_key generation
 */

// Platform mapping for normalization
const PLATFORM_MAPPING = {
  // YouTube variants
  'youtube': 'youtube',
  'youtube shorts': 'youtube',
  'youtube_shorts': 'youtube',
  'yt': 'youtube',
  
  // TikTok variants
  'tiktok': 'tiktok',
  'tik tok': 'tiktok',
  'tik_tok': 'tiktok',
  'tt': 'tiktok',
  
  // Instagram variants
  'instagram': 'instagram',
  'instagram reels': 'instagram',
  'instagram_reels': 'instagram',
  'ig': 'instagram',
  'insta': 'instagram',
  
  // Facebook variants
  'facebook': 'facebook',
  'fb': 'facebook',
  
  // Twitter variants
  'twitter': 'twitter',
  'x': 'twitter'
};

// Platform display names (for metadata.platform)
const PLATFORM_DISPLAY_NAMES = {
  'youtube': 'YouTube',
  'tiktok': 'TikTok',
  'instagram': 'Instagram',
  'facebook': 'Facebook',
  'twitter': 'Twitter'
};

/**
 * Normalize platform name to lowercase standard
 */
export function normalizePlatform(platform) {
  if (!platform || typeof platform !== 'string') {
    return 'youtube'; // Default fallback
  }
  
  const normalized = platform.toLowerCase().trim();
  return PLATFORM_MAPPING[normalized] || 'youtube';
}

/**
 * Get display name for platform
 */
export function getPlatformDisplayName(platform) {
  const normalized = normalizePlatform(platform);
  return PLATFORM_DISPLAY_NAMES[normalized] || 'YouTube';
}

/**
 * Generate content_key from platform and content_id
 */
export function generateContentKey(platform, contentId) {
  const normalizedPlatform = normalizePlatform(platform);
  
  if (!contentId || contentId === 'unknown') {
    return `${normalizedPlatform}:unknown`;
  }
  
  return `${normalizedPlatform}:${contentId}`;
}

/**
 * Parse content_key back to components
 */
export function parseContentKey(contentKey) {
  if (!contentKey || typeof contentKey !== 'string') {
    return { platform: 'youtube', contentId: 'unknown' };
  }
  
  const parts = contentKey.split(':');
  if (parts.length !== 2) {
    return { platform: 'youtube', contentId: 'unknown' };
  }
  
  return {
    platform: normalizePlatform(parts[0]),
    contentId: parts[1]
  };
}

/**
 * Validate platform
 */
export function isValidPlatform(platform) {
  const normalized = normalizePlatform(platform);
  return Object.keys(PLATFORM_DISPLAY_NAMES).includes(normalized);
}

/**
 * Get all supported platforms
 */
export function getSupportedPlatforms() {
  return Object.keys(PLATFORM_DISPLAY_NAMES);
}