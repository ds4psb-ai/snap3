import { BigQuery } from '@google-cloud/bigquery';
import { Storage } from '@google-cloud/storage';
import { randomUUID } from 'crypto';
import { Readable } from 'stream';
import { createGzip } from 'zlib';

export interface ExportRequest {
  source: {
    type: 'bigquery' | 'storage';
    query?: string;
    dataset?: string;
    table?: string;
  };
  output: {
    format: 'json' | 'jsonl' | 'csv' | 'parquet';
    compression?: 'none' | 'gzip' | 'brotli';
    partitionBy?: string;
    maxFileSize?: string;
  };
  filters?: {
    dateRange?: {
      start: string;
      end: string;
    };
    platforms?: string[];
    minTrustScore?: number;
  };
  options?: {
    includeMetadata?: boolean;
    includeEvidence?: boolean;
    streaming?: boolean;
  };
}

export interface ExportJob {
  jobId: string;
  status: 'queued' | 'processing' | 'completed' | 'failed' | 'cancelled';
  progress?: {
    processedRows: number;
    totalRows: number;
    processedSize: string;
    percentage: number;
  };
  output?: {
    files: ExportFile[];
    totalSize: string;
    totalRows: number;
    format: string;
    compression?: string;
  };
  metadata?: {
    query: string;
    filters: any;
    startedAt: string;
    completedAt?: string;
    duration?: string;
  };
  error?: string;
}

export interface ExportFile {
  name: string;
  size: string;
  rows: number;
  url: string;
  checksums: {
    md5: string;
    sha256: string;
  };
}

export class ExportService {
  private bigquery: BigQuery;
  private storage: Storage;
  private jobs: Map<string, ExportJob>;
  private bucketName: string;

  constructor() {
    this.bigquery = new BigQuery({
      projectId: process.env.GCP_PROJECT_ID,
      keyFilename: process.env.GCS_KEY_FILE,
    });
    
    this.storage = new Storage({
      projectId: process.env.GCP_PROJECT_ID,
      keyFilename: process.env.GCS_KEY_FILE,
    });
    
    this.bucketName = process.env.GCS_EXPORT_BUCKET || 'snap3-exports';
    this.jobs = new Map();
  }

  /**
   * Create a new export job
   */
  async createExport(request: ExportRequest): Promise<ExportJob> {
    const jobId = `exp_${new Date().toISOString().split('T')[0].replace(/-/g, '')}_${randomUUID().slice(0, 6)}`;
    
    const job: ExportJob = {
      jobId,
      status: 'queued',
      metadata: {
        query: request.source.query || `SELECT * FROM ${request.source.table}`,
        filters: request.filters || {},
        startedAt: new Date().toISOString(),
      },
    };
    
    this.jobs.set(jobId, job);
    
    // Start processing asynchronously
    this.processExport(jobId, request).catch(error => {
      job.status = 'failed';
      job.error = error.message;
    });
    
    return job;
  }

  /**
   * Process an export job
   */
  private async processExport(jobId: string, request: ExportRequest): Promise<void> {
    const job = this.jobs.get(jobId);
    if (!job) return;
    
    try {
      job.status = 'processing';
      
      // Build the query
      const query = this.buildQuery(request);
      
      // Execute the query
      const [rows] = await this.bigquery.query(query);
      
      // Update progress
      job.progress = {
        processedRows: 0,
        totalRows: rows.length,
        processedSize: '0MB',
        percentage: 0,
      };
      
      // Export data based on format
      const files = await this.exportData(jobId, rows, request.output);
      
      // Calculate total size
      const totalSize = files.reduce((acc, file) => {
        const size = parseFloat(file.size);
        return acc + size;
      }, 0);
      
      // Update job with results
      job.status = 'completed';
      job.output = {
        files,
        totalSize: `${totalSize.toFixed(2)}MB`,
        totalRows: rows.length,
        format: request.output.format,
        compression: request.output.compression,
      };
      job.metadata!.completedAt = new Date().toISOString();
      
      // Calculate duration
      const start = new Date(job.metadata!.startedAt);
      const end = new Date(job.metadata!.completedAt);
      const duration = Math.round((end.getTime() - start.getTime()) / 1000);
      job.metadata!.duration = `${duration}s`;
      
      // Log to audit table
      await this.logExport(job);
      
    } catch (error: any) {
      job.status = 'failed';
      job.error = error.message;
      throw error;
    }
  }

