import { NextRequest, NextResponse } from 'next/server';
import { evaluateQA } from '@/lib/qa/validator';
import { QAInputSchema } from '@/lib/schemas/qa.zod';
import { ApiProblems as Problems } from '@/lib/errors/problem';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate input with Zod
    const validation = QAInputSchema.safeParse(body);
    
    if (!validation.success) {
      // Map Zod errors to Problem+JSON violations
      const violations = validation.error.issues.map(issue => ({
        field: issue.path.join('.'),
        message: issue.message,
        code: issue.code,
      }));
      
      return Problems.qaViolation(violations, request.url);
    }
    
    // Evaluate QA rules (validation.data has all required fields from schema)
    const report = evaluateQA(validation.data as Parameters<typeof evaluateQA>[0]);
    
    // Check if there are any MAJOR issues that should fail the QA
    const hasMajorIssues = report.issues.some(issue => issue.severity === 'MAJOR');
    
    // If there are MAJOR issues, return 422 with Problem+JSON
    if (hasMajorIssues) {
      const violations = report.issues.map(issue => ({
        field: issue.field || '',
        message: issue.message,
        code: issue.code || issue.id,
      }));
      
      return Problems.qaViolation(violations, request.url);
    }
    
    // Success - return QA report (may include INFO/WARN issues)
    return NextResponse.json(report, { status: 200 });
    
  } catch (error) {
    // Generic error handling
    return Problems.validation(
      [{ field: 'request', message: 'Invalid request format' }],
      request.url
    );
  }
}

export async function GET(request: NextRequest) {
  return Problems.methodNotAllowed('GET', ['POST'], request.url);
}










