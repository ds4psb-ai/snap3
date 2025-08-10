'use client';

import { Badge } from '@/components/ui/badge';

interface PreviewOverlayProps {
  status: 'queued' | 'processing' | 'completed' | 'failed';
  synthIdDetected?: boolean;
}

export function PreviewOverlay({ status, synthIdDetected }: PreviewOverlayProps) {
  return (
    <>
      {/* Status indicator */}
      {status !== 'completed' && (
        <div className="absolute top-4 right-4 pointer-events-none">
          <Badge 
            variant={status === 'failed' ? 'destructive' : 'secondary'}
            className="bg-black/75 text-white border-none"
            aria-live="polite"
          >
            {status === 'queued' && '⏳ Queued'}
            {status === 'processing' && '🔄 Processing'}
            {status === 'failed' && '❌ Failed'}
          </Badge>
        </div>
      )}
      
      {/* SynthID badge */}
      {synthIdDetected && (
        <div className="absolute bottom-4 right-4 pointer-events-none">
          <Badge 
            className="bg-blue-600/90 text-white border-none"
            aria-label="AI-generated content detected"
          >
            🤖 AI Generated • SynthID
          </Badge>
        </div>
      )}
    </>
  );
}