  /**
   * Build BigQuery query from request
   */
  private buildQuery(request: ExportRequest): string {
    let query = request.source.query || `SELECT * FROM \`${request.source.dataset}.${request.source.table}\``;
    
    const conditions: string[] = [];
    
    // Add date range filter
    if (request.filters?.dateRange) {
      conditions.push(
        `DATE(created_at) BETWEEN '${request.filters.dateRange.start}' AND '${request.filters.dateRange.end}'`
      );
    }
    
    // Add platform filter
    if (request.filters?.platforms && request.filters.platforms.length > 0) {
      const platforms = request.filters.platforms.map(p => `'${p}'`).join(',');
      conditions.push(`platform IN (${platforms})`);
    }
    
    // Add trust score filter
    if (request.filters?.minTrustScore) {
      conditions.push(`trust_score >= ${request.filters.minTrustScore}`);
    }
    
    // Add WHERE clause if conditions exist
    if (conditions.length > 0 && !query.toLowerCase().includes('where')) {
      query += ` WHERE ${conditions.join(' AND ')}`;
    }
    
    return query;
  }

  /**
   * Export data to files
   */
  private async exportData(
    jobId: string,
    rows: any[],
    output: ExportRequest['output']
  ): Promise<ExportFile[]> {
    const files: ExportFile[] = [];
    const format = output.format;
    const compression = output.compression || 'none';
    
    // Convert rows to desired format
    let data: string;
    switch (format) {
      case 'json':
        data = JSON.stringify(rows, null, 2);
        break;
      case 'jsonl':
        data = rows.map(row => JSON.stringify(row)).join('\n');
        break;
      case 'csv':
        data = this.convertToCSV(rows);
        break;
      default:
        throw new Error(`Unsupported format: ${format}`);
    }
    
    // Apply compression if needed
    if (compression === 'gzip') {
      data = await this.compressData(data);
    }
    
    // Calculate file size
    const sizeInBytes = Buffer.byteLength(data);
    const sizeInMB = (sizeInBytes / (1024 * 1024)).toFixed(2);
    
    // Generate file name
    const timestamp = new Date().toISOString().split('T')[0].replace(/-/g, '');
    const extension = compression === 'gzip' ? `.${format}.gz` : `.${format}`;
    const fileName = `export_${timestamp}_${jobId}${extension}`;
    
    // Upload to storage
    const filePath = `exports/${jobId}/${fileName}`;
    const file = this.storage.bucket(this.bucketName).file(filePath);
    
    await file.save(data, {
      metadata: {
        contentType: this.getContentType(format),
        metadata: {
          jobId,
          format,
          compression,
          rows: rows.length.toString(),
        },
      },
    });
    
    // Get signed URL
    const [url] = await file.getSignedUrl({
      version: 'v4',
      action: 'read',
      expires: Date.now() + 24 * 60 * 60 * 1000, // 24 hours
    });
    
    // Calculate checksums
    const crypto = require('crypto');
    const md5 = crypto.createHash('md5').update(data).digest('hex');
    const sha256 = crypto.createHash('sha256').update(data).digest('hex');
    
    files.push({
      name: fileName,
      size: `${sizeInMB}MB`,
      rows: rows.length,
      url,
      checksums: {
        md5,
        sha256,
      },
    });
    
    return files;
  }

  /**
   * Convert rows to CSV format
   */
  private convertToCSV(rows: any[]): string {
    if (rows.length === 0) return '';
    
    const headers = Object.keys(rows[0]);
    const csvHeaders = headers.join(',');
    
    const csvRows = rows.map(row => {
      return headers.map(header => {
        const value = row[header];
        // Escape values containing commas or quotes
        if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value;
      }).join(',');
    });
    
    return [csvHeaders, ...csvRows].join('\n');
  }

