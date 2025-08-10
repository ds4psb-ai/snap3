import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    
    // TODO: Implement brief export (VDP_FULL excluded)
    const brief = {
      id,
      title: 'Sample Brief',
      description: 'Sample brief description',
      category: 'Technology',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      // VDP_FULL fields are excluded
      evidence: [
        {
          id: 'ev-1',
          type: 'text',
          content: 'Sample evidence 1',
          confidence: 0.9,
        },
        {
          id: 'ev-2',
          type: 'url',
          content: 'https://example.com/evidence',
          confidence: 0.8,
        },
      ],
      // VDP_FULL fields are NOT included
    };
    
    return NextResponse.json(brief);
  } catch (error) {
    return NextResponse.json(
      { error: 'Brief not found' },
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

