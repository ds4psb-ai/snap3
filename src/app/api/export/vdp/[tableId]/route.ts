import { NextRequest, NextResponse } from 'next/server';

interface ExportParams {
  tableId: string;
}

interface ExportQuery {
  format?: 'json' | 'csv' | 'jsonl';
  includeMetadata?: boolean;
  compression?: 'gzip' | 'none';
  fields?: string;
}

/**
 * VDP Export API - Export processed VDP data in multiple formats
 */
export async function GET(
  request: NextRequest,
  { params }: { params: ExportParams }
) {
  try {
    const { tableId } = params;
    const { searchParams } = new URL(request.url);
    
    const query: ExportQuery = {
      format: (searchParams.get('format') as any) || 'json',
      includeMetadata: searchParams.get('includeMetadata') === 'true',
      compression: (searchParams.get('compression') as any) || 'none',
      fields: searchParams.get('fields') || undefined
    };
    
    console.log('VDP Export Request:', { tableId, query });
    
    // Validate table ID
    if (!tableId || !tableId.startsWith('vdp_shortform_')) {
      return NextResponse.json(
        {
          type: 'https://api.snap3.example/problems/invalid-table-id',
          title: 'Invalid table ID',
          status: 400,
          detail: 'Table ID must start with vdp_shortform_',
          instance: `/api/export/vdp/${tableId}`,
          code: 'INVALID_TABLE_ID'
        },
        { status: 400 }
      )
// TODO: Set headers using res.headers.set() pattern;
    }
    
    // Mock export data (based on sample-links.csv)
    const exportData = generateMockExportData(tableId, query);
    
    // Generate ETag for caching
    const etag = `"${Buffer.from(JSON.stringify(exportData)).toString('base64').slice(0, 16)}"`;
    
    // Check If-None-Match header for 304 response
    const ifNoneMatch = request.headers.get('if-none-match');
    if (ifNoneMatch === etag) {
      return new NextResponse(null, { 
        status: 304,
        headers: {
          'ETag': etag,
          'Cache-Control': 'private, max-age=3600'
        }
      });
    }
    
    // Format response based on requested format
    let responseBody: string;
    let contentType: string;
    let filename: string;
    
    switch (query.format) {
      case 'csv':
        responseBody = formatAsCSV(exportData.records);
        contentType = 'text/csv';
        filename = `${tableId}.csv`;
        break;
        
      case 'jsonl':
        responseBody = formatAsJSONL(exportData.records);
        contentType = 'application/x-ndjson';
        filename = `${tableId}.jsonl`;
        break;
        
      case 'json':
      default:
        responseBody = JSON.stringify(exportData, null, 2);
        contentType = 'application/json';
        filename = `${tableId}.json`;
        break;
    }
    
    const headers: Record<string, string> = {
      'Content-Type': contentType,
      'Content-Disposition': `attachment; filename="${filename}"`,
      'ETag': etag,
      'Cache-Control': 'private, max-age=3600',
      'X-Export-Table': tableId,
      'X-Export-Format': query.format || 'json',
      'X-Export-Count': exportData.meta.recordCount.toString(),
      'X-Export-Time': new Date().toISOString()
    };
    
    // Add compression if requested
    if (query.compression === 'gzip') {
      // TODO: Implement gzip compression
      headers['Content-Encoding'] = 'gzip';
    }
    
    return new NextResponse(responseBody, { headers });
    
  } catch (error) {
    console.error('VDP Export Error:', error);
    
    return NextResponse.json(
      {
        type: 'https://api.snap3.example/problems/vdp-export-failed',
        title: 'VDP export failed',
        status: 500,
        detail: error instanceof Error ? error.message : 'Unknown export error',
        instance: `/api/export/vdp/${params.tableId}`,
        code: 'VDP_EXPORT_FAILED'
      },
      { status: 500 }
    )
// TODO: Set headers using res.headers.set() pattern;
  }
}

