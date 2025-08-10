/**
 * Storage Provider Factory
 * Central access point for storage operations
 */

import { StorageProvider, StorageConfig } from './types';
import { SupabaseStorageProvider } from './providers/supabase';

let cachedProvider: StorageProvider | null = null;

export function getStorageProvider(): StorageProvider {
  if (cachedProvider) return cachedProvider;

  const config: StorageConfig = {
    provider: (process.env.STORAGE_PROVIDER as any) || 'supabase',
    bucket: process.env.STORAGE_BUCKET || 'previews',
  };

  switch (config.provider) {
    case 'supabase':
      cachedProvider = new SupabaseStorageProvider({
        url: process.env.NEXT_PUBLIC_SUPABASE_URL!,
        serviceKey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
        bucket: config.bucket!,
      });
      break;
    // Future providers can be added here
    // case 's3':
    //   cachedProvider = new S3StorageProvider(config);
    //   break;
    // case 'gcs':
    //   cachedProvider = new GCSStorageProvider(config);
    //   break;
    default:
      throw new Error(`Unsupported storage provider: ${config.provider}`);
  }

  return cachedProvider;
}

// For testing
export function resetStorageProvider() {
  cachedProvider = null;
}

// Re-export types for convenience
export type { StorageProvider, StorageConfig } from './types';
