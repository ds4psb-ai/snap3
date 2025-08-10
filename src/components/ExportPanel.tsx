'use client';

import { useState } from 'react';

interface ExportPanelProps {
  exportId: string;
  initialData?: any;
}

export function ExportPanel({ exportId, initialData }: ExportPanelProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [streamData, setStreamData] = useState<string>('');
  
  // Download JSON export
  const handleDownloadJSON = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/export/json/${exportId}`);
      
      if (!response.ok) {
        const problem = await response.json();
        throw new Error(problem.detail || 'Failed to download export');
      }
      
      const data = await response.json();
      
      // Create download blob
      const blob = new Blob([JSON.stringify(data, null, 2)], { 
        type: 'application/json' 
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `export-${exportId}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      // Show success toast
      showToast('Export downloaded successfully', 'success');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Download failed');
      showToast(err instanceof Error ? err.message : 'Download failed', 'error');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Stream JSON export
  const handleStreamJSON = async () => {
    setIsLoading(true);
    setError(null);
    setStreamData('');
    
    try {
      const response = await fetch(`/api/export/brief/${exportId}?format=stream`);
      
      if (!response.ok) {
        const problem = await response.json();
        throw new Error(problem.detail || 'Failed to stream export');
      }
      
      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('Stream not available');
      }
      
      const decoder = new TextDecoder();
      let accumulated = '';
      
      while (true) {
        const { done, value } = await reader.read();
        
        if (done) break;
        
        const chunk = decoder.decode(value, { stream: true });
        accumulated += chunk;
        setStreamData(accumulated);
      }
      
      // Parse and validate final data
      try {
        const parsed = JSON.parse(accumulated);
        showToast('Stream completed successfully', 'success');
      } catch {
        throw new Error('Invalid JSON received from stream');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Stream failed');
      showToast(err instanceof Error ? err.message : 'Stream failed', 'error');
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <div className="space-y-4">
      {/* Action Buttons */}
      <div className="flex gap-3">
        <button
          onClick={handleDownloadJSON}
          disabled={isLoading}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          aria-label="Download JSON export"
        >
          {isLoading ? 'Loading...' : 'Download JSON'}
        </button>
        
        <button
          onClick={handleStreamJSON}
          disabled={isLoading}
          className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          aria-label="Stream JSON export"
        >
          {isLoading ? 'Streaming...' : 'Stream JSON'}
        </button>
      </div>
      
      {/* Error Display */}
      {error && (
        <div 
          role="alert"
          className="p-4 bg-red-50 border border-red-200 rounded-md text-red-800"
        >
          <p className="font-medium">Error</p>
          <p className="text-sm mt-1">{error}</p>
        </div>
      )}
      
      {/* Stream Data Display */}
      {streamData && (
        <div className="mt-4">
          <h3 className="text-sm font-medium text-gray-700 mb-2">
            Streamed Data:
          </h3>
          <pre className="p-3 bg-gray-50 border border-gray-200 rounded-md text-xs overflow-x-auto">
            {streamData}
          </pre>
        </div>
      )}
      
      {/* Evidence Chips Display */}
      {initialData?.evidencePack?.evidenceChips && (
        <div className="mt-6">
          <h3 className="text-sm font-medium text-gray-700 mb-2">
            Evidence Chips:
          </h3>
          <div className="flex flex-wrap gap-2">
            {initialData.evidencePack.evidenceChips.map((chip: string, index: number) => (
              <span
                key={index}
                className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm"
              >
                {chip}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Simple toast notification
function showToast(message: string, type: 'success' | 'error') {
  // Create toast element
  const toast = document.createElement('div');
  toast.className = `fixed bottom-4 right-4 px-6 py-3 rounded-md shadow-lg z-50 ${
    type === 'success' 
      ? 'bg-green-500 text-white' 
      : 'bg-red-500 text-white'
  }`;
  toast.textContent = message;
  toast.setAttribute('role', 'alert');
  
  // WCAG contrast compliance
  toast.style.minHeight = '48px';
  toast.style.fontSize = '16px';
  toast.style.fontWeight = '500';
  
  document.body.appendChild(toast);
  
  // Auto-remove after 3 seconds
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transition = 'opacity 0.3s';
    setTimeout(() => {
      document.body.removeChild(toast);
    }, 300);
  }, 3000);
}