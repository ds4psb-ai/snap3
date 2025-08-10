import { createClient } from '@supabase/supabase-js';
import type { StorageProvider, StorageConfig } from './index';

export class SupabaseStorageProvider implements StorageProvider {
  private client: any;
  private bucket: string;

  constructor(config: StorageConfig) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Supabase configuration missing');
    }

    this.client = createClient(supabaseUrl, supabaseKey);
    this.bucket = config.bucket;
  }

  async upload(file: File, path: string): Promise<string> {
    const { data, error } = await this.client.storage
      .from(this.bucket)
      .upload(path, file);

    if (error) {
      throw new Error(`Upload failed: ${error.message}`);
    }

    return data.path;
  }

  async download(path: string): Promise<Blob> {
    const { data, error } = await this.client.storage
      .from(this.bucket)
      .download(path);

    if (error) {
      throw new Error(`Download failed: ${error.message}`);
    }

    return data;
  }

  async delete(path: string): Promise<void> {
    const { error } = await this.client.storage
      .from(this.bucket)
      .remove([path]);

    if (error) {
      throw new Error(`Delete failed: ${error.message}`);
    }
  }

  async getSignedUrl(path: string, expiresIn: number = 3600): Promise<string> {
    const { data, error } = await this.client.storage
      .from(this.bucket)
      .createSignedUrl(path, expiresIn);

    if (error) {
      throw new Error(`Signed URL generation failed: ${error.message}`);
    }

    return data.signedUrl;
  }
}




