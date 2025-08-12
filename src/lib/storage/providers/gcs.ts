import { Storage } from '@google-cloud/storage';
import { StorageProvider } from '../provider';

/**
 * Google Cloud Storage Provider Implementation
 */
export class GCSProvider implements StorageProvider {
  private storage: Storage;
  private bucketName: string;

  constructor(bucketName: string = 'snap3-gold') {
    this.storage = new Storage({
      projectId: process.env.GCP_PROJECT_ID,
      keyFilename: process.env.GCS_KEY_FILE,
    });
    this.bucketName = bucketName;
  }

  async getSignedReadUrl(path: string, expiresIn: number = 3600): Promise<string | null> {
    try {
      const [url] = await this.storage
        .bucket(this.bucketName)
        .file(path)
        .getSignedUrl({
          version: 'v4',
          action: 'read',
          expires: Date.now() + expiresIn * 1000,
        });
      return url;
    } catch (error) {
      console.error('GCS getSignedReadUrl error:', error);
      return null;
    }
  }

  async getSignedWriteUrl(path: string, expiresIn: number = 3600): Promise<string | null> {
    try {
      const [url] = await this.storage
        .bucket(this.bucketName)
        .file(path)
        .getSignedUrl({
          version: 'v4',
          action: 'write',
          expires: Date.now() + expiresIn * 1000,
        });
      return url;
    } catch (error) {
      console.error('GCS getSignedWriteUrl error:', error);
      return null;
    }
  }

  async deleteFile(path: string): Promise<boolean> {
    try {
      await this.storage.bucket(this.bucketName).file(path).delete();
      return true;
    } catch (error) {
      console.error('GCS deleteFile error:', error);
      return false;
    }
  }

  async listFiles(prefix: string): Promise<string[]> {
    try {
      const [files] = await this.storage.bucket(this.bucketName).getFiles({
        prefix,
      });
      return files.map(file => file.name);
    } catch (error) {
      console.error('GCS listFiles error:', error);
      return [];
    }
  }

  /**
   * List partitions by date pattern (dt=YYYY-MM-DD)
   */
  async listPartitions(): Promise<string[]> {
    try {
      const [files] = await this.storage.bucket(this.bucketName).getFiles({
        delimiter: '/',
        autoPaginate: false,
      });
      
      // Extract unique partition dates from file paths
      const partitions = new Set<string>();
      const partitionRegex = /dt=(\d{4}-\d{2}-\d{2})/;
      
      for (const file of files) {
        const match = file.name.match(partitionRegex);
        if (match) {
          partitions.add(match[1]);
        }
      }
      
      return Array.from(partitions).sort((a, b) => b.localeCompare(a)); // Sort descending
    } catch (error) {
      console.error('GCS listPartitions error:', error);
      return [];
    }
  }

  /**
   * Stream JSONL data from a partition
   */
  async *streamPartition(dt: string): AsyncGenerator<string, void, unknown> {
    try {
      const prefix = `dt=${dt}/`;
      const [files] = await this.storage.bucket(this.bucketName).getFiles({
        prefix,
      });

      for (const file of files) {
        if (file.name.endsWith('.jsonl')) {
          const stream = file.createReadStream();
          let buffer = '';
          
          for await (const chunk of stream) {
            buffer += chunk.toString();
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';
            
            for (const line of lines) {
              if (line.trim()) {
                yield line;
              }
            }
          }
          
          if (buffer.trim()) {
            yield buffer;
          }
        }
      }
    } catch (error) {
      console.error('GCS streamPartition error:', error);
      throw error;
    }
  }
}