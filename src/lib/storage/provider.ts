/**
 * Storage Provider Interface
 * Abstract storage operations for different providers (Supabase, S3, GCS)
 */

export interface StorageProvider {
  getSignedReadUrl(path: string, expiresIn?: number): Promise<string | null>;
  getSignedWriteUrl(path: string, expiresIn?: number): Promise<string | null>;
  deleteFile(path: string): Promise<boolean>;
  listFiles(prefix: string): Promise<string[]>;
}

/**
 * Get signed read URL for a file
 * @param path Storage path
 * @param expiresIn Expiration in seconds (default: 3600)
 */
export async function getSignedReadUrl(
  path: string,
  expiresIn: number = 3600
): Promise<string | null> {
  try {
    // Mock implementation - replace with actual provider
    // In production, this would call Supabase Storage or S3
    console.log(`Getting signed URL for: ${path}, expires in ${expiresIn}s`);
    
    // Return mock URL for testing
    if (path.includes('export')) {
      return `https://storage.snap3.com/signed/${path}?expires=${Date.now() + expiresIn * 1000}`;
    }
    
    return null;
  } catch (error) {
    console.error('Failed to get signed read URL:', error);
    return null;
  }
}

/**
 * Get signed write URL for uploading
 */
export async function getSignedWriteUrl(
  path: string,
  expiresIn: number = 3600
): Promise<string | null> {
  try {
    // Mock implementation
    return `https://storage.snap3.com/upload/${path}?expires=${Date.now() + expiresIn * 1000}`;
  } catch (error) {
    console.error('Failed to get signed write URL:', error);
    return null;
  }
}