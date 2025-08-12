import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const completeOnboardingSchema = z.object({
  organization: z.object({
    name: z.string().min(1, 'Organization name is required').max(100),
    slug: z.string().min(3).max(50).regex(/^[a-z0-9-]+$/, 'Invalid slug format'),
    industry: z.string().optional(),
  }),
  team: z.object({
    size: z.string().optional(),
    roles: z.array(z.string()).optional(),
  }).optional(),
  preferences: z.object({
    notifications: z.boolean().optional(),
    analytics: z.boolean().optional(),
  }).optional(),
  integrations: z.object({
    selected: z.array(z.string()).optional(),
  }).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate request body
    const validation = completeOnboardingSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        {
          type: 'https://snap3.example/problems/validation-error',
          title: 'Validation Error',
          status: 400,
          detail: 'Invalid onboarding data',
          errors: validation.error.flatten().fieldErrors,
          instance: request.url,
        },
        { status: 400 }
      );
    }

    const onboardingData = validation.data;

    // In production, you would:
    // 1. Create the organization in the database
    // 2. Set up user permissions
    // 3. Initialize default settings
    // 4. Send welcome emails
    // 5. Set up analytics tracking

    console.log('Creating organization:', onboardingData.organization);
    
    // Mock organization creation
    const organizationId = `org_${Date.now()}`;
    
    // Simulate processing time
    await new Promise(resolve => setTimeout(resolve, 1000));

    return NextResponse.json({
      success: true,
      organization: {
        id: organizationId,
        ...onboardingData.organization,
        createdAt: new Date().toISOString(),
      },
      redirectUrl: `/dashboard?org=${onboardingData.organization.slug}`,
      message: 'Organization created successfully! Welcome to Snap3.',
    });

  } catch (error) {
    console.error('Onboarding completion error:', error);
    
    return NextResponse.json(
      {
        type: 'https://snap3.example/problems/internal-error',
        title: 'Internal Server Error',
        status: 500,
        detail: 'An internal error occurred while completing onboarding',
        instance: request.url,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}