#!/usr/bin/env node
/**
 * Logging Helper for VDP Pipeline Scripts
 * 
 * Purpose: Bridge bash scripts with Pino structured logging
 * Usage: node scripts/logging-helper.js [level] [message] [context]
 */

const path = require('path');
const crypto = require('crypto');

// Import logging from libs (using relative path)
const { logger } = require('../libs/logging');

function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.error('Usage: node logging-helper.js [level] [message] [context]');
    process.exit(1);
  }
  
  const level = args[0] || 'info';
  const message = args[1] || '';
  const contextArg = args[2];
  
  // Generate correlation ID for this operation
  const correlationId = process.env.CORRELATION_ID || crypto.randomUUID();
  
  // Parse context if provided (expect JSON string)
  let context = {};
  if (contextArg) {
    try {
      context = JSON.parse(contextArg);
    } catch (e) {
      context = { raw_context: contextArg };
    }
  }
  
  // Add standard context fields
  const logContext = {
    correlationId,
    script: process.env.SCRIPT_NAME || 'unknown',
    operation: process.env.OPERATION || 'unknown',
    ...context
  };
  
  // Log with Pino
  switch (level.toLowerCase()) {
    case 'error':
      logger.error(logContext, message);
      break;
    case 'warn':
    case 'warning':
      logger.warn(logContext, message);
      break;
    case 'info':
      logger.info(logContext, message);
      break;
    case 'debug':
      logger.debug(logContext, message);
      break;
    case 'trace':
      logger.trace(logContext, message);
      break;
    default:
      logger.info(logContext, message);
  }
}

if (require.main === module) {
  main();
}

module.exports = { main };