  /**
   * Compress data using gzip
   */
  private async compressData(data: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const gzip = createGzip();
      const chunks: Buffer[] = [];
      
      gzip.on('data', chunk => chunks.push(chunk));
      gzip.on('end', () => resolve(Buffer.concat(chunks).toString('base64')));
      gzip.on('error', reject);
      
      gzip.write(data);
      gzip.end();
    });
  }

  /**
   * Get content type for format
   */
  private getContentType(format: string): string {
    switch (format) {
      case 'json':
        return 'application/json';
      case 'jsonl':
        return 'application/x-ndjson';
      case 'csv':
        return 'text/csv';
      case 'parquet':
        return 'application/octet-stream';
      default:
        return 'application/octet-stream';
    }
  }

  /**
   * Log export to audit table
   */
  private async logExport(job: ExportJob): Promise<void> {
    const dataset = this.bigquery.dataset('snap3_exports');
    const table = dataset.table('export_audit_log');
    
    const row = {
      export_id: job.jobId,
      export_type: 'manual',
      query_text: job.metadata?.query,
      row_count: job.output?.totalRows,
      file_size_bytes: this.parseSizeToBytes(job.output?.totalSize || '0MB'),
      format: job.output?.format,
      compression: job.output?.compression,
      started_at: job.metadata?.startedAt,
      completed_at: job.metadata?.completedAt,
      duration_seconds: parseInt(job.metadata?.duration?.replace('s', '') || '0'),
      status: job.status,
      error_message: job.error,
      output_files: job.output?.files.map(f => ({
        filename: f.name,
        size_bytes: this.parseSizeToBytes(f.size),
        row_count: f.rows,
        checksum: f.checksums.sha256,
      })),
      metadata: JSON.stringify(job.metadata),
    };
    
    await table.insert([row]).catch(error => {
      console.error('Failed to log export to audit table:', error);
    });
  }

  /**
   * Parse size string to bytes
   */
  private parseSizeToBytes(size: string): number {
    const match = size.match(/^([\d.]+)([A-Z]+)$/);
    if (!match) return 0;
    
    const value = parseFloat(match[1]);
    const unit = match[2];
    
    switch (unit) {
      case 'KB':
        return value * 1024;
      case 'MB':
        return value * 1024 * 1024;
      case 'GB':
        return value * 1024 * 1024 * 1024;
      default:
        return value;
    }
  }

  /**
   * Get job status
   */
  getJob(jobId: string): ExportJob | undefined {
    return this.jobs.get(jobId);
  }

  /**
   * Cancel a job
   */
  cancelJob(jobId: string): boolean {
    const job = this.jobs.get(jobId);
    if (!job || job.status === 'completed' || job.status === 'failed') {
      return false;
    }
    
    job.status = 'cancelled';
    return true;
  }

  /**
   * Get export templates
   */
  getTemplates() {
    return [
      {
        id: 'viral_tiktok',
        name: 'Viral TikTok Content',
        description: 'Export high-performing TikTok videos',
        query: "SELECT * FROM vdp_metadata WHERE platform = 'TikTok' AND view_count > 1000000",
        defaultFormat: 'jsonl',
        estimatedSize: '100MB',
      },
      {
        id: 'ai_generated',
        name: 'AI Generated Content',
        description: 'Export all AI-generated videos',
        query: "SELECT * FROM vdp_metadata WHERE origin = 'AI-Generated'",
        defaultFormat: 'json',
        estimatedSize: '50MB',
      },
      {
        id: 'recent_trending',
        name: 'Recent Trending',
        description: 'Export trending content from the last 7 days',
        query: "SELECT * FROM trending_content WHERE DATE(created_at) >= DATE_SUB(CURRENT_DATE(), INTERVAL 7 DAY)",
        defaultFormat: 'jsonl',
        estimatedSize: '200MB',
      },
      {
        id: 'high_trust',
        name: 'High Trust Content',
        description: 'Export content with trust score above 0.9',
        query: "SELECT * FROM vdp_metadata WHERE trust_score >= 0.9",
        defaultFormat: 'csv',
        estimatedSize: '75MB',
      },
    ];
  }
}