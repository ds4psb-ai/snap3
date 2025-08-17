/**
 * Enhanced Logging Utility for T2-Extract VDP Server
 * Structured logging with request correlation and performance metrics
 */

class Logger {
  constructor() {
    this.enableStructuredLogging = process.env.NODE_ENV === 'production';
    this.logLevel = process.env.LOG_LEVEL || 'info';
    this.component = 'T2-VDP-Extract';
  }

  /**
   * Create structured log entry with correlation ID and metadata
   */
  createLogEntry(level, message, metadata = {}, correlationId = null) {
    const timestamp = new Date().toISOString();
    
    if (this.enableStructuredLogging) {
      return JSON.stringify({
        timestamp,
        level: level.toUpperCase(),
        component: this.component,
        correlationId,
        message,
        ...metadata
      });
    } else {
      const prefix = correlationId ? `[${correlationId}]` : '';
      return `${timestamp} [${level.toUpperCase()}] ${prefix} ${message}${metadata ? ' ' + JSON.stringify(metadata) : ''}`;
    }
  }

  /**
   * Log with correlation ID for request tracking
   */
  logWithCorrelation(level, message, metadata = {}, correlationId = null) {
    const logEntry = this.createLogEntry(level, message, metadata, correlationId);
    console.log(logEntry);
  }

  // Standard logging methods
  info(message, metadata = {}, correlationId = null) {
    this.logWithCorrelation('info', message, metadata, correlationId);
  }

  error(message, metadata = {}, correlationId = null) {
    this.logWithCorrelation('error', message, metadata, correlationId);
  }

  warn(message, metadata = {}, correlationId = null) {
    this.logWithCorrelation('warn', message, metadata, correlationId);
  }

  debug(message, metadata = {}, correlationId = null) {
    if (this.logLevel === 'debug') {
      this.logWithCorrelation('debug', message, metadata, correlationId);
    }
  }

  // VDP-specific logging methods
  vdpStart(contentId, platform, correlationId) {
    this.info('VDP generation started', {
      content_id: contentId,
      platform: platform,
      stage: 'start'
    }, correlationId);
  }

  vdpComplete(contentId, duration, hookStrength, correlationId) {
    this.info('VDP generation completed', {
      content_id: contentId,
      duration_ms: duration,
      hook_strength: hookStrength,
      stage: 'complete'
    }, correlationId);
  }

  vdpError(contentId, error, stage, correlationId) {
    this.error('VDP generation failed', {
      content_id: contentId,
      error_message: error.message,
      error_stack: error.stack,
      stage: stage
    }, correlationId);
  }

  evidencePackMerge(contentId, hasAudio, hasProduct, correlationId) {
    this.info('Evidence Pack merged', {
      content_id: contentId,
      audio_evidence: hasAudio,
      product_evidence: hasProduct,
      stage: 'evidence_merge'
    }, correlationId);
  }

  contentIdHotfix(contentId, platform, hasCanonicalUrl, correlationId) {
    this.info('Content ID hotfix applied', {
      content_id: contentId,
      platform: platform,
      has_canonical_url: hasCanonicalUrl,
      stage: 'hotfix'
    }, correlationId);
  }

  performanceMetrics(contentId, metrics, correlationId) {
    this.info('Performance metrics', {
      content_id: contentId,
      ...metrics,
      stage: 'performance'
    }, correlationId);
  }

  // Request correlation ID generator
  generateCorrelationId() {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// Singleton instance
const logger = new Logger();

export default logger;
export { Logger };