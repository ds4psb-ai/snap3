import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createVDP } from '@/lib/db';
import { analyzeContent } from '@/lib/llm';
import { ApiProblems as Problems } from '@/lib/errors/problem';

const UploadSchema = z.object({
  fileName: z.string().min(1, 'File name is required'),
  fileUrl: z.string().url('Valid file URL is required'),
  fileType: z.string().min(1, 'File type is required'),
  fileSize: z.number().optional(),
  metadata: z.record(z.any()).optional(),
});

export async function POST(request: NextRequest) {
  const instance = '/api/input/upload';
  
  try {
    const body = await request.json();
    const validatedData = UploadSchema.parse(body);
    
    const { 
      fileName, 
      fileUrl, 
      fileType, 
      fileSize,
      metadata 
    } = validatedData;

    // TODO: Extract content from uploaded file
    // This would involve:
    // 1. Downloading the file from fileUrl
    // 2. Parsing content based on fileType (text, image, etc.)
    // 3. Extracting text or metadata

    const extractedContent = `Content extracted from ${fileName}`;
    
    // Analyze content using LLM
    const analysis = await analyzeContent(extractedContent);

    // Create VDP record
    const vdpData = {
      title: fileName,
      content: extractedContent,
      metadata: {
        ...metadata,
        fileName,
        fileUrl,
        fileType,
        fileSize,
        analysis: analysis,
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const vdp = await createVDP(vdpData);

    // TODO: Trigger trend analysis
    // TODO: Generate embeddings
    // TODO: Create relations

    return NextResponse.json({
      message: 'File uploaded and processed successfully',
      vdp: {
        id: vdp.id,
        title: vdp.title,
        analysis: analysis,
      },
      fileInfo: {
        fileName,
        fileUrl,
        fileType,
        fileSize,
      }
    });

  } catch (error) {
    console.error('Upload processing error:', error);
    
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
      message: 'Failed to process uploaded file',
      code: 'UPLOAD_ERROR',
    }], instance);
  }
}






