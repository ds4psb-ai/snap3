'use client';

import { useState, useEffect } from 'react';
import { AlertCircle, CheckCircle, Activity, Zap, Shield, Code } from 'lucide-react';

interface UniversalSystemStatus {
  context: string;
  consensus_score: number;
  quality_gates: {
    slo: boolean;
    circuit_breaker: boolean;
    dora_metrics: boolean;
  };
  active_agents: string[];
  current_experiment: 'A' | 'B';
  recommendations: string[];
  last_updated: string;
}

export default function UniversalSystemStatus() {
  const [status, setStatus] = useState<UniversalSystemStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const response = await fetch('/api/universal/status');
        const data = await response.json();
        setStatus(data);
      } catch (error) {
        console.error('Universal status fetch error:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStatus();
    const interval = setInterval(fetchStatus, 5000); // 5초 간격 업데이트
    
    return () => clearInterval(interval);
  }, []);

  if (loading) return <div className="animate-pulse bg-gray-200 h-32 rounded-lg" />;

  if (!status) return null;

  const getConsensusColor = (score: number) => {
    if (score >= 0.8) return 'text-green-600 bg-green-50 border-green-200';
    if (score >= 0.6) return 'text-amber-600 bg-amber-50 border-amber-200';
    return 'text-red-600 bg-red-50 border-red-200';
  };

  const getContextIcon = (context: string) => {
    switch (context) {
      case 'frontend': return <Code className="w-4 h-4" />;
      case 'backend': return <Activity className="w-4 h-4" />;
      case 'security': return <Shield className="w-4 h-4" />;
      case 'performance': return <Zap className="w-4 h-4" />;
      default: return <Activity className="w-4 h-4" />;
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">범용 재귀개선 시스템</h3>
        <div className="flex items-center space-x-2">
          <Activity className="w-4 h-4 text-blue-600" />
          <span className="text-sm text-gray-600">실험 그룹: {status.current_experiment}</span>
        </div>
      </div>

      {/* 컨텍스트 표시 */}
      <div className="mb-4 flex items-center space-x-2">
        {getContextIcon(status.context)}
        <span className="text-sm font-medium text-gray-700 capitalize">{status.context}</span>
      </div>

      {/* 합의 점수 */}
      <div className={`mb-4 p-3 rounded-lg border ${getConsensusColor(status.consensus_score)}`}>
        <div className="flex items-center justify-between">
          <span className="font-medium">합의 점수</span>
          <span className="text-xl font-bold">{(status.consensus_score * 100).toFixed(0)}%</span>
        </div>
      </div>

      {/* 품질 게이트 상태 */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        {Object.entries(status.quality_gates).map(([gate, passed]) => (
          <div key={gate} className="flex items-center space-x-2">
            {passed ? (
              <CheckCircle className="w-4 h-4 text-green-600" />
            ) : (
              <AlertCircle className="w-4 h-4 text-red-600" />
            )}
            <span className="text-xs text-gray-700">{gate}</span>
          </div>
        ))}
      </div>

      {/* 활성 에이전트 */}
      <div className="mb-4">
        <span className="text-sm font-medium text-gray-700">활성 에이전트:</span>
        <div className="flex flex-wrap gap-1 mt-1">
          {status.active_agents.map((agent) => (
            <span key={agent} className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
              {agent}
            </span>
          ))}
        </div>
      </div>

      {/* 권장사항 */}
      {status.recommendations.length > 0 && (
        <div className="text-xs text-gray-600">
          <span className="font-medium">권장:</span>
          <ul className="mt-1 space-y-1">
            {status.recommendations.map((rec, idx) => (
              <li key={idx}>• {rec}</li>
            ))}
          </ul>
        </div>
      )}

      {/* 마지막 업데이트 */}
      <div className="mt-4 text-xs text-gray-500">
        마지막 업데이트: {new Date(status.last_updated).toLocaleTimeString()}
      </div>
    </div>
  );
}
