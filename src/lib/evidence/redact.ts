/**
 * Evidence Redaction System
 * 
 * Provides secure masking of sensitive data using JSON Pointer paths.
 * All operations are immutable to prevent accidental data exposure.
 */

export interface RedactRule {
  /** JSON Pointer path (RFC 6901) */
  path: string;
  /** Redaction strategy: 'mask' (***), 'remove' (delete), 'pattern' (regex replace) */
  strategy: 'mask' | 'remove' | 'pattern';
  /** Pattern for regex replacement (when strategy = 'pattern') */
  pattern?: string;
  /** Replacement value for pattern matching */
  replacement?: string;
  /** Description for audit purposes */
  description?: string;
}

export interface RedactionResult<T> {
  /** Redacted data (immutable copy) */
  data: T;
  /** Number of fields that were redacted */
  redactedCount: number;
  /** Paths that were redacted */
  redactedPaths: string[];
  /** Original data size (bytes) */
  originalSize: number;
  /** Redacted data size (bytes) */
  redactedSize: number;
}

/**
 * JSON Pointer implementation following RFC 6901
 */
export class JSONPointer {
  static parse(pointer: string): string[] {
    if (pointer === '') return [];
    if (!pointer.startsWith('/')) {
      throw new Error(`Invalid JSON Pointer: must start with '/' (got: ${pointer})`);
    }
    
    return pointer.slice(1).split('/').map(token => {
      return token
        .replace(/~1/g, '/')
        .replace(/~0/g, '~');
    });
  }

  static get(obj: any, pointer: string): any {
    const tokens = JSONPointer.parse(pointer);
    let current = obj;
    
    for (const token of tokens) {
      if (current === null || current === undefined) {
        return undefined;
      }
      if (Array.isArray(current)) {
        const index = parseInt(token, 10);
        if (isNaN(index) || index < 0 || index >= current.length) {
          return undefined;
        }
        current = current[index];
      } else if (typeof current === 'object') {
        current = current[token];
      } else {
        return undefined;
      }
    }
    
    return current;
  }

  static set(obj: any, pointer: string, value: any): any {
    if (pointer === '') {
      return value;
    }
    
    const tokens = JSONPointer.parse(pointer);
    const result = JSONPointer.deepClone(obj);
    let current = result;
    
    for (let i = 0; i < tokens.length - 1; i++) {
      const token = tokens[i];
      
      if (Array.isArray(current)) {
        const index = parseInt(token, 10);
        if (isNaN(index)) {
          throw new Error(`Invalid array index: ${token}`);
        }
        // Ensure array is large enough
        while (current.length <= index) {
          current.push(null);
        }
        if (current[index] === null || current[index] === undefined) {
          // Determine if next token is array index or object key
          const nextToken = tokens[i + 1];
          current[index] = isNaN(parseInt(nextToken, 10)) ? {} : [];
        }
        current = current[index];
      } else {
        if (current[token] === null || current[token] === undefined) {
          // Determine if next token is array index or object key
          const nextToken = tokens[i + 1];
          current[token] = isNaN(parseInt(nextToken, 10)) ? {} : [];
        }
        current = current[token];
      }
    }
    
    const lastToken = tokens[tokens.length - 1];
    if (Array.isArray(current)) {
      const index = parseInt(lastToken, 10);
      if (isNaN(index)) {
        throw new Error(`Invalid array index: ${lastToken}`);
      }
      current[index] = value;
    } else {
      current[lastToken] = value;
    }
    
    return result;
  }

  static remove(obj: any, pointer: string): any {
    if (pointer === '') {
      return null;
    }
    
    const tokens = JSONPointer.parse(pointer);
    const result = JSONPointer.deepClone(obj);
    let current = result;
    
    for (let i = 0; i < tokens.length - 1; i++) {
      const token = tokens[i];
      
      if (Array.isArray(current)) {
        const index = parseInt(token, 10);
        current = current[index];
      } else {
        current = current[token];
      }
      
      if (current === null || current === undefined) {
        return result; // Path doesn't exist, nothing to remove
      }
    }
    
    const lastToken = tokens[tokens.length - 1];
    if (Array.isArray(current)) {
      const index = parseInt(lastToken, 10);
      if (!isNaN(index) && index >= 0 && index < current.length) {
        current.splice(index, 1);
      }
    } else if (typeof current === 'object') {
      delete current[lastToken];
    }
    
    return result;
  }

  static deepClone(obj: any): any {
    if (obj === null || typeof obj !== 'object') {
      return obj;
    }
    if (obj instanceof Date) {
      return new Date(obj.getTime());
    }
    if (Array.isArray(obj)) {
      return obj.map(item => JSONPointer.deepClone(item));
    }
    const cloned: any = {};
    Object.keys(obj).forEach(key => {
      cloned[key] = JSONPointer.deepClone(obj[key]);
    });
    return cloned;
  }

  /**
   * Check if a path matches a pattern (supports * wildcards)
   */
  static matchesPattern(path: string, pattern: string): boolean {
    if (pattern === path) return true;
    
    // Convert glob pattern to regex
    const regexPattern = pattern
      .split('/')
      .map(segment => {
        if (segment === '*') {
          return '[^/]*';
        }
        if (segment === '**') {
          return '.*';
        }
        // Escape special regex characters
        return segment.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      })
      .join('/');
    
    const regex = new RegExp(`^${regexPattern}$`);
    return regex.test(path);
  }
}

