import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const checkSlugSchema = z.object({
  slug: z.string().min(3).max(50).regex(/^[a-z0-9-]+$/, 'Invalid slug format'),
});

// Mock database - in production, this would check against your actual database
const TAKEN_SLUGS = new Set([
  'admin',
  'api',
  'app',
  'www',
  'mail',
  'support',
  'help',
  'blog',
  'docs',
  'test',
  'demo',
  'sample',
  'example',
  'snap3',
  'outlier',
  'reserved',
]);

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const slug = searchParams.get('slug');

    if (!slug) {
      return NextResponse.json(
        {
          type: 'https://snap3.example/problems/validation-error',
          title: 'Validation Error',
          status: 400,
          detail: 'Slug parameter is required',
          instance: request.url,
        },
        { status: 400 }
      );
    }

    // Validate slug format
    const validation = checkSlugSchema.safeParse({ slug });
    if (!validation.success) {
      return NextResponse.json(
        {
          type: 'https://snap3.example/problems/validation-error',
          title: 'Validation Error',
          status: 400,
          detail: 'Invalid slug format',
          errors: validation.error.flatten().fieldErrors,
          instance: request.url,
        },
        { status: 400 }
      );
    }

    // Check if slug is available
    const isAvailable = !TAKEN_SLUGS.has(slug.toLowerCase());

    return NextResponse.json({
      slug,
      available: isAvailable,
      message: isAvailable 
        ? 'Organization name is available'
        : 'Organization name is already taken',
    });

  } catch (error) {
    console.error('Slug check error:', error);
    
    return NextResponse.json(
      {
        type: 'https://snap3.example/problems/internal-error',
        title: 'Internal Server Error',
        status: 500,
        detail: 'An internal error occurred while checking slug availability',
        instance: request.url,
      },
      { status: 500 }
    );
  }
}