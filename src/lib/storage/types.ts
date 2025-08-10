/**
 * Storage Provider Abstraction v2
 * Vendor-neutral interface for storage operations
 * Supports resumable uploads and signed reads
 */

export interface StorageProvider {
  /**
   * Create a signed URL for client-side upload
   * @param key - Object key/path in storage
   * @param contentType - MIME type of the content
   * @param options - Upload configuration
   * @returns Signed upload URL and metadata
   */
  createSignedUploadUrl(
    key: string,
    contentType: string,
    options?: {
      expiresIn?: number; // seconds, default 3600
      maxSizeBytes?: number;
      resumable?: boolean; // Enable resumable/multipart upload
    }
  ): Promise<{
    url: string;
    uploadId?: string; // For resumable uploads
    fields?: Record<string, string>; // For multipart form data
    headers?: Record<string, string>; // Required headers
    expiresAt: Date;
  }>;

  /**
   * Get a signed URL for reading/downloading
   * @param key - Object key/path in storage
   * @param options - Read configuration
   * @returns Signed read URL
   */
  getSignedReadUrl(
    key: string,
    options?: {
      ttlSec?: number; // seconds, default 3600
      responseDisposition?: 'attachment' | 'inline'; // Control browser behavior
      transform?: {
        width?: number;
        height?: number;
        quality?: number;
      };
    }
  ): Promise<{
    url: string;
    expiresAt: Date;
  }>;

  /**
   * Delete an object from storage
   * @param key - Object key/path to delete
   */
  deleteObject(key: string): Promise<void>;

  /**
   * Check if object exists
   * @param key - Object key/path to check
   */
  objectExists(key: string): Promise<boolean>;

  /**
   * Get object metadata without downloading content
   * @param key - Object key/path to check
   * @returns Object metadata if exists
   */
  headObject(key: string): Promise<{
    exists: boolean;
    size?: number;
    contentType?: string;
    lastModified?: Date;
  }>;
}

/**
 * Resumable upload session for multipart uploads
 */
export interface ResumableUploadSession {
  uploadId: string;
  key: string;
  parts: Array<{
    partNumber: number;
    url: string;
    expiresAt: Date;
  }>;
}

/**
 * Extended storage provider interface for resumable uploads
 */
export interface ResumableStorageProvider extends StorageProvider {
  /**
   * Initialize a resumable upload session
   * @param key - Object key/path in storage
   * @param contentType - MIME type of the content
   * @param options - Upload configuration
   * @returns Upload session with part URLs
   */
  initResumableUpload(
    key: string,
    contentType: string,
    options?: {
      partCount?: number; // Number of parts, default based on file size
      ttlSec?: number; // TTL for part URLs
    }
  ): Promise<ResumableUploadSession>;

  /**
   * Complete a resumable upload
   * @param uploadId - Upload session ID
   * @param parts - Completed part ETags
   */
  completeResumableUpload(
    uploadId: string,
    parts: Array<{
      partNumber: number;
      etag: string;
    }>
  ): Promise<void>;

  /**
   * Abort a resumable upload
   * @param uploadId - Upload session ID
   */
  abortResumableUpload(uploadId: string): Promise<void>;
}

export interface StorageConfig {
  provider: 'supabase' | 's3' | 'gcs' | 'local';
  bucket?: string;
  region?: string;
  [key: string]: any; // Provider-specific config
}