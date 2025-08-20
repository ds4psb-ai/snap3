import { NextRequest, NextResponse } from 'next/server';
import { Storage } from '@google-cloud/storage';
import { z } from 'zod';

const signedUrlSchema = z.object({
  fileName: z.string().min(1),
  fileType: z.string(),
  fileSize: z.number().positive(),
});

// Initialize Google Cloud Storage
const storage = new Storage({
  projectId: 'tough-variety-466003-c5',
  // Note: In production, use service account key or workload identity
  // For development, ensure GOOGLE_APPLICATION_CREDENTIALS is set
});

const RAW_BUCKET = 'tough-variety-raw';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate request body
    const validation = signedUrlSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        {
          type: 'https://snap3.example/problems/validation-error',
          title: 'Validation Error',
          status: 400,
          detail: 'Invalid signed URL request',
          errors: validation.error.flatten().fieldErrors,
          instance: request.url,
        },
        { status: 400 }
      );
    }

    const { fileName, fileType, fileSize } = validation.data;

    // Generate unique file path with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const randomId = Math.random().toString(36).substring(2, 15);
    const gcsPath = `uploads/${timestamp}-${randomId}-${fileName}`;

    // Get reference to the bucket
    const bucket = storage.bucket(RAW_BUCKET);
    const file = bucket.file(gcsPath);

    // Generate signed URL for upload (valid for 1 hour)
    const [uploadUrl] = await file.getSignedUrl({
      version: 'v4',
      action: 'write',
      expires: Date.now() + 60 * 60 * 1000, // 1 hour
      contentType: fileType,
      extensionHeaders: {
        'x-goog-content-length-range': `0,${fileSize}`,
      },
    });

    return NextResponse.json({
      uploadUrl,
      gcsPath,
      bucket: RAW_BUCKET,
      fileName,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    });

  } catch (error) {
    console.error('Signed URL generation error:', error);
    
    // Check if it's a Google Cloud Storage error
    if (error instanceof Error && error.message.includes('Could not load the default credentials')) {
      return NextResponse.json(
        {
          type: 'https://snap3.example/problems/auth-error',
          title: 'Authentication Error',
          status: 500,
          detail: 'Google Cloud Storage credentials not configured. Please set GOOGLE_APPLICATION_CREDENTIALS.',
          instance: request.url,
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        type: 'https://snap3.example/problems/internal-error',
        title: 'Internal Server Error',
        status: 500,
        detail: 'Failed to generate signed URL for file upload',
        instance: request.url,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}