import { NextRequest, NextResponse } from 'next/server';
import { evaluateQA } from '@/lib/qa/validator';
import { QAInputSchema } from '@/lib/schemas/qa.zod';
import { Problems } from '@/lib/errors/problem';

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
    
    // Evaluate QA rules
    const report = evaluateQA(validation.data);
    
    // If there are issues, return 422 with Problem+JSON
    if (!report.pass) {
      const violations = report.issues.map(issue => ({
        field: issue.field || '',
        message: issue.message,
        code: issue.code || issue.id,
      }));
      
      return Problems.qaViolation(violations, request.url);
    }
    
    // Success - return QA report
    return NextResponse.json(report, { status: 200 });
    
  } catch (error) {
    // Generic error handling
    return Problems.validation(
      [{ field: 'request', message: 'Invalid request format' }],
      request.url
    );
  }
}

export async function GET() {
  return NextResponse.json(
    { error: 'Method not allowed' },
    { status: 405 }
  );
}




