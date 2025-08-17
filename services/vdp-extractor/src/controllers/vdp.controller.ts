import { Request, Response } from 'express';
import { GitHubVDPExtractorService, type GitHubVDPResponse } from '../services/github-vdp-extractor.service';
import {
  validateExtractVDPRequest,
  validateBatchExtractRequest,
  validateQueryParams,
  validateFileUpload,
} from '../utils/validation';
import { APIResponse, HealthStatus, ServiceMetrics } from '../types';
import winston from 'winston';

export class VDPController {
  private vdpService: GitHubVDPExtractorService;
  private logger: winston.Logger;
  private requestCount = 0;
  private successCount = 0;
  private errorCount = 0;
  private startTime = Date.now();

  constructor(vdpService: GitHubVDPExtractorService, logger: winston.Logger) {
    this.vdpService = vdpService;
    this.logger = logger;
  }

  /**
   * Extract VDP from URL
   */
  extractFromUrl = async (req: Request, res: Response) => {
    const startTime = Date.now();
    this.requestCount++;

    try {
      this.logger.info('VDP extraction request received', {
        url: req.body.url,
        options: req.body.options,
        ip: req.ip,
      });

      // Validate request
      const request = validateExtractVDPRequest(req.body);

      // Extract VDP
      const result = await this.vdpService.extractVDP(request);

      if (result.success) {
        this.successCount++;
      } else {
        this.errorCount++;
      }

      const response: APIResponse = {
        success: result.success,
        data: result.data,
        error: result.error ? {
          code: 'EXTRACTION_FAILED',
          message: result.error,
        } : undefined,
        meta: result.meta || {
          processingTime: Date.now() - startTime,
          version: '1.0.0',
          timestamp: new Date().toISOString(),
        },
      };

      res.status(result.success ? 200 : 400).json(response);

    } catch (error: any) {
      this.errorCount++;
      this.logger.error('VDP extraction failed:', error);

      const response: APIResponse = {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: error.message || 'Unknown error occurred',
          details: error.details,
        },
        meta: {
          processingTime: Date.now() - startTime,
          version: '1.0.0',
          timestamp: new Date().toISOString(),
        },
      };

      res.status(400).json(response);
    }
  };

  /**
   * Extract VDP from query parameters (GET endpoint)
   */
  extractFromQuery = async (req: Request, res: Response) => {
    const startTime = Date.now();
    this.requestCount++;

    try {
      const { url } = req.query;

      if (!url || typeof url !== 'string') {
        throw new Error('URL parameter is required');
      }

      // Parse options from query parameters
      const options = validateQueryParams(req.query);

      this.logger.info('VDP extraction request received (GET)', {
        url,
        options,
        ip: req.ip,
      });

      // Validate and extract VDP
      const request = validateExtractVDPRequest({ url, options });
      const result = await this.vdpService.extractVDP(request);

      if (result.success) {
        this.successCount++;
      } else {
        this.errorCount++;
      }

      const response: APIResponse = {
        success: result.success,
        data: result.data,
        error: result.error ? {
          code: 'EXTRACTION_FAILED',
          message: result.error,
        } : undefined,
        meta: result.meta || {
          processingTime: Date.now() - startTime,
          version: '1.0.0',
          timestamp: new Date().toISOString(),
        },
      };

      res.status(result.success ? 200 : 400).json(response);

    } catch (error: any) {
      this.errorCount++;
      this.logger.error('VDP extraction failed:', error);

      const response: APIResponse = {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: error.message || 'Unknown error occurred',
        },
        meta: {
          processingTime: Date.now() - startTime,
          version: '1.0.0',
          timestamp: new Date().toISOString(),
        },
      };

      res.status(400).json(response);
    }
  };

  /**
   * Batch extract VDPs from multiple URLs
   */
  extractBatch = async (req: Request, res: Response) => {
    const startTime = Date.now();
    this.requestCount++;

    try {
      this.logger.info('Batch VDP extraction request received', {
        urlCount: req.body.urls?.length,
        options: req.body.options,
        ip: req.ip,
      });

      // Validate request
      const request = validateBatchExtractRequest(req.body);

      // Extract VDPs
      const result = await this.vdpService.extractVDPBatch(request);

      // Count successes and failures
      const successCount = result.results.filter(r => r.result.success).length;
      const failureCount = result.results.length - successCount;

      this.successCount += successCount;
      this.errorCount += failureCount;

      const response: APIResponse = {
        success: result.success,
        data: result,
        meta: {
          processingTime: Date.now() - startTime,
          version: '1.0.0',
          timestamp: new Date().toISOString(),
        },
      };

      res.status(200).json(response);

    } catch (error: any) {
      this.errorCount++;
      this.logger.error('Batch VDP extraction failed:', error);

      const response: APIResponse = {
        success: false,
        error: {
          code: 'BATCH_EXTRACTION_FAILED',
          message: error.message || 'Unknown error occurred',
        },
        meta: {
          processingTime: Date.now() - startTime,
          version: '1.0.0',
          timestamp: new Date().toISOString(),
        },
      };

      res.status(400).json(response);
    }
  };

  /**
   * Extract VDP from uploaded video file
   */
  extractFromFile = async (req: Request, res: Response) => {
    const startTime = Date.now();
    this.requestCount++;

    try {
      this.logger.info('File VDP extraction request received', {
        filename: req.file?.originalname,
        size: req.file?.size,
        ip: req.ip,
      });

      if (!req.file) {
        throw new Error('No file uploaded');
      }

      // Validate file
      validateFileUpload(req.file);

      // For now, return not implemented
      // TODO: Implement file-based VDP extraction with video processing
      const response: APIResponse = {
        success: false,
        error: {
          code: 'NOT_IMPLEMENTED',
          message: 'File-based VDP extraction is not yet implemented',
        },
        meta: {
          processingTime: Date.now() - startTime,
          version: '1.0.0',
          timestamp: new Date().toISOString(),
        },
      };

      res.status(501).json(response);

    } catch (error: any) {
      this.errorCount++;
      this.logger.error('File VDP extraction failed:', error);

      const response: APIResponse = {
        success: false,
        error: {
          code: 'FILE_EXTRACTION_FAILED',
          message: error.message || 'Unknown error occurred',
        },
        meta: {
          processingTime: Date.now() - startTime,
          version: '1.0.0',
          timestamp: new Date().toISOString(),
        },
      };

      res.status(400).json(response);
    }
  };

  /**
   * Health check endpoint
   */
  healthCheck = async (req: Request, res: Response) => {
    try {
      const healthStatus = await this.vdpService.healthCheck();

      const response: HealthStatus = {
        status: healthStatus.status,
        services: healthStatus.services,
        uptime: Date.now() - this.startTime,
        version: '1.0.0',
        timestamp: new Date().toISOString(),
      };

      const statusCode = healthStatus.status === 'healthy' ? 200 : 
                        healthStatus.status === 'degraded' ? 200 : 503;

      res.status(statusCode).json(response);

    } catch (error: any) {
      this.logger.error('Health check failed:', error);

      const response: HealthStatus = {
        status: 'unhealthy',
        services: {
          gemini: 'down',
          youtube: 'down',
        },
        uptime: Date.now() - this.startTime,
        version: '1.0.0',
        timestamp: new Date().toISOString(),
      };

      res.status(503).json(response);
    }
  };

  /**
   * Service metrics endpoint
   */
  getMetrics = async (req: Request, res: Response) => {
    try {
      const uptime = Date.now() - this.startTime;
      const averageResponseTime = uptime / Math.max(this.requestCount, 1);

      const metrics: ServiceMetrics = {
        requests: {
          total: this.requestCount,
          successful: this.successCount,
          failed: this.errorCount,
          averageResponseTime: Math.round(averageResponseTime),
        },
        processing: {
          queueSize: 0, // TODO: Implement queue monitoring
          activeJobs: 0, // TODO: Implement active job tracking
          averageProcessingTime: Math.round(averageResponseTime),
        },
        apis: {
          gemini: {
            calls: 0, // TODO: Track API calls
            errors: 0,
            averageLatency: 0,
          },
          youtube: {
            calls: 0, // TODO: Track API calls
            errors: 0,
            averageLatency: 0,
          },
        },
        timestamp: new Date().toISOString(),
      };

      res.json(metrics);

    } catch (error: any) {
      this.logger.error('Failed to get metrics:', error);
      res.status(500).json({ error: 'Failed to get metrics' });
    }
  };

  /**
   * Service info endpoint
   */
  getServiceInfo = async (req: Request, res: Response) => {
    try {
      const serviceInfo = this.vdpService.getServiceInfo();
      res.json(serviceInfo);
    } catch (error: any) {
      this.logger.error('Failed to get service info:', error);
      res.status(500).json({ error: 'Failed to get service info' });
    }
  };
}