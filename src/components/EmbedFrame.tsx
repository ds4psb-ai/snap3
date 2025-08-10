/**
 * Secure iframe component for official YouTube and Vimeo embeds only
 * Implements comprehensive security measures and CSP compliance
 */

import React from 'react';

interface EmbedFrameProps {
  src: string;
  title?: string;
  className?: string;
  width?: number | string;
  height?: number | string;
  loading?: 'lazy' | 'eager';
}

// Official embed patterns - must match API validation
const ALLOWED_EMBED_PATTERNS = [
  /^https?:\/\/(?:www\.)?youtube\.com\/embed\/[A-Za-z0-9_-]+/,
  /^https?:\/\/player\.vimeo\.com\/video\/\d+/
];

function validateEmbedSrc(src: string): boolean {
  return ALLOWED_EMBED_PATTERNS.some(pattern => pattern.test(src));
}

export function EmbedFrame({ 
  src, 
  title = 'Embedded Video',
  className = '',
  width = '100%',
  height = 315,
  loading = 'lazy'
}: EmbedFrameProps) {
  // Security validation - only allow whitelisted domains
  if (!validateEmbedSrc(src)) {
    console.warn('EmbedFrame: Unauthorized embed source blocked:', src);
    return (
      <div 
        className={`embed-frame-error ${className}`}
        style={{ 
          width, 
          height,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#f3f4f6',
          border: '1px solid #e5e7eb',
          borderRadius: '8px',
          color: '#6b7280'
        }}
      >
        <div className="text-center">
          <p className="text-sm font-medium">Embed Blocked</p>
          <p className="text-xs mt-1">Only official YouTube and Vimeo embeds are allowed</p>
        </div>
      </div>
    );
  }

  return (
    <iframe
      src={src}
      title={title}
      width={width}
      height={height}
      className={`embed-frame ${className}`}
      loading={loading}
      
      // Security attributes
      referrerPolicy="no-referrer"
      sandbox="allow-scripts allow-same-origin allow-presentation allow-popups"
      
      // Media permissions - aligned with CSP policy
      allow="autoplay; fullscreen; picture-in-picture"
      
      // Accessibility and SEO
      frameBorder="0"
      allowFullScreen
    />
  );
}

/**
 * Higher-order component for additional validation and error boundary
 */
interface SecureEmbedProps extends EmbedFrameProps {
  fallback?: React.ReactNode;
}

export function SecureEmbed({ fallback, ...props }: SecureEmbedProps) {
  // Check if the embed source is invalid
  if (!validateEmbedSrc(props.src)) {
    if (fallback) {
      return <>{fallback}</>;
    }
    
    return (
      <div 
        className="embed-error-fallback"
        style={{
          width: props.width || '100%',
          height: props.height || 315,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#fef2f2',
          border: '1px solid #fecaca',
          borderRadius: '8px',
          color: '#dc2626'
        }}
      >
        <p className="text-sm">Unable to load embed</p>
      </div>
    );
  }
  
  try {
    return <EmbedFrame {...props} />;
  } catch (error) {
    console.error('SecureEmbed: Error rendering embed:', error);
    
    if (fallback) {
      return <>{fallback}</>;
    }
    
    return (
      <div 
        className="embed-error-fallback"
        style={{
          width: props.width || '100%',
          height: props.height || 315,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#fef2f2',
          border: '1px solid #fecaca',
          borderRadius: '8px',
          color: '#dc2626'
        }}
      >
        <p className="text-sm">Unable to load embed</p>
      </div>
    );
  }
}

// Export both components for flexibility
export default EmbedFrame;