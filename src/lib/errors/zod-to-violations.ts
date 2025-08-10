/**
 * Transform Zod validation errors to Problem Details violations format
 */

import type { ZodError } from 'zod';

export interface Violation {
  field: string;
  message: string;
  code?: string;
}

/**
 * Convert ZodError to violations array for Problem Details
 */
export function zodErrorToViolations(err: ZodError): Violation[] {
  return err.issues.map((issue) => ({
    field: issue.path.join('.') || 'root',
    message: issue.message,
    code: issue.code,
  }));
}