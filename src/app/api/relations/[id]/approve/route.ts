import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { Problems } from '@/lib/errors/problem';

const ApprovalSchema = z.object({
  approved: z.boolean({ required_error: 'Approved field is required', invalid_type_error: 'Approved must be a boolean value' }),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const instance = `/api/relations/${params.id}/approve`;
  
  try {
    const { id } = await params;
    const body = await request.json();
    const validatedData = ApprovalSchema.parse(body);
    
    // TODO: Implement relation approval logic
    return NextResponse.json({ 
      message: 'Relation approval updated',
      id,
      approved: validatedData.approved
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      const violations = error.errors.map(err => ({
        field: err.path.join('.'),
        message: err.message,
        code: 'VALIDATION_ERROR',
      }));
      return Problems.validation(violations, instance);
    }
    
    return Problems.validation([{
      field: 'request',
      message: 'Failed to update relation approval',
      code: 'APPROVAL_ERROR',
    }], instance);
  }
}