function generateMockExportData(tableId: string, query: ExportQuery) {
  const mockRecords = [
    {
      digest_id: 'C123456',
      category: 'shortform',
      platform: 'tiktok',
      url: 'https://www.tiktok.com/@user1/video/123456789',
      title: '재미있는 댄스 영상',
      hook_sec: 2.3,
      tempo_bucket: 'fast',
      trust_score: 87,
      evidence_chips: ['verified_source', 'high_engagement', 'trend_aligned'],
      synth_id_detected: false,
      processed_time: new Date(Date.now() - 120000).toISOString(),
      source_file: 'sample-links.csv',
      overall_analysis: {
        emotional_arc: ['Curiosity', 'Engagement', 'Satisfaction'],
        audience_reaction: {
          overall_sentiment: 'Positive and Engaged',
          notable_comments: ['재미있어요!', '따라해봐야겠다', '음악이 좋네요'],
          common_reactions: ['likes', 'shares', 'saves']
        },
        confidence_score: 0.89
      }
    },
    {
      digest_id: 'C123457',
      category: 'shortform',
      platform: 'instagram',
      url: 'https://www.instagram.com/reel/ABC123456',
      title: '맛있는 요리 레시피',
      hook_sec: 1.8,
      tempo_bucket: 'medium',
      trust_score: 92,
      evidence_chips: ['verified_source', 'educational_content', 'high_quality'],
      synth_id_detected: false,
      processed_time: new Date(Date.now() - 120000).toISOString(),
      source_file: 'sample-links.csv',
      overall_analysis: {
        emotional_arc: ['Curiosity', 'Learning', 'Satisfaction'],
        audience_reaction: {
          overall_sentiment: 'Highly Positive and Inquisitive',
          notable_comments: ['레시피 감사해요!', '따라 만들어봤어요', '너무 맛있어요'],
          common_reactions: ['saves', 'shares', 'comments']
        },
        confidence_score: 0.94
      }
    },
    {
      digest_id: 'C123458',
      category: 'shortform',
      platform: 'youtube',
      url: 'https://www.youtube.com/shorts/XYZ789012',
      title: '운동 루틴 공유',
      hook_sec: 2.8,
      tempo_bucket: 'medium',
      trust_score: 79,
      evidence_chips: ['fitness_content', 'instructional', 'motivational'],
      synth_id_detected: true,
      processed_time: new Date(Date.now() - 120000).toISOString(),
      source_file: 'sample-links.csv',
      overall_analysis: {
        emotional_arc: ['Motivation', 'Action', 'Achievement'],
        audience_reaction: {
          overall_sentiment: 'Motivational and Encouraging',
          notable_comments: ['좋은 운동이네요', '매일 해봐야겠어요', '동기부여 됩니다'],
          common_reactions: ['likes', 'saves', 'follows']
        },
        confidence_score: 0.82
      }
    }
  ];
  
  // Filter fields if requested
  let filteredRecords = mockRecords;
  if (query.fields) {
    const requestedFields = query.fields.split(',').map(f => f.trim());
    filteredRecords = mockRecords.map(record => {
      const filtered: any = {};
      requestedFields.forEach(field => {
        if (field in record) {
          filtered[field] = (record as any)[field];
        }
      });
      return filtered;
    });
  }
  
  const response: any = {
    records: filteredRecords
  };
  
  if (query.includeMetadata) {
    response.meta = {
      tableId,
      recordCount: filteredRecords.length,
      exportTime: new Date().toISOString(),
      format: query.format || 'json',
      fields: query.fields ? query.fields.split(',') : 'all',
      source: {
        pipeline: 'T1→T2→T3',
        t1: 'CSV Upload to GCS',
        t2: 'Gemini 2.0 Flash Processing',
        t3: 'BigQuery Load & Export API'
      }
    };
  }
  
  return response;
}

function formatAsCSV(records: any[]): string {
  if (records.length === 0) return '';
  
  // Get all unique keys from all records
  const allKeys = new Set<string>();
  records.forEach(record => {
    Object.keys(record).forEach(key => {
      if (typeof record[key] !== 'object') {
        allKeys.add(key);
      }
    });
  });
  
  const headers = Array.from(allKeys);
  const csvLines = [headers.join(',')];
  
  records.forEach(record => {
    const values = headers.map(header => {
      const value = record[header];
      if (value === null || value === undefined) return '';
      if (typeof value === 'string' && value.includes(',')) {
        return `"${value.replace(/"/g, '""')}"`;
      }
      return String(value);
    });
    csvLines.push(values.join(','));
  });
  
  return csvLines.join('\n');
}

function formatAsJSONL(records: any[]): string {
  return records.map(record => JSON.stringify(record)).join('\n');
}