import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    
    // TODO: Implement JSON export (VDP_FULL excluded)
    const jsonExport = {
      id,
      type: 'json',
      version: '1.0',
      timestamp: new Date().toISOString(),
      data: {
        vdp_min: {
          id,
          title: 'Sample VDP',
          description: 'Sample description',
          category: 'Technology',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          // VDP_FULL fields are excluded
        },
        evidence: [
          {
            id: 'ev-1',
            type: 'text',
            content: 'Sample evidence 1',
            confidence: 0.9,
            metadata: {
              source: 'manual',
              timestamp: new Date().toISOString(),
            },
          },
          {
            id: 'ev-2',
            type: 'url',
            content: 'https://example.com/evidence',
            confidence: 0.8,
            metadata: {
              source: 'web',
              timestamp: new Date().toISOString(),
            },
          },
        ],
        // VDP_FULL fields are NOT included
      },
    };
    
    return NextResponse.json(jsonExport);
  } catch (error) {
    return NextResponse.json(
      { error: 'Export not found' },
      { status: 404 }
    );
  }
}

export async function POST() {
  return NextResponse.json(
    { error: 'Method not allowed' },
    { status: 405 }
  );
}

