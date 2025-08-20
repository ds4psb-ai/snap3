'use client';

import { useState, useEffect, useRef } from 'react';
import { AlertTriangle, Info, CheckCircle, XCircle } from 'lucide-react';

interface LogEntry {
  timestamp: string;
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
  correlationId?: string;
  metadata?: Record<string, any>;
}

export default function LogStream() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const getLevelIcon = (level: string) => {
    switch (level) {
      case 'error': return <XCircle className="w-3 h-3 text-red-400" />;
      case 'warn': return <AlertTriangle className="w-3 h-3 text-yellow-400" />;
      case 'info': return <Info className="w-3 h-3 text-blue-400" />;
      case 'debug': return <CheckCircle className="w-3 h-3 text-green-400" />;
      default: return <Info className="w-3 h-3 text-gray-400" />;
    }
  };

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'error': return 'text-red-400';
      case 'warn': return 'text-yellow-400';
      case 'info': return 'text-blue-400';
      case 'debug': return 'text-green-400';
      default: return 'text-gray-400';
    }
  };

  const formatTimestamp = (timestamp: string) => {
    try {
      return new Date(timestamp).toLocaleTimeString();
    } catch {
      return timestamp;
    }
  };

  useEffect(() => {
    const connectToLogStream = () => {
      try {
        setError(null);
        
        // T4 로그 스트림(8083) SSE 연동
        const eventSource = new EventSource('http://localhost:8083/logs/stream');
        eventSourceRef.current = eventSource;

        eventSource.onopen = () => {
          setConnected(true);
          console.log('Log stream connected');
        };

        eventSource.onmessage = (event) => {
          try {
            const logEntry: LogEntry = JSON.parse(event.data);
            
            setLogs(prev => {
              const newLogs = [logEntry, ...prev].slice(0, 50); // 최근 50개만 유지
              return newLogs;
            });
          } catch (parseError) {
            console.error('Failed to parse log entry:', parseError);
          }
        };

        eventSource.onerror = (error) => {
          console.error('Log stream error:', error);
          setConnected(false);
          setError('로그 스트림 연결 오류');
          
          // 재연결 시도
          setTimeout(() => {
            if (eventSourceRef.current) {
              eventSourceRef.current.close();
              connectToLogStream();
            }
          }, 5000);
        };

      } catch (err) {
        console.error('Failed to connect to log stream:', err);
        setError('로그 스트림 연결 실패');
        setConnected(false);
      }
    };

    connectToLogStream();

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, []);

  // 자동 스크롤
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = 0;
    }
  }, [logs]);

  // 샘플 로그 데이터 (연결 실패 시)
  const sampleLogs: LogEntry[] = [
    {
      timestamp: new Date().toISOString(),
      level: 'info',
      message: 'VDP 처리 파이프라인 시작',
      correlationId: 'sample-001'
    },
    {
      timestamp: new Date(Date.now() - 1000).toISOString(),
      level: 'debug',
      message: 'YouTube URL 검증 완료',
      correlationId: 'sample-001'
    },
    {
      timestamp: new Date(Date.now() - 2000).toISOString(),
      level: 'warn',
      message: '메타데이터 추출 지연 (2초)',
      correlationId: 'sample-001'
    },
    {
      timestamp: new Date(Date.now() - 3000).toISOString(),
      level: 'error',
      message: 'Instagram API 호출 실패',
      correlationId: 'sample-002'
    }
  ];

  const displayLogs = connected ? logs : sampleLogs;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">실시간 시스템 로그</h3>
        <div className="flex items-center space-x-2">
          <div className={`w-2 h-2 rounded-full ${connected ? 'bg-green-500' : 'bg-red-500'}`} />
          <span className="text-sm text-gray-500">
            {connected ? '연결됨' : '연결 안됨'}
          </span>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="w-4 h-4 text-red-600" />
            <span className="text-red-800 text-sm">{error}</span>
          </div>
        </div>
      )}

      <div 
        ref={containerRef}
        className="h-64 overflow-y-auto bg-black text-green-400 p-4 font-mono text-sm rounded-lg border border-gray-300"
      >
        {displayLogs.length === 0 ? (
          <div className="text-gray-500 text-center py-8">
            로그가 없습니다...
          </div>
        ) : (
          displayLogs.map((log, i) => (
            <div key={i} className="mb-1 flex items-start space-x-2">
              <div className="flex-shrink-0 mt-0.5">
                {getLevelIcon(log.level)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-2">
                  <span className="text-gray-500 text-xs">
                    {formatTimestamp(log.timestamp)}
                  </span>
                  {log.correlationId && (
                    <span className="text-gray-600 text-xs">
                      [{log.correlationId}]
                    </span>
                  )}
                </div>
                <div className={`${getLevelColor(log.level)} break-words`}>
                  {log.message}
                </div>
                {log.metadata && Object.keys(log.metadata).length > 0 && (
                  <div className="text-gray-600 text-xs mt-1">
                    {JSON.stringify(log.metadata)}
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {!connected && (
        <div className="text-xs text-gray-500 text-center">
          샘플 로그를 표시하고 있습니다. T4 로그 스트림 서버(8083)에 연결하면 실시간 로그를 확인할 수 있습니다.
        </div>
      )}
    </div>
  );
}
