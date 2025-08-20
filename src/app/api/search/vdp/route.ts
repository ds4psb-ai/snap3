import { NextRequest, NextResponse } from 'next/server';

interface VDPSearchQuery {
  table?: string;
  platform?: 'tiktok' | 'instagram' | 'youtube';
  category?: string;
  minTrustScore?: number;
  maxHookSec?: number;
  hasProductMentions?: boolean;
  limit?: number;
  offset?: number;
  sortBy?: 'trust_score' | 'hook_sec' | 'processed_time';
  sortOrder?: 'asc' | 'desc';
}

interface VDPSearchResult {
  digestId: string;
  category: string;
  platform: string;
  url: string;
  title?: string;
  hookSec: number;
  tempoBucket: string;
  trustScore: number;
  evidenceChips: string[];
  synthIdDetected: boolean;
  processedTime: string;
  sourceFile: string;
  hasProductMentions: boolean;
  overallSentiment: string;
}

/**
 * VDP Search API - Query processed VDP data from BigQuery
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    const query: VDPSearchQuery = {
      table: searchParams.get('table') || undefined,
      platform: searchParams.get('platform') as any,
      category: searchParams.get('category') || undefined,
      minTrustScore: searchParams.get('minTrustScore') ? parseInt(searchParams.get('minTrustScore')!) : undefined,
      maxHookSec: searchParams.get('maxHookSec') ? parseFloat(searchParams.get('maxHookSec')!) : undefined,
      hasProductMentions: searchParams.get('hasProductMentions') === 'true',
      limit: Math.min(parseInt(searchParams.get('limit') || '20'), 100),
      offset: parseInt(searchParams.get('offset') || '0'),
      sortBy: (searchParams.get('sortBy') as any) || 'processed_time',
      sortOrder: (searchParams.get('sortOrder') as any) || 'desc'
    };
    
    console.log('VDP Search Query:', query);
    
    // Mock search results for development
    // TODO: Replace with actual BigQuery search
    const mockResults = generateMockSearchResults(query);
    
    return NextResponse.json({
      results: mockResults.results,
      pagination: {
        total: mockResults.total,
        limit: query.limit,
        offset: query.offset,
        hasMore: mockResults.total > (query.offset! + query.limit!)
      },
      filters: {
        platform: query.platform,
        category: query.category,
        minTrustScore: query.minTrustScore,
        maxHookSec: query.maxHookSec,
        hasProductMentions: query.hasProductMentions
      },
      meta: {
        table: query.table,
        searchTime: new Date().toISOString(),
        cached: false
      }
    });
    
  } catch (error) {
    console.error('VDP Search Error:', error);
    
    return NextResponse.json(
      {
        type: 'https://api.snap3.example/problems/vdp-search-failed',
        title: 'VDP search failed',
        status: 500,
        detail: error instanceof Error ? error.message : 'Unknown search error',
        instance: '/api/search/vdp',
        code: 'VDP_SEARCH_FAILED'
      },
      { status: 500 }
    )
// TODO: Set headers using res.headers.set() pattern;
  }
}

function generateMockSearchResults(query: VDPSearchQuery): {
  results: VDPSearchResult[];
  total: number;
} {
  // Generate mock VDP search results based on sample CSV
  const mockData: VDPSearchResult[] = [
    {
      digestId: 'C123456',
      category: 'shortform',
      platform: 'tiktok',
      url: 'https://www.tiktok.com/@user1/video/123456789',
      title: '재미있는 댄스 영상',
      hookSec: 2.3,
      tempoBucket: 'fast',
      trustScore: 87,
      evidenceChips: ['verified_source', 'high_engagement', 'trend_aligned'],
      synthIdDetected: false,
      processedTime: new Date(Date.now() - 120000).toISOString(),
      sourceFile: 'sample-links.csv',
      hasProductMentions: false,
      overallSentiment: 'Positive and Engaged'
    },
    {
      digestId: 'C123457',
      category: 'shortform',
      platform: 'instagram',
      url: 'https://www.instagram.com/reel/ABC123456',
      title: '맛있는 요리 레시피',
      hookSec: 1.8,
      tempoBucket: 'medium',
      trustScore: 92,
      evidenceChips: ['verified_source', 'educational_content', 'high_quality'],
      synthIdDetected: false,
      processedTime: new Date(Date.now() - 120000).toISOString(),
      sourceFile: 'sample-links.csv',
      hasProductMentions: true,
      overallSentiment: 'Highly Positive and Inquisitive'
    },
    {
      digestId: 'C123458',
      category: 'shortform',
      platform: 'youtube',
      url: 'https://www.youtube.com/shorts/XYZ789012',
      title: '운동 루틴 공유',
      hookSec: 2.8,
      tempoBucket: 'medium',
      trustScore: 79,
      evidenceChips: ['fitness_content', 'instructional', 'motivational'],
      synthIdDetected: true,
      processedTime: new Date(Date.now() - 120000).toISOString(),
      sourceFile: 'sample-links.csv',
      hasProductMentions: false,
      overallSentiment: 'Motivational and Encouraging'
    }
  ];
  
  // Apply filters
  let filteredResults = mockData;
  
  if (query.platform) {
    filteredResults = filteredResults.filter(r => r.platform === query.platform);
  }
  
  if (query.category) {
    filteredResults = filteredResults.filter(r => r.category === query.category);
  }
  
  if (query.minTrustScore) {
    filteredResults = filteredResults.filter(r => r.trustScore >= query.minTrustScore!);
  }
  
  if (query.maxHookSec) {
    filteredResults = filteredResults.filter(r => r.hookSec <= query.maxHookSec!);
  }
  
  if (query.hasProductMentions !== undefined) {
    filteredResults = filteredResults.filter(r => r.hasProductMentions === query.hasProductMentions);
  }
  
  // Apply sorting
  if (query.sortBy) {
    filteredResults.sort((a, b) => {
      let aVal: any, bVal: any;
      
      switch (query.sortBy) {
        case 'trust_score':
          aVal = a.trustScore;
          bVal = b.trustScore;
          break;
        case 'hook_sec':
          aVal = a.hookSec;
          bVal = b.hookSec;
          break;
        case 'processed_time':
          aVal = new Date(a.processedTime).getTime();
          bVal = new Date(b.processedTime).getTime();
          break;
        default:
          return 0;
      }
      
      if (query.sortOrder === 'desc') {
        return bVal - aVal;
      } else {
        return aVal - bVal;
      }
    });
  }
  
  // Apply pagination
  const total = filteredResults.length;
  const offset = query.offset || 0;
  const limit = query.limit || 20;
  const paginatedResults = filteredResults.slice(offset, offset + limit);
  
  return {
    results: paginatedResults,
    total
  };
}