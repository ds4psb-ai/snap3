'use client';

import { useState, useCallback, useEffect, useRef } from 'react';

interface CropProxyProps {
  onPositionChange: (position: { x: number; y: number }) => void;
  initialPosition?: { x: number; y: number };
}

export function CropProxy({ onPositionChange, initialPosition = { x: 34.68, y: 0 } }: CropProxyProps) {
  const [position, setPosition] = useState(initialPosition);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Accurate 9:16 width calculation within 16:9 container
  // Width = (9/16) / (16/9) = 81/256 ≈ 31.640625%
  const OVERLAY_WIDTH_PCT = (9 / 16) / (16 / 9) * 100; // 31.640625
  const OVERLAY_HEIGHT_PCT = 100;
  const MAX_X = 100 - OVERLAY_WIDTH_PCT;
  
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);
  
  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging || !containerRef.current) return;
    
    const rect = containerRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100 - OVERLAY_WIDTH_PCT / 2;
    const newX = Math.max(0, Math.min(MAX_X, x));
    
    const newPosition = { x: newX, y: 0 };
    setPosition(newPosition);
    onPositionChange(newPosition);
  }, [isDragging, onPositionChange, MAX_X, OVERLAY_WIDTH_PCT]);
  
  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);
  
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    const step = 1;
    let newX = position.x;
    
    switch (e.key) {
      case 'ArrowLeft':
        newX = Math.max(0, position.x - step);
        break;
      case 'ArrowRight':
        newX = Math.min(MAX_X, position.x + step);
        break;
      default:
        return;
    }
    
    const newPosition = { x: newX, y: position.y };
    setPosition(newPosition);
    onPositionChange(newPosition);
  }, [position, onPositionChange, MAX_X]);
  
  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);
  
  return (
    <div 
      ref={containerRef}
      className="absolute inset-0 pointer-events-none"
      aria-label="9:16 crop overlay for vertical format"
    >
      {/* Darkened areas outside crop */}
      <div className="absolute inset-0">
        <div 
          className="absolute top-0 left-0 h-full bg-black/60"
          style={{ width: `${position.x}%` }}
        />
        <div 
          className="absolute top-0 right-0 h-full bg-black/60"
          style={{ width: `${100 - position.x - OVERLAY_WIDTH_PCT}%` }}
        />
      </div>
      
      {/* Crop frame */}
      <div
        className="absolute top-0 h-full border-2 border-white bg-transparent pointer-events-auto cursor-move focus:outline-none focus:ring-2 focus:ring-blue-500"
        style={{
          left: `${position.x}%`,
          width: `${OVERLAY_WIDTH_PCT}%`,
          height: `${OVERLAY_HEIGHT_PCT}%`,
        }}
        onMouseDown={handleMouseDown}
        onKeyDown={handleKeyDown}
        tabIndex={0}
        role="slider"
        aria-label="Adjust 9:16 crop position"
        aria-valuenow={Math.round(position.x)}
        aria-valuemin={0}
        aria-valuemax={Math.round(MAX_X)}
      >
        {/* Center guides */}
        <div className="absolute inset-x-0 top-1/2 h-px bg-white/30" />
        <div className="absolute inset-y-0 left-1/2 w-px bg-white/30" />
        
        {/* Corner handles */}
        <div className="absolute -top-1 -left-1 w-3 h-3 bg-white rounded-full" />
        <div className="absolute -top-1 -right-1 w-3 h-3 bg-white rounded-full" />
        <div className="absolute -bottom-1 -left-1 w-3 h-3 bg-white rounded-full" />
        <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-white rounded-full" />
        
        {/* Label */}
        <div className="absolute top-2 left-2 bg-black/75 px-2 py-1 rounded text-white text-xs">
          9:16
        </div>
      </div>
    </div>
  );
}