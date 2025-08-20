'use client';

import { useState, useEffect } from 'react';
import { RefreshCw, AlertCircle, CheckCircle } from 'lucide-react';

interface SummaryData {
  content: string;
  updated_at: string;
}

export default function SummaryDock() {
  const [summary, setSummary] = useState<SummaryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSummary = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/summary/latest');
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data: SummaryData = await response.json();
      setSummary(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch summary');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSummary();
    
    // 30초마다 자동 새로고침
    const interval = setInterval(fetchSummary, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="fixed top-0 left-0 w-full bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-blue-200 p-3 z-50 shadow-sm">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2">
            <h3 className="text-sm font-semibold text-blue-900">📋 프로젝트 현황</h3>
            {loading && <RefreshCw className="w-4 h-4 text-blue-600 animate-spin" />}
            {error && <AlertCircle className="w-4 h-4 text-red-500" />}
            {summary && !loading && !error && <CheckCircle className="w-4 h-4 text-green-500" />}
          </div>
          
          {summary && (
            <span className="text-xs text-gray-500">
              마지막 업데이트: {new Date(summary.updated_at).toLocaleTimeString()}
            </span>
          )}
        </div>
        
        <button
          onClick={fetchSummary}
          disabled={loading}
          className="text-xs px-2 py-1 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded transition-colors disabled:opacity-50"
        >
          새로고침
        </button>
      </div>
      
      <div className="max-w-7xl mx-auto mt-2">
        {loading && (
          <div className="text-sm text-blue-600">
            프로젝트 현황을 불러오는 중...
          </div>
        )}
        
        {error && (
          <div className="text-sm text-red-600 bg-red-50 p-2 rounded">
            <AlertCircle className="w-4 h-4 inline mr-1" />
            {error}
          </div>
        )}
        
        {summary && !loading && !error && (
          <div className="text-sm text-gray-700 bg-white p-3 rounded border border-blue-200 max-h-32 overflow-y-auto">
            <pre className="whitespace-pre-wrap font-mono text-xs">
              {summary.content}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}
