import { NextRequest, NextResponse } from 'next/server';

interface GCSEvent {
  eventType: string;
  eventTime: string;
  bucketId: string;
  objectId: string;
  objectGeneration: string;
  objectMetaGeneration: string;
  contentType: string;
  size: string;
}

interface GCSNotification {
  message: {
    data: string;
    messageId: string;
    publishTime: string;
  };
}

/**
 * GCS Upload Webhook - T1→T2 Event Trigger
 * Called when CSV files are uploaded to tough-variety-raw bucket
 */
export async function POST(request: NextRequest) {
  try {
    const notification: GCSNotification = await request.json();
    
    // Decode the base64 message data
    const messageData = Buffer.from(notification.message.data, 'base64').toString();
    const event: GCSEvent = JSON.parse(messageData);
    
    console.log('GCS Upload Event:', {
      eventType: event.eventType,
      bucket: event.bucketId,
      object: event.objectId,
      contentType: event.contentType,
      size: event.size
    });
    
    // Only process finalize events for CSV files in the raw bucket
    if (
      event.eventType !== 'google.storage.object.finalize' ||
      event.bucketId !== 'tough-variety-raw' ||
      !event.objectId.endsWith('.csv')
    ) {
      return NextResponse.json({ 
        status: 'ignored', 
        reason: 'Not a CSV finalize event in raw bucket' 
      });
    }
    
    // Extract CSV data from GCS
    const csvData = await downloadCSVFromGCS(event.bucketId, event.objectId);
    const links = parseCSVLinks(csvData);
    
    console.log(`Processing ${links.length} links from ${event.objectId}`);
    
    // Trigger T2: Google AI Studio Builder processing
    const t2JobId = await triggerT2Processing({
      sourceFile: event.objectId,
      links: links,
      uploadTime: event.eventTime,
      fileSize: parseInt(event.size)
    });
    
    return NextResponse.json({
      status: 'triggered',
      sourceFile: event.objectId,
      linkCount: links.length,
      t2JobId: t2JobId,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('GCS Webhook Error:', error);
    
    return NextResponse.json(
      {
        type: 'https://api.snap3.example/problems/webhook-processing-failed',
        title: 'Webhook processing failed',
        status: 500,
        detail: error instanceof Error ? error.message : 'Unknown webhook error',
        instance: '/api/curator/webhook/gcs-upload',
        code: 'WEBHOOK_PROCESSING_FAILED',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
// TODO: Set headers using res.headers.set() pattern;
  }
}

async function downloadCSVFromGCS(bucketId: string, objectId: string): Promise<string> {
  // TODO: Implement GCS download using Google Cloud Storage client
  // For now, return mock CSV data for development
  console.log(`Mock: Downloading ${objectId} from ${bucketId}`);
  
  return `url,title,platform
https://www.tiktok.com/@user1/video/123456789,재미있는 댄스 영상,tiktok
https://www.instagram.com/reel/ABC123456,맛있는 요리 레시피,instagram
https://www.youtube.com/shorts/XYZ789012,운동 루틴 공유,youtube`;
}

function parseCSVLinks(csvData: string): Array<{url: string, title?: string, platform?: string}> {
  const lines = csvData.split('\n').filter(line => line.trim());
  if (lines.length < 2) return [];
  
  const headers = lines[0].toLowerCase().split(',');
  const urlIndex = headers.findIndex(h => h.includes('url'));
  const titleIndex = headers.findIndex(h => h.includes('title'));
  const platformIndex = headers.findIndex(h => h.includes('platform'));
  
  if (urlIndex === -1) return [];
  
  return lines.slice(1).map(line => {
    const values = line.split(',');
    const result: any = { url: values[urlIndex]?.trim() };
    
    if (titleIndex >= 0 && values[titleIndex]) {
      result.title = values[titleIndex].trim();
    }
    if (platformIndex >= 0 && values[platformIndex]) {
      result.platform = values[platformIndex].trim();
    }
    
    return result;
  }).filter(item => item.url);
}

async function triggerT2Processing(data: {
  sourceFile: string;
  links: Array<{url: string, title?: string, platform?: string}>;
  uploadTime: string;
  fileSize: number;
}): Promise<string> {
  try {
    // Call T2 processing endpoint
    const t2Response = await fetch(`${process.env.NEXT_PUBLIC_JOBS_API_BASE}/api/t2/process`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.T2_API_KEY || 'dev-token'}`
      },
      body: JSON.stringify({
        source: {
          file: data.sourceFile,
          bucket: 'tough-variety-raw',
          uploadTime: data.uploadTime,
          fileSize: data.fileSize
        },
        links: data.links,
        config: {
          model: 'gemini-2.0-flash-exp',
          outputFormat: 'structured',
          batchSize: Math.min(data.links.length, 5), // Process in batches of 5
          goldBucket: 'tough-variety-gold',
          goldFormat: 'jsonl'
        }
      })
    });
    
    if (!t2Response.ok) {
      throw new Error(`T2 API Error: ${t2Response.status} ${t2Response.statusText}`);
    }
    
    const result = await t2Response.json();
    return result.jobId || `t2-${Date.now()}`;
    
  } catch (error) {
    console.error('T2 Trigger Error:', error);
    // Return fallback job ID for development
    return `t2-fallback-${Date.now()}`;
  }
}