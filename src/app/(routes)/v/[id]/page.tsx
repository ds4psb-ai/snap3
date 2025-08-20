import { PreviewPlayer } from '@/components/PreviewPlayer';
import { Problem } from '@/lib/errors/problem';

interface PreviewData {
  id: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  result?: {
    videoUrl: string;
    duration: number;
    aspectRatio: string;
    quality: string;
  };
  metadata?: {
    synthIdDetected?: boolean;
  };
  error?: Problem;
}

async function getPreviewData(id: string): Promise<PreviewData | null> {
  try {
    // In real app, this would fetch from API
    // For testing, we'll mock the response
    const mockData: PreviewData = {
      id,
      status: 'completed',
      result: {
        videoUrl: `https://example.com/preview/${id}.mp4`,
        duration: 8,
        aspectRatio: '16:9',
        quality: '720p',
      },
      metadata: {
        synthIdDetected: false,
      },
    };
    
    return mockData;
  } catch (error) {
    return null;
  }
}

export default async function PreviewPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  const data = await getPreviewData(resolvedParams.id);
  
  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="text-white text-xl">Preview not found</div>
      </div>
    );
  }
  
  if (data.status === 'failed' && data.error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <PreviewPlayer
          src=""
          problem={data.error}
        />
      </div>
    );
  }
  
  if (data.status === 'queued' || data.status === 'processing') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="text-white text-xl">
          {data.status === 'queued' ? '⏳ Queued...' : '🔄 Processing...'}
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gray-900 p-4">
      <div className="max-w-6xl mx-auto">
        <PreviewPlayer
          src={data.result?.videoUrl || ''}
          target="vertical"
          qualities={['720p', '1080p']}
          defaultQuality="720p"
          synthIdDetected={data.metadata?.synthIdDetected}
        />
      </div>
    </div>
  );
}