/**
 * Redact evidence data according to specified rules
 * 
 * @param input - Data to redact (will be deep cloned for immutability)
 * @param rules - Redaction rules to apply
 * @returns RedactionResult with redacted data and metadata
 */
export function redactEvidence<T>(input: T, rules: RedactRule[]): RedactionResult<T> {
  if (!input || typeof input !== 'object') {
    return {
      data: input,
      redactedCount: 0,
      redactedPaths: [],
      originalSize: JSON.stringify(input).length,
      redactedSize: JSON.stringify(input).length,
    };
  }

  const originalSize = JSON.stringify(input).length;
  let result = JSONPointer.deepClone(input);
  const redactedPaths: string[] = [];
  let redactedCount = 0;

  // Collect all paths in the object
  const allPaths = collectAllPaths(result);

  for (const rule of rules) {
    const matchingPaths = allPaths.filter(path => 
      JSONPointer.matchesPattern(path, rule.path)
    );

    for (const path of matchingPaths) {
      const currentValue = JSONPointer.get(result, path);
      
      if (currentValue !== undefined) {
        let newValue: any;
        
        switch (rule.strategy) {
          case 'remove':
            result = JSONPointer.remove(result, path);
            break;
            
          case 'pattern':
            if (rule.pattern && rule.replacement !== undefined) {
              if (typeof currentValue === 'string') {
                const regex = new RegExp(rule.pattern, 'g');
                newValue = currentValue.replace(regex, rule.replacement);
                result = JSONPointer.set(result, path, newValue);
              } else {
                // For non-string values, convert to string, apply pattern, then back
                const strValue = String(currentValue);
                const regex = new RegExp(rule.pattern, 'g');
                newValue = strValue.replace(regex, rule.replacement);
                result = JSONPointer.set(result, path, newValue);
              }
            }
            break;
            
          case 'mask':
          default:
            // Mask based on data type
            if (typeof currentValue === 'string') {
              newValue = currentValue.length > 0 ? '***REDACTED***' : '';
            } else if (typeof currentValue === 'number') {
              newValue = 0;
            } else if (typeof currentValue === 'boolean') {
              newValue = false;
            } else if (Array.isArray(currentValue)) {
              newValue = [];
            } else if (typeof currentValue === 'object' && currentValue !== null) {
              newValue = {};
            } else {
              newValue = null;
            }
            result = JSONPointer.set(result, path, newValue);
            break;
        }
        
        redactedPaths.push(path);
        redactedCount++;
      }
    }
  }

  const redactedSize = JSON.stringify(result).length;

  return {
    data: result,
    redactedCount,
    redactedPaths,
    originalSize,
    redactedSize,
  };
}

/**
 * Collect all JSON Pointer paths in an object
 */
function collectAllPaths(obj: any, currentPath: string = ''): string[] {
  const paths: string[] = [];
  
  if (obj === null || typeof obj !== 'object') {
    return currentPath ? [currentPath] : [];
  }
  
  if (Array.isArray(obj)) {
    if (currentPath) paths.push(currentPath);
    obj.forEach((item, index) => {
      const itemPath = `${currentPath}/${index}`;
      paths.push(...collectAllPaths(item, itemPath));
    });
  } else {
    if (currentPath) paths.push(currentPath);
    Object.keys(obj).forEach(key => {
      const keyPath = currentPath ? `${currentPath}/${escapeJsonPointer(key)}` : `/${escapeJsonPointer(key)}`;
      paths.push(...collectAllPaths(obj[key], keyPath));
    });
  }
  
  return paths;
}

/**
 * Escape special characters for JSON Pointer
 */
function escapeJsonPointer(str: string): string {
  return str.replace(/~/g, '~0').replace(/\//g, '~1');
}

/**
 * Load redaction rules from configuration
 */
export function loadRedactionRules(config: string[] | RedactRule[]): RedactRule[] {
  if (!Array.isArray(config)) {
    throw new Error('Redaction config must be an array');
  }
  
  return config.map((item, index) => {
    if (typeof item === 'string') {
      // Simple path string, use default mask strategy
      return {
        path: item,
        strategy: 'mask' as const,
        description: `Auto-generated rule ${index + 1}`,
      };
    } else if (typeof item === 'object' && item !== null) {
      // Full rule object
      const rule = item as RedactRule;
      if (!rule.path) {
        throw new Error(`Redaction rule at index ${index} missing required 'path' property`);
      }
      if (!['mask', 'remove', 'pattern'].includes(rule.strategy)) {
        throw new Error(`Invalid strategy '${rule.strategy}' at index ${index}`);
      }
      if (rule.strategy === 'pattern' && (!rule.pattern || rule.replacement === undefined)) {
        throw new Error(`Pattern strategy at index ${index} requires 'pattern' and 'replacement' properties`);
      }
      return rule;
    } else {
      throw new Error(`Invalid redaction rule at index ${index}: must be string or object`);
    }
  });
}