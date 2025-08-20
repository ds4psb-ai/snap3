/**
 * GCS Path Validation Utility
 * Validates GCS paths for standard VDP pipeline compliance
 */

/**
 * Check if GCS URI is valid and follows gs:// format
 */
export function isValidGcsPath(gcsUri) {
  if (!gcsUri || typeof gcsUri !== 'string') {
    return false;
  }
  
  // Basic GCS URI format validation
  const gcsPattern = /^gs:\/\/[a-z0-9][a-z0-9\-_\.]*[a-z0-9]\/.*$/;
  return gcsPattern.test(gcsUri);
}

/**
 * Check if path follows VDP standard format
 * Standard: gs://{bucket}/raw/vdp/{platform}/{content_id}.NEW.universal.json
 */
export function isStandardVdpPath(gcsUri, bucket, platform, contentId) {
  if (!isValidGcsPath(gcsUri)) {
    return false;
  }
  
  const expectedPath = `gs://${bucket}/raw/vdp/${platform.toLowerCase()}/${contentId}.NEW.universal.json`;
  return gcsUri === expectedPath;
}

/**
 * Generate standard VDP output path
 */
export function generateStandardVdpPath(bucket, platform, contentId) {
  const normalizedPlatform = platform.toLowerCase();
  return `gs://${bucket}/raw/vdp/${normalizedPlatform}/${contentId}.NEW.universal.json`;
}

/**
 * Extract components from VDP path
 */
export function parseVdpPath(gcsUri) {
  if (!isValidGcsPath(gcsUri)) {
    return null;
  }
  
  const match = gcsUri.match(/^gs:\/\/([^\/]+)\/raw\/vdp\/([^\/]+)\/([^\/]+)\.NEW\.universal\.json$/);
  if (!match) {
    return null;
  }
  
  return {
    bucket: match[1],
    platform: match[2],
    contentId: match[3]
  };
}

/**
 * Validate platform name
 */
export function isValidPlatform(platform) {
  const validPlatforms = ['youtube', 'tiktok', 'instagram', 'facebook', 'twitter'];
  return validPlatforms.includes(platform.toLowerCase());
}