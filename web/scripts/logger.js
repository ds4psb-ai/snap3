/**
 * Production-Safe Logger for VDP Frontend
 * Controls console output based on environment and log levels
 */

class Logger {
    constructor() {
        // Check if running in development mode
        this.isDevelopment = window.location.hostname === 'localhost' || 
                           window.location.hostname === '127.0.0.1' ||
                           window.location.hostname.includes('dev') ||
                           window.location.search.includes('debug=true');
        
        // Log levels: ERROR(0), WARN(1), INFO(2), DEBUG(3)
        this.logLevel = this.isDevelopment ? 3 : 1; // DEBUG in dev, WARN+ in prod
        
        // Sensitive fields to redact in logs
        this.sensitiveFields = [
            'password', 'token', 'key', 'secret', 'auth', 
            'credential', 'session', 'cookie'
        ];
    }

    // Redact sensitive information from objects
    redactSensitive(obj) {
        if (typeof obj !== 'object' || obj === null) return obj;
        
        const redacted = { ...obj };
        
        Object.keys(redacted).forEach(key => {
            const lowerKey = key.toLowerCase();
            if (this.sensitiveFields.some(field => lowerKey.includes(field))) {
                redacted[key] = '[REDACTED]';
            } else if (typeof redacted[key] === 'object') {
                redacted[key] = this.redactSensitive(redacted[key]);
            }
        });
        
        return redacted;
    }

    // Format log message with timestamp and context
    formatMessage(level, message, data) {
        const timestamp = new Date().toISOString().slice(11, 23); // HH:mm:ss.sss
        const prefix = `[${timestamp}] [${level}] VDP-UI:`;
        
        if (data) {
            return [prefix, message, this.redactSensitive(data)];
        }
        return [prefix, message];
    }

    // Log levels
    error(message, data) {
        if (this.logLevel >= 0) {
            console.error(...this.formatMessage('ERROR', message, data));
        }
    }

    warn(message, data) {
        if (this.logLevel >= 1) {
            console.warn(...this.formatMessage('WARN', message, data));
        }
    }

    info(message, data) {
        if (this.logLevel >= 2) {
            console.info(...this.formatMessage('INFO', message, data));
        }
    }

    debug(message, data) {
        if (this.logLevel >= 3) {
            console.log(...this.formatMessage('DEBUG', message, data));
        }
    }

    success(message, data) {
        if (this.logLevel >= 2) {
            console.log(...this.formatMessage('SUCCESS', message, data));
        }
    }

    // Specialized logging methods
    apiRequest(endpoint, method = 'POST') {
        this.debug(`🚀 API Request: ${method} ${endpoint}`);
    }

    apiResponse(status, success = true) {
        if (success) {
            this.debug(`📡 API Response: ${status} OK`);
        } else {
            this.warn(`📡 API Response: ${status} Error`);
        }
    }

    urlNormalization(originalUrl, result) {
        this.debug('📝 URL Normalization:', {
            platform: result.platform,
            content_id: result.content_id,
            // Don't log full URLs in production
            url_provided: !!originalUrl
        });
    }

    formSubmission(platform, hasFiles = false) {
        this.info(`📝 Form Submission: ${platform}${hasFiles ? ' (with files)' : ''}`);
    }

    jobProgress(jobId, progress, step) {
        this.debug(`⏳ Job Progress: ${jobId.substring(0, 8)}... ${progress}% - ${step}`);
    }

    vdpProcessing(action, status) {
        this.info(`🎬 VDP ${action}: ${status}`);
    }

    userAction(action, detail) {
        this.debug(`👤 User Action: ${action}`, detail ? { detail } : undefined);
    }

    // Performance tracking
    performance(operation, startTime) {
        const duration = Date.now() - startTime;
        this.debug(`⚡ Performance: ${operation} took ${duration}ms`);
    }

    // Production-safe error reporting
    reportError(error, context) {
        const errorInfo = {
            message: error.message,
            type: error.constructor.name,
            context: context,
            timestamp: new Date().toISOString(),
            userAgent: navigator.userAgent.substring(0, 100), // Truncated
            url: window.location.pathname // Don't include query params
        };

        this.error('Application Error:', errorInfo);
        
        // In production, could send to error tracking service
        if (!this.isDevelopment) {
            // Example: Send to error tracking
            // this.sendToErrorService(errorInfo);
        }
    }

    // Environment info (for debugging)
    logEnvironment() {
        this.debug('Environment Info:', {
            hostname: window.location.hostname,
            isDevelopment: this.isDevelopment,
            logLevel: this.logLevel,
            userAgent: navigator.userAgent.substring(0, 50) + '...'
        });
    }
}

// Create global logger instance
window.logger = new Logger();

// Log environment on load (development only)
if (window.logger.isDevelopment) {
    window.logger.logEnvironment();
}

// Export for modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Logger;
}