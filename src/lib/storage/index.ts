// Import Supabase provider
import { SupabaseStorageProvider } from './supabase';

// Storage Interface for Snap3 Turbo
export interface StorageProvider {
  upload(file: File, path: string): Promise<string>;
  download(path: string): Promise<Blob>;
  delete(path: string): Promise<void>;
  getSignedUrl(path: string, expiresIn?: number): Promise<string>;
}

export interface StorageConfig {
  bucket: string;
  region?: string;
  endpoint?: string;
}

// Storage factory
export function createStorageProvider(config: StorageConfig): StorageProvider {
  // TODO: Implement storage provider selection
  // For now, return Supabase implementation
  return new SupabaseStorageProvider(config);
}
