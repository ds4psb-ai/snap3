'use client';

import { useState, useRef } from 'react';
import { CropProxy } from './CropProxy';
import { PreviewOverlay } from './PreviewOverlay';
import { Button } from '@/components/ui/button';
import { Problem } from '@/lib/errors/problem';

export interface PreviewPlayerProps {
  src: string;
  width?: number;
  height?: number;
  target?: 'vertical' | 'horizontal';
  qualities?: ('720p' | '1080p')[];
  defaultQuality?: '720p' | '1080p';
  synthIdDetected?: boolean;
  problem?: Problem | null;
}

export function PreviewPlayer({
  src,
  width,
  height,
  target = 'horizontal',
  qualities = ['720p', '1080p'],
  defaultQuality = '720p',
  synthIdDetected = false,
  problem,
}: PreviewPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [quality, setQuality] = useState(defaultQuality);
  const [cropPosition, setCropPosition] = useState({ x: 34.68, y: 0 });
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  
  if (problem) {
    return (
      <div className="bg-red-900/20 border border-red-500 rounded-lg p-6 text-white">
        <h3 className="text-lg font-semibold mb-2">Error: {problem.title}</h3>
        <p className="text-sm opacity-90">{problem.detail || problem.fix}</p>
        {problem.code && (
          <p className="text-xs mt-2 opacity-70">Code: {problem.code}</p>
        )}
      </div>
    );
  }
  
  return (
    <div className="relative">
      <div 
        className="relative bg-black rounded-lg overflow-hidden"
        style={{ width: width || '100%', maxWidth: '100%' }}
      >
        <div className="relative aspect-video">
          <video
            ref={videoRef}
            src={src}
            className="w-full h-full"
            muted
            autoPlay
            playsInline
            preload="metadata"
            controls
            onLoadedData={() => setStatus('ready')}
            onError={() => setStatus('error')}
            aria-label="Preview video player"
          />
          
          {target === 'vertical' && status === 'ready' && (
            <CropProxy
              onPositionChange={setCropPosition}
              initialPosition={cropPosition}
            />
          )}
          
          <PreviewOverlay
            status={status === 'loading' ? 'processing' : status === 'error' ? 'failed' : 'completed'}
            synthIdDetected={synthIdDetected}
          />
        </div>
      </div>
      
      {/* Quality selector */}
      {qualities.length > 1 && (
        <div className="mt-4 flex gap-2">
          {qualities.map((q) => (
            <Button
              key={q}
              variant={quality === q ? 'default' : 'outline'}
              size="sm"
              onClick={() => setQuality(q)}
              aria-pressed={quality === q}
            >
              {q}
            </Button>
          ))}
        </div>
      )}
      
      {/* Crop position display for vertical target */}
      {target === 'vertical' && (
        <div className="mt-4 p-3 bg-gray-800 rounded text-white text-sm">
          <p>9:16 Crop Position: X={cropPosition.x.toFixed(1)}%, Y={cropPosition.y.toFixed(1)}%</p>
        </div>
      )}
    </div>
  );